"""
Resilience utilities for API clients.

Provides retry decorators with exponential backoff and circuit breaker patterns
for handling transient failures gracefully.
"""

import logging
from functools import wraps
from typing import Callable, Any, Type, Tuple

logger = logging.getLogger(__name__)

# Try to import tenacity and circuitbreaker
try:
    from tenacity import (
        retry,
        stop_after_attempt,
        wait_exponential,
        retry_if_exception_type,
        before_sleep_log,
        after_log,
    )
    TENACITY_AVAILABLE = True
except ImportError:
    TENACITY_AVAILABLE = False
    logger.warning("tenacity not installed - retry decorators will be no-ops")

try:
    from circuitbreaker import circuit, CircuitBreakerError
    CIRCUITBREAKER_AVAILABLE = True
except ImportError:
    CIRCUITBREAKER_AVAILABLE = False
    logger.warning("circuitbreaker not installed - circuit breaker will be disabled")


# Default retry configuration
DEFAULT_MAX_RETRIES = 3
DEFAULT_BASE_DELAY = 2  # seconds
DEFAULT_MAX_DELAY = 8  # seconds

# Default circuit breaker configuration
DEFAULT_FAILURE_THRESHOLD = 5
DEFAULT_RECOVERY_TIMEOUT = 60  # seconds


def create_retry_decorator(
    max_retries: int = DEFAULT_MAX_RETRIES,
    base_delay: float = DEFAULT_BASE_DELAY,
    max_delay: float = DEFAULT_MAX_DELAY,
    retry_exceptions: Tuple[Type[Exception], ...] = (Exception,),
):
    """
    Create a retry decorator with exponential backoff.

    Args:
        max_retries: Maximum number of retry attempts
        base_delay: Base delay in seconds (will be multiplied exponentially)
        max_delay: Maximum delay in seconds
        retry_exceptions: Tuple of exception types to retry on

    Returns:
        A decorator function
    """
    if not TENACITY_AVAILABLE:
        # Return a no-op decorator if tenacity is not available
        def noop_decorator(func):
            return func
        return noop_decorator

    return retry(
        stop=stop_after_attempt(max_retries),
        wait=wait_exponential(multiplier=base_delay, min=base_delay, max=max_delay),
        retry=retry_if_exception_type(retry_exceptions),
        before_sleep=before_sleep_log(logger, logging.WARNING),
        after=after_log(logger, logging.DEBUG),
        reraise=True,
    )


def create_circuit_breaker(
    failure_threshold: int = DEFAULT_FAILURE_THRESHOLD,
    recovery_timeout: int = DEFAULT_RECOVERY_TIMEOUT,
    name: str = "default",
):
    """
    Create a circuit breaker decorator.

    The circuit breaker opens after `failure_threshold` failures and
    recovers after `recovery_timeout` seconds.

    Args:
        failure_threshold: Number of failures before opening the circuit
        recovery_timeout: Seconds to wait before attempting recovery
        name: Name for the circuit breaker (for logging)

    Returns:
        A decorator function
    """
    if not CIRCUITBREAKER_AVAILABLE:
        # Return a no-op decorator if circuitbreaker is not available
        def noop_decorator(func):
            return func
        return noop_decorator

    return circuit(
        failure_threshold=failure_threshold,
        recovery_timeout=recovery_timeout,
        expected_exception=Exception,
        name=name,
    )


# Pre-configured decorators for common use cases

# API client decorator: 3 retries with exponential backoff (2s, 4s, 8s)
api_retry = create_retry_decorator(
    max_retries=3,
    base_delay=2,
    max_delay=8,
    retry_exceptions=(
        ConnectionError,
        TimeoutError,
        OSError,
    ),
)

# Database operation decorator: 3 retries with shorter delays
db_retry = create_retry_decorator(
    max_retries=3,
    base_delay=1,
    max_delay=4,
    retry_exceptions=(Exception,),
)

# External API circuit breaker: opens after 5 failures, recovers after 60s
aeos_circuit_breaker = create_circuit_breaker(
    failure_threshold=5,
    recovery_timeout=60,
    name="aeos_api",
)

openai_circuit_breaker = create_circuit_breaker(
    failure_threshold=5,
    recovery_timeout=60,
    name="openai_api",
)


def with_resilience(
    max_retries: int = DEFAULT_MAX_RETRIES,
    circuit_breaker_name: str = None,
    failure_threshold: int = DEFAULT_FAILURE_THRESHOLD,
    recovery_timeout: int = DEFAULT_RECOVERY_TIMEOUT,
):
    """
    Combined decorator that applies both retry and circuit breaker patterns.

    Args:
        max_retries: Maximum retry attempts
        circuit_breaker_name: Name for circuit breaker (enables it if provided)
        failure_threshold: Failures before circuit opens
        recovery_timeout: Seconds before recovery attempt

    Returns:
        A decorator function
    """
    def decorator(func: Callable) -> Callable:
        # Apply retry first (innermost)
        wrapped = create_retry_decorator(max_retries=max_retries)(func)

        # Apply circuit breaker if name provided (outermost)
        if circuit_breaker_name:
            wrapped = create_circuit_breaker(
                failure_threshold=failure_threshold,
                recovery_timeout=recovery_timeout,
                name=circuit_breaker_name,
            )(wrapped)

        return wrapped

    return decorator


# Export circuit breaker error for handling
if CIRCUITBREAKER_AVAILABLE:
    from circuitbreaker import CircuitBreakerError
else:
    class CircuitBreakerError(Exception):
        """Placeholder when circuitbreaker is not installed."""
        pass


__all__ = [
    "create_retry_decorator",
    "create_circuit_breaker",
    "with_resilience",
    "api_retry",
    "db_retry",
    "aeos_circuit_breaker",
    "openai_circuit_breaker",
    "CircuitBreakerError",
    "TENACITY_AVAILABLE",
    "CIRCUITBREAKER_AVAILABLE",
]
