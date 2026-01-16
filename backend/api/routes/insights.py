"""
AI Insights endpoint using OpenAI.
"""

from typing import Any
from fastapi import APIRouter, HTTPException

from api.models.requests import InsightRequest
from api.dependencies import OPENAI_AVAILABLE, openai, OPENAI_API_KEY

router = APIRouter(tags=["AI Insights"])


@router.post("/generate-insights", summary="Generate AI Insights")
async def generate_insights(request: InsightRequest):
    """
    Generate AI-powered insights from analysis metrics.
    
    Uses OpenAI GPT models to analyze spotlist metrics and provide
    recommendations based on industry benchmarks and invendo methodology.
    
    Args:
        request: InsightRequest with metrics dict and OpenAI API key
        
    Returns:
        Dict with 'insights' key containing the AI-generated analysis
        
    Raises:
        HTTPException: If OpenAI not available, API key missing, or API error
    """
    if not OPENAI_AVAILABLE or openai is None:
        raise HTTPException(status_code=500, detail="OpenAI library not installed on server.")

    if not OPENAI_API_KEY:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured on server.")

    try:
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

        response = client.chat.completions.create(
            model="gpt-4o-mini",  # Use a fast, capable model
            messages=[
                {"role": "system", "content": "You are a helpful assistant for media analysis."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=500
        )
        
        return {"insights": response.choices[0].message.content}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate-suggestions", summary="Generate AI Suggestions")
async def generate_suggestions(request: InsightRequest):
    """
    Generate actionable AI-powered suggestions from analysis metrics.

    Provides specific, prioritized recommendations to improve campaign
    efficiency and reduce double bookings.

    Args:
        request: InsightRequest with metrics dict and OpenAI API key

    Returns:
        Dict with 'suggestions' list containing actionable recommendations

    Raises:
        HTTPException: If OpenAI not available, API key missing, or API error
    """
    if not OPENAI_AVAILABLE or openai is None:
        raise HTTPException(status_code=500, detail="OpenAI library not installed on server.")

    if not OPENAI_API_KEY:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured on server.")

    try:
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

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a media efficiency expert. Return only valid JSON."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=600
        )

        import json
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
        return {"suggestions": [
            {
                "priority": "medium",
                "title": "Review Double Bookings",
                "description": "Analyze the detailed double bookings table to identify patterns and optimization opportunities.",
                "potential_savings": None
            }
        ]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
