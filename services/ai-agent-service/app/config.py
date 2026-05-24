from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=[".env.production", ".env", "../../.env.production", "../../.env"],
        env_file_encoding="utf-8",
        extra="ignore",
    )

    environment: Literal["development", "production", "test"] = "development"
    port: int = Field(default=3005, ge=1, le=65535)

    # LLM configuration
    llm_provider: Literal["local", "openai", "anthropic", "groq"] = "local"
    openai_api_key: str = Field(default="")
    openai_base_url: str = Field(default="http://localhost:11434/v1")
    llm_model: str = Field(default="llama3")
    embedding_model: str = Field(default="all-MiniLM-L6-v2")
    embedding_dimensions: int = Field(default=384, ge=1)
    ollama_host: str = Field(default="http://localhost:11434")
    max_tokens: int = Field(default=4096, ge=1, le=128000)
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)

    # Groq
    groq_api_key: str = Field(default="")

    # Vector DB
    vector_db_provider: Literal["qdrant", "supabase"] = "qdrant"
    vector_db_url: str = Field(default="http://localhost:6333")
    vector_db_api_key: str = Field(default="")
    vector_db_collection: str = Field(default="quorvexa_embeddings")

    # Supabase (for pgvector when vector_db_provider=supabase)
    supabase_url: str = Field(default="")
    supabase_service_role_key: str = Field(default="")

    # Redis for agent memory/session
    redis_url: str = Field(default="")
    redis_host: str = Field(default="localhost")
    redis_port: int = Field(default=6379, ge=1, le=65535)
    redis_password: str = Field(default="")
    redis_db: int = Field(default=0)

    # Security
    jwt_secret: str = Field(default="", min_length=0)
    cors_origins: str = Field(default="http://localhost:3000")

    # Observability
    log_level: Literal["debug", "info", "warning", "error", "critical"] = "info"
    otel_exporter_otlp_endpoint: str = Field(default="http://localhost:4317")
    otel_exporter_otlp_headers: str = Field(default="")

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",")]


settings = Settings()
