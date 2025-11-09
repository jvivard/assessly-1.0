"""Application configuration management using Pydantic Settings."""

from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # API Keys
    openai_api_key: str = Field(..., alias="OPENAI_API_KEY")
    google_api_key: str = Field(default="", alias="GOOGLE_API_KEY")
    gemini_api_key: str = Field(default="", alias="GEMINI_API_KEY")  # Optional - falls back to GPT-4o
    google_application_credentials: str = Field(default="", alias="GOOGLE_APPLICATION_CREDENTIALS")
    novita_api_key: str = Field(..., alias="NOVITA_API_KEY")
    novita_base_url: str = Field(default="https://api.novita.ai/openai", alias="NOVITA_BASE_URL")
    
    # Database
    database_url: str = Field(..., alias="DATABASE_URL")
    
    # Redis
    redis_url: str = Field(default="redis://localhost:6379/0", alias="REDIS_URL")
    
    # AWS S3 (Optional)
    aws_access_key_id: str = Field(default="", alias="AWS_ACCESS_KEY_ID")
    aws_secret_access_key: str = Field(default="", alias="AWS_SECRET_ACCESS_KEY")
    aws_bucket_name: str = Field(default="", alias="AWS_BUCKET_NAME")
    aws_region: str = Field(default="us-east-1", alias="AWS_REGION")
    
    # Application Settings
    debug: bool = Field(default=False, alias="DEBUG")
    upload_dir: str = Field(default="./uploads", alias="UPLOAD_DIR")
    max_file_size: int = Field(default=10485760, alias="MAX_FILE_SIZE")  # 10MB
    
    # CORS
    allowed_origins: str = Field(default="http://localhost:3000", alias="ALLOWED_ORIGINS")
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False
    )
    
    @property
    def allowed_origins_list(self) -> List[str]:
        """Parse allowed origins from comma-separated string."""
        return [origin.strip() for origin in self.allowed_origins.split(",")]


# Global settings instance
settings = Settings()

