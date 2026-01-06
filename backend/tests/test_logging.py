"""
Tests for the logging middleware and configuration.
"""

import pytest
import time
from unittest.mock import MagicMock, patch
from fastapi import FastAPI
from fastapi.testclient import TestClient


class TestLoggingConfiguration:
    """Tests for the logging configuration module."""
    
    def test_setup_logging_imports(self):
        """Test that logging module can be imported."""
        from core.logging import setup_logging, get_logger
        
        # Should not raise
        assert callable(setup_logging)
        assert callable(get_logger)
    
    def test_get_logger(self):
        """Test getting a logger instance."""
        from core.logging import get_logger
        
        logger = get_logger("test_module")
        assert logger is not None
    
    def test_bind_request_context(self):
        """Test binding request context."""
        from core.logging import bind_request_context, clear_request_context
        
        # Should not raise
        bind_request_context(
            request_id="test-123",
            method="GET",
            path="/test",
            client_ip="127.0.0.1"
        )
        
        clear_request_context()


class TestLoggingMiddleware:
    """Tests for the logging middleware."""
    
    def test_middleware_adds_request_id_header(self):
        """Test that middleware adds X-Request-ID header."""
        from api.middleware import LoggingMiddleware
        
        app = FastAPI()
        app.add_middleware(LoggingMiddleware)
        
        @app.get("/test")
        def test_endpoint():
            return {"status": "ok"}
        
        client = TestClient(app)
        response = client.get("/test")
        
        assert response.status_code == 200
        assert "X-Request-ID" in response.headers
        assert len(response.headers["X-Request-ID"]) == 8  # UUID[:8]
    
    def test_middleware_passes_through_response(self):
        """Test that middleware doesn't alter response content."""
        from api.middleware import LoggingMiddleware
        
        app = FastAPI()
        app.add_middleware(LoggingMiddleware)
        
        @app.get("/data")
        def data_endpoint():
            return {"key": "value", "number": 42}
        
        client = TestClient(app)
        response = client.get("/data")
        
        assert response.status_code == 200
        assert response.json() == {"key": "value", "number": 42}
