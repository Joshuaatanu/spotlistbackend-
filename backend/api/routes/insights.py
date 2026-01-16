"""
AI Insights endpoint using OpenAI with resilience patterns.

Features:
- Retry with exponential backoff (2s, 4s, 8s)
- Circuit breaker (opens after 5 failures, recovers after 60s)
"""

import json
import logging
import time
from typing import Any
from fastapi import APIRouter, HTTPException

from api.models.requests import InsightRequest
from api.dependencies import OPENAI_AVAILABLE, openai, OPENAI_API_KEY

logger = logging.getLogger(__name__)

router = APIRouter(tags=["AI Insights"])

# Retry configuration
MAX_RETRIES = 3
RETRY_BASE_DELAY = 2  # seconds

# Circuit breaker state (simple implementation)
_circuit_state = {
    "failures": 0,
    "last_failure_time": 0,
    "is_open": False,
}
CIRCUIT_FAILURE_THRESHOLD = 5
CIRCUIT_RECOVERY_TIMEOUT = 60  # seconds


def _check_circuit_breaker():
    """Check if circuit breaker allows the request."""
    if _circuit_state["is_open"]:
        time_since_failure = time.time() - _circuit_state["last_failure_time"]
        if time_since_failure >= CIRCUIT_RECOVERY_TIMEOUT:
            # Allow one request to test recovery
            logger.info("OpenAI circuit breaker: attempting recovery")
            return True
        raise HTTPException(
            status_code=503,
            detail="OpenAI service temporarily unavailable (circuit breaker open). Please try again later."
        )
    return True


def _record_success():
    """Record a successful request, reset circuit breaker."""
    _circuit_state["failures"] = 0
    _circuit_state["is_open"] = False


def _record_failure():
    """Record a failed request, potentially open circuit breaker."""
    _circuit_state["failures"] += 1
    _circuit_state["last_failure_time"] = time.time()

    if _circuit_state["failures"] >= CIRCUIT_FAILURE_THRESHOLD:
        _circuit_state["is_open"] = True
        logger.warning(f"OpenAI circuit breaker OPEN after {_circuit_state['failures']} failures")


def _call_openai_with_retry(client, messages, max_tokens=500, model="gpt-4o-mini"):
    """
    Call OpenAI API with retry logic and circuit breaker.

    Args:
        client: OpenAI client instance
        messages: Chat messages
        max_tokens: Maximum response tokens
        model: Model to use

    Returns:
        OpenAI response

    Raises:
        HTTPException on failure
    """
    _check_circuit_breaker()

    last_error = None

    for attempt in range(MAX_RETRIES):
        try:
            response = client.chat.completions.create(
                model=model,
                messages=messages,
                max_tokens=max_tokens
            )
            _record_success()
            return response

        except Exception as e:
            last_error = e
            error_str = str(e).lower()

            # Check if it's a rate limit or transient error
            is_retryable = any(term in error_str for term in [
                "rate limit", "timeout", "connection", "503", "502", "504"
            ])

            if is_retryable and attempt < MAX_RETRIES - 1:
                delay = RETRY_BASE_DELAY * (2 ** attempt)  # 2s, 4s, 8s
                logger.warning(f"OpenAI request failed (attempt {attempt + 1}): {e}. Retrying in {delay}s...")
                time.sleep(delay)
                continue
            else:
                _record_failure()
                logger.error(f"OpenAI request failed after {attempt + 1} attempts: {e}")
                break

    raise HTTPException(status_code=500, detail=f"OpenAI API error: {str(last_error)}")


@router.post("/generate-insights", summary="Generate AI Insights")
async def generate_insights(request: InsightRequest):
    """
    Generate AI-powered insights from analysis metrics.

    Uses OpenAI GPT models to analyze spotlist metrics and provide
    recommendations based on industry benchmarks and invendo methodology.

    Features:
    - Retry with exponential backoff on transient failures
    - Circuit breaker to prevent cascade failures

    Args:
        request: InsightRequest with metrics dict

    Returns:
        Dict with 'insights' key containing the AI-generated analysis

    Raises:
        HTTPException: If OpenAI not available, API key missing, or API error
    """
    if not OPENAI_AVAILABLE or openai is None:
        raise HTTPException(status_code=500, detail="OpenAI library not installed on server.")

    if not OPENAI_API_KEY:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured on server.")

    client = openai.OpenAI(api_key=OPENAI_API_KEY)

    # Construct a summary of the metrics
    m = request.metrics
    summary = f"""
    Total Spend: €{m.get('total_cost', 0):,.2f}
    Double Booking Spend: €{m.get('double_cost', 0):,.2f} ({m.get('percent_cost', 0)*100:.1f}%)
    Total Spots: {m.get('total_spots', 0)}
    Double Spots: {m.get('double_spots', 0)} ({m.get('percent_spots', 0)*100:.1f}%)
    """

    if 'total_xrp' in m:
        summary += f"Total XRP: {m.get('total_xrp', 0):.1f}\n"
    if 'cost_per_xrp' in m:
        summary += f"Cost per XRP: €{m.get('cost_per_xrp', 0):.2f}\n"

    prompt = f"""
    You are a Media Audit Expert following invendo TV Audit methodology. Analyze the following TV spotlist metrics for potential inefficiencies and double bookings.

    Data Summary:
    {summary}

    Industry Benchmarks:
    - Double bookings should be < 5% of total spots (industry standard)
    - Efficient spots should represent > 60% of total spend
    - Low incremental reach spots (<5% incremental) should be minimized

    Please provide:
    1. An executive summary of the efficiency compared to industry standards.
    2. Key concerns regarding double bookings (current rate: {m.get('percent_spots', 0)*100:.1f}% vs. <5% target).
    3. Spot efficiency breakdown (efficient vs. double bookings vs. low incremental).
    4. Specific recommendations for optimization based on invendo audit methodology.

    Keep it concise, professional, and actionable.
    """

    messages = [
        {"role": "system", "content": "You are a helpful assistant for media analysis."},
        {"role": "user", "content": prompt}
    ]

    response = _call_openai_with_retry(client, messages, max_tokens=500)
    return {"insights": response.choices[0].message.content}


