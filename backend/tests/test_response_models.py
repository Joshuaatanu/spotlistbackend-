"""
Tests for Pydantic response models.
"""

import pytest
from datetime import datetime
from api.models.responses import (
    HealthResponse,
    DatabaseHealthResponse,
    AnalysisMetrics,
    FieldMap,
    WindowSummary,
    AnalysisMetadata,
    AnalysisRecord,
    ConfigurationResponse,
    DeleteResponse,
    InsightsResponse,
    MetadataItem,
    ErrorResponse,
)


class TestHealthModels:
    """Tests for health response models."""
    
    def test_health_response(self):
        """Test HealthResponse model."""
        response = HealthResponse(status="ok")
        assert response.status == "ok"
    
    def test_database_health_connected(self):
        """Test DatabaseHealthResponse when connected."""
        response = DatabaseHealthResponse(connected=True)
        assert response.connected is True
        assert response.error is None
    
    def test_database_health_disconnected(self):
        """Test DatabaseHealthResponse with error."""
        response = DatabaseHealthResponse(connected=False, error="Connection timeout")
        assert response.connected is False
        assert response.error == "Connection timeout"


class TestAnalysisModels:
    """Tests for analysis response models."""
    
    def test_analysis_metrics(self):
        """Test AnalysisMetrics model."""
        metrics = AnalysisMetrics(
            total_spots=100,
            double_spots=10,
            total_cost=50000.0,
            double_cost=5000.0,
            percent_spots=0.1,
            percent_cost=0.1,
        )
        assert metrics.total_spots == 100
        assert metrics.percent_spots == 0.1
    
    def test_analysis_metrics_with_extended(self):
        """Test AnalysisMetrics with extended metrics."""
        metrics = AnalysisMetrics(
            total_spots=100,
            double_spots=10,
            total_cost=50000.0,
            double_cost=5000.0,
            percent_spots=0.1,
            percent_cost=0.1,
            total_xrp=500.0,
            cost_per_xrp=100.0,
        )
        assert metrics.total_xrp == 500.0
        assert metrics.cost_per_xrp == 100.0
    
    def test_field_map(self):
        """Test FieldMap model."""
        field_map = FieldMap(
            cost_column="Spend",
            program_column="Channel",
            creative_column="Claim",
        )
        assert field_map.cost_column == "Spend"
        assert field_map.reach_column is None  # Optional field
    
    def test_window_summary(self):
        """Test WindowSummary model."""
        summary = WindowSummary(
            window_minutes=60,
            all={"total_spots": 100, "double_spots": 10}
        )
        assert summary.window_minutes == 60
        assert summary.all["total_spots"] == 100


class TestDatabaseModels:
    """Tests for database response models."""
    
    def test_analysis_record(self):
        """Test AnalysisRecord model."""
        record = AnalysisRecord(
            id="abc-123",
            session_id="session-456",
            file_name="test.csv",
            metrics={"total_spots": 100},
            created_at=datetime.now(),
        )
        assert record.id == "abc-123"
        assert record.metrics["total_spots"] == 100
    
    def test_configuration_response(self):
        """Test ConfigurationResponse model."""
        response = ConfigurationResponse(config={"theme": "dark"})
        assert response.config["theme"] == "dark"
    
    def test_configuration_response_empty(self):
        """Test ConfigurationResponse with None."""
        response = ConfigurationResponse(config=None)
        assert response.config is None
    
    def test_delete_response(self):
        """Test DeleteResponse model."""
        response = DeleteResponse(deleted=True)
        assert response.deleted is True


class TestOtherModels:
    """Tests for other response models."""
    
    def test_insights_response(self):
        """Test InsightsResponse model."""
        response = InsightsResponse(insights="Your campaign has 10% double bookings...")
        assert "double bookings" in response.insights
    
    def test_metadata_item(self):
        """Test MetadataItem model."""
        item = MetadataItem(value=123, caption="RTL Television")
        assert item.value == 123
        assert item.caption == "RTL Television"
    
    def test_error_response(self):
        """Test ErrorResponse model."""
        response = ErrorResponse(detail="Resource not found")
        assert response.detail == "Resource not found"
