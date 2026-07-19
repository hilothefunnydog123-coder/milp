"""quantlang — a tiny language for trading strategies.

Source -> lexer -> parser -> validated AST -> a strategy object that runs
on the quantsim backtesting engine (or standalone).
"""
from quantlang.errors import QuantlangError
from quantlang.interpreter import (
    DslStrategy,
    compile_strategy,
    evaluate_expression,
)
from quantlang.lexer import Token, tokenize
from quantlang.parser import Program, parse

__version__ = "0.1.0"
__all__ = [
    "compile_strategy", "evaluate_expression", "DslStrategy",
    "parse", "tokenize", "Program", "Token", "QuantlangError",
    "__version__",
]
