"""
Structured logging configuration using structlog.

Provides JSON-formatted logs for production and human-readable logs for development.
"""

import logging
import sys
from typing import Any

import structlog


def setup_logging(
    log_level: str = "INFO",
    json_logs: bool = False,
    include_timestamps: bool = True
) -> None:
    """
    Configure structured logging for the application.
    
    Args:
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR)
        json_logs: If True, output JSON-formatted logs (for production)
        include_timestamps: If True, include timestamps in logs
    """
    # Configure standard library logging
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=getattr(logging, log_level.upper(), logging.INFO),
    )
    
    # Shared processors for all logging
    shared_processors = [
        structlog.contextvars.merge_contextvars,
        structlog.stdlib.add_log_level,
        structlog.stdlib.add_logger_name,
        structlog.processors.StackInfoRenderer(),
        structlog.processors.UnicodeDecoder(),
    ]
    
    if include_timestamps:
        shared_processors.insert(0, structlog.processors.TimeStamper(fmt="iso"))
    
    if json_logs:
        # Production: JSON output
        shared_processors.append(structlog.processors.format_exc_info)
        shared_processors.append(structlog.processors.JSONRenderer())
    else:
        # Development: Human-readable output
        shared_processors.append(structlog.dev.ConsoleRenderer(colors=True))
    
    structlog.configure(
        processors=shared_processors,
        wrapper_class=structlog.make_filtering_bound_logger(
            getattr(logging, log_level.upper(), logging.INFO)
        ),
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )


def get_logger(name: str = None) -> structlog.BoundLogger:
    """
    Get a configured logger instance.
    
    Args:
        name: Logger name (usually __name__)
        
    Returns:
        Configured structlog BoundLogger
    """
    return structlog.get_logger(name)


# Request context helper
def bind_request_context(
    request_id: str,
    method: str,
    path: str,
    client_ip: str = None,
    **extra: Any
) -> None:
    """
    Bind request context to the current logger context.
    
    This context will be included in all log messages within the request.
    
    Args:
        request_id: Unique identifier for the request
        method: HTTP method (GET, POST, etc.)
        path: Request path
        client_ip: Client IP address
        **extra: Additional context to bind
    """
    structlog.contextvars.clear_contextvars()
    structlog.contextvars.bind_contextvars(
        request_id=request_id,
        method=method,
        path=path,
        client_ip=client_ip,
        **extra
    )


def clear_request_context() -> None:
    """Clear the request context after request completion."""
    structlog.contextvars.clear_contextvars()
