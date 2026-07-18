"""papertrader — a verifiable paper-trading bot: signal -> target -> order."""
from papertrader.broker import AlpacaBroker, PaperBroker
from papertrader.engine import CycleResult, load_history, run_cycle
from papertrader.strategy import make_signal, momentum_weight, sma_weight

__version__ = "0.1.0"
__all__ = [
    "PaperBroker", "AlpacaBroker",
    "run_cycle", "load_history", "CycleResult",
    "make_signal", "sma_weight", "momentum_weight",
    "__version__",
]
