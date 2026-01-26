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

    # Exposure caps (scalping/shorting)
    max_gross_exposure_pct: float = 1.0
    max_net_exposure_pct: float = 0.3

    # Defaults
    default_symbols_csv: str = "AAPL,MSFT,NVDA,BTC/USD,ETH/USD"
    primary_timeframe: str = "1Min"


settings = Settings()
