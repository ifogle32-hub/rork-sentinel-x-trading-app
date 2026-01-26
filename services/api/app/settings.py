from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Default to SQLite for easiest local dev. For Postgres, set DATABASE_URL in .env.
    database_url: str = "sqlite:///./agentins.db"
    api_host: str = "0.0.0.0"
    api_port: int = 8000


settings = Settings()
