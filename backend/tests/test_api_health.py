"""
Integration tests for API health endpoints.
"""

import pytest
from fastapi.testclient import TestClient

# Import the app
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from main import app

client = TestClient(app)


class TestHealthEndpoints:
    """Tests for health check endpoints."""
    
    def test_health_check(self):
        """Test the /health endpoint returns OK."""
        response = client.get("/health")
        
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}
    
    def test_database_health_check(self):
        """Test the /db/health endpoint returns status."""
        response = client.get("/db/health")
        
        assert response.status_code == 200
        data = response.json()
        assert "connected" in data


class TestMetadataEndpoints:
    """Tests for metadata endpoints."""
    
    def test_get_dayparts(self):
        """Test the /metadata/dayparts endpoint."""
        response = client.get("/metadata/dayparts")
        
        # Should return 200 (may be empty list if AEOS not available)
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_get_channels(self):
        """Test the /metadata/channels endpoint."""
        response = client.get("/metadata/channels")
        
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_get_companies(self):
        """Test the /metadata/companies endpoint."""
        response = client.get("/metadata/companies")
        
        assert response.status_code == 200
        assert isinstance(response.json(), list)


class TestDocumentation:
    """Tests for API documentation endpoints."""
    
    def test_openapi_docs_available(self):
        """Test that Swagger UI is available at /api/docs."""
        response = client.get("/api/docs")
        
        assert response.status_code == 200
    
    def test_redoc_available(self):
        """Test that ReDoc is available at /api/redoc."""
        response = client.get("/api/redoc")
        
        assert response.status_code == 200
    
    def test_openapi_json(self):
        """Test that OpenAPI JSON schema is available."""
        response = client.get("/openapi.json")
        
        assert response.status_code == 200
        data = response.json()
        assert "openapi" in data
        assert "info" in data
        assert data["info"]["title"] == "Spotlist Checker API"
