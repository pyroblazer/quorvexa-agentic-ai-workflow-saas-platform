"""Tests for app.config Settings model."""

from app.config import Settings


def test_default_settings():
    s = Settings()
    assert s.port == 3005
    assert s.llm_provider == "local"
    assert s.environment == "development"
    assert s.max_tokens == 4096
    assert s.temperature == 0.7
    assert s.redis_port == 6379
    assert s.redis_db == 0
    assert s.log_level == "info"
    assert isinstance(s.cors_origins, str)
    assert "http://localhost:3000" in s.cors_origins


def test_cors_origins_parsed_from_string():
    s = Settings(cors_origins="http://a.com,http://b.com")
    assert s.cors_origins_list == ["http://a.com", "http://b.com"]


def test_cors_origins_parsed_from_string_with_spaces():
    s = Settings(cors_origins=" http://a.com , http://b.com ")
    assert s.cors_origins_list == ["http://a.com", "http://b.com"]


def test_cors_origins_single():
    s = Settings(cors_origins="http://localhost:3000")
    assert s.cors_origins_list == ["http://localhost:3000"]


def test_port_override():
    s = Settings(port=8080)
    assert s.port == 8080


def test_environment_test():
    s = Settings(environment="test")
    assert s.environment == "test"


def test_environment_production():
    s = Settings(environment="production")
    assert s.environment == "production"


def test_llm_provider_openai():
    s = Settings(llm_provider="openai")
    assert s.llm_provider == "openai"


def test_temperature_boundary():
    s = Settings(temperature=0.0)
    assert s.temperature == 0.0
    s2 = Settings(temperature=2.0)
    assert s2.temperature == 2.0