@router.post("/generate-suggestions", summary="Generate AI Suggestions")
async def generate_suggestions(request: InsightRequest):
    """
    Generate actionable AI-powered suggestions from analysis metrics.

    Provides specific, prioritized recommendations to improve campaign
    efficiency and reduce double bookings.

    Features:
    - Retry with exponential backoff on transient failures
    - Circuit breaker to prevent cascade failures
    - Fallback response if parsing fails

    Args:
        request: InsightRequest with metrics dict

    Returns:
        Dict with 'suggestions' list containing actionable recommendations

    Raises:
        HTTPException: If OpenAI not available, API key missing, or API error
    """
    if not OPENAI_AVAILABLE or openai is None:
        raise HTTPException(status_code=500, detail="OpenAI library not installed on server.")

    if not OPENAI_API_KEY:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured on server.")

    client = openai.OpenAI(api_key=OPENAI_API_KEY)

    m = request.metrics
    double_rate = m.get('percent_spots', 0) * 100
    double_cost_rate = m.get('percent_cost', 0) * 100

    prompt = f"""
    You are a Media Audit Expert. Based on these TV spotlist metrics, provide 3-5 actionable suggestions:

    Current Metrics:
    - Total Spend: €{m.get('total_cost', 0):,.2f}
    - Double Booking Spend: €{m.get('double_cost', 0):,.2f} ({double_cost_rate:.1f}%)
    - Total Spots: {m.get('total_spots', 0)}
    - Double Spots: {m.get('double_spots', 0)} ({double_rate:.1f}%)

    Industry Target: Double bookings should be < 5% of total spots.
    Current Status: {"Above target - needs attention" if double_rate > 5 else "Within target"}

    Provide suggestions in this JSON format:
    {{
        "suggestions": [
            {{
                "priority": "high|medium|low",
                "title": "Short actionable title",
                "description": "Specific recommendation with expected impact",
                "potential_savings": "Estimated savings if applicable (e.g., '€10,000' or null)"
            }}
        ]
    }}

    Focus on:
    1. Reducing double booking waste
    2. Optimizing channel mix
    3. Improving scheduling efficiency
    4. Cost savings opportunities

    Return ONLY valid JSON, no markdown.
    """

    messages = [
        {"role": "system", "content": "You are a media efficiency expert. Return only valid JSON."},
        {"role": "user", "content": prompt}
    ]

    try:
        response = _call_openai_with_retry(client, messages, max_tokens=600)
        content = response.choices[0].message.content.strip()

        # Handle potential markdown code blocks
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]

        result = json.loads(content)
        return result

    except json.JSONDecodeError:
        # Fallback if JSON parsing fails
        logger.warning("Failed to parse OpenAI response as JSON, returning fallback")
        return {"suggestions": [
            {
                "priority": "medium",
                "title": "Review Double Bookings",
                "description": "Analyze the detailed double bookings table to identify patterns and optimization opportunities.",
                "potential_savings": None
            }
        ]}


@router.get("/openai-health", summary="Check OpenAI Service Health")
async def check_openai_health():
    """
    Check the health status of the OpenAI integration.

    Returns:
        Dict with availability status and circuit breaker state
    """
    return {
        "available": OPENAI_AVAILABLE and OPENAI_API_KEY is not None,
        "circuit_breaker": {
            "is_open": _circuit_state["is_open"],
            "failures": _circuit_state["failures"],
            "threshold": CIRCUIT_FAILURE_THRESHOLD,
            "recovery_timeout": CIRCUIT_RECOVERY_TIMEOUT,
        }
    }
