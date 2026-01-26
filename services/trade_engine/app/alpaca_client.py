from __future__ import annotations

from dataclasses import dataclass

from alpaca.trading.client import TradingClient
from alpaca.data.historical import CryptoHistoricalDataClient, StockHistoricalDataClient

from .settings import settings


@dataclass(frozen=True)
class AlpacaClients:
    trading: TradingClient
    stocks_data: StockHistoricalDataClient
    crypto_data: CryptoHistoricalDataClient


def make_clients() -> AlpacaClients:
    trading = TradingClient(
        api_key=settings.alpaca_api_key_id,
        secret_key=settings.alpaca_api_secret_key,
        paper=(settings.alpaca_env == "paper"),
    )
    stocks_data = StockHistoricalDataClient(
        api_key=settings.alpaca_api_key_id,
        secret_key=settings.alpaca_api_secret_key,
    )
    crypto_data = CryptoHistoricalDataClient(
        api_key=settings.alpaca_api_key_id,
        secret_key=settings.alpaca_api_secret_key,
    )
    return AlpacaClients(trading=trading, stocks_data=stocks_data, crypto_data=crypto_data)
