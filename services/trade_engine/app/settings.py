from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    api_url: str = "http://localhost:8000"

    alpaca_env: str = "paper"  # paper|live
    alpaca_api_key_id: str = ""
    alpaca_api_secret_key: str = ""

    run_mode: str = "shadow"  # shadow|live

    max_daily_loss_pct: float = 0.02
    max_position_pct: float = 0.10
    max_concurrent_positions: int = 10
    max_orders_per_minute: int = 20


settings = Settings()
