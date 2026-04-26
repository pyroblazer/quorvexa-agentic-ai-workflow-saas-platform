"""Tests for app.observability module."""

from unittest.mock import MagicMock, patch


def test_configure_logging_runs_without_error():
    """configure_logging should complete without raising."""
    from app.observability import configure_logging

    configure_logging()  # should not raise


def test_init_tracing_creates_provider():
    """init_tracing should set up a TracerProvider."""
    with (
        patch("app.observability.OTLPSpanExporter") as _mock_exporter,
        patch("app.observability.BatchSpanProcessor") as _mock_processor,
        patch("app.observability.TracerProvider") as mock_provider_cls,
        patch("app.observability.trace") as mock_trace,
    ):
        mock_provider = MagicMock()
        mock_provider_cls.return_value = mock_provider

        from app.observability import init_tracing

        init_tracing("test-service")

        mock_provider_cls.assert_called_once()
        mock_provider.add_span_processor.assert_called_once()
        mock_trace.set_tracer_provider.assert_called_once_with(mock_provider)
