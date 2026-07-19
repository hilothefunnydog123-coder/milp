"""Semantic validation and evaluation: AST -> a runnable trading strategy.

Validation happens at compile time (unknown indicators, wrong arity,
non-literal windows, type errors like `sma(20) and 3`), so a strategy that
compiles cannot blow up mid-backtest with a name error.
"""
from __future__ import annotations

import difflib

import numpy as np

from quantlang.errors import QuantlangError
from quantlang.parser import (
    BinOp,
    Call,
    Compare,
    Logic,
    Neg,
    Not,
    Number,
    Program,
    parse,
)

# indicator name -> (number of args, warmup bars needed for window n)
INDICATORS = {
    "price": (0, lambda n: 1),
    "sma": (1, lambda n: n),
    "ema": (1, lambda n: n),
    "rsi": (1, lambda n: n + 1),
    "momentum": (1, lambda n: n + 1),
    "highest": (1, lambda n: n),
    "lowest": (1, lambda n: n),
    "volatility": (1, lambda n: n + 1),
}


# -- indicator implementations ----------------------------------------------

def _indicator(name: str, window: int, closes: np.ndarray) -> float:
    if name == "price":
        return float(closes[-1])
    if name == "sma":
        return float(closes[-window:].mean())
    if name == "ema":
        alpha = 2.0 / (window + 1.0)
        value = float(closes[-window])
        for price in closes[-window + 1:] if window > 1 else []:
            value = alpha * float(price) + (1.0 - alpha) * value
        return value
    if name == "rsi":
        changes = np.diff(closes[-window - 1:])
        gains = changes[changes > 0].sum()
        losses = float(-changes[changes < 0].sum())
        if losses == 0:
            return 100.0
        rs = gains / losses
        return 100.0 - 100.0 / (1.0 + rs)
    if name == "momentum":
        return float(closes[-1] / closes[-window - 1] - 1.0)
    if name == "highest":
        return float(closes[-window:].max())
    if name == "lowest":
        return float(closes[-window:].min())
    if name == "volatility":
        rets = np.diff(closes[-window - 1:]) / closes[-window - 1:-1]
        return float(rets.std(ddof=1)) if len(rets) > 1 else 0.0
    raise AssertionError(f"unvalidated indicator {name}")  # pragma: no cover


# -- compile-time validation --------------------------------------------------

def _validate(node, source: str) -> int:
    """Type-check the tree and return its warmup requirement (in bars).

    Returns bars needed for numeric expressions; conditions are checked
    structurally (comparisons/logic yield booleans, arithmetic yields numbers).
    """
    if isinstance(node, Number):
        return 0
    if isinstance(node, Call):
        if node.name not in INDICATORS:
            suggestion = difflib.get_close_matches(node.name, INDICATORS, n=1)
            hint = f" — did you mean {suggestion[0]!r}?" if suggestion else \
                f" (available: {', '.join(sorted(INDICATORS))})"
            raise QuantlangError(f"unknown indicator {node.name!r}{hint}",
                                 node.line, node.col, source)
        arity, warmup_fn = INDICATORS[node.name]
        if len(node.args) != arity:
            raise QuantlangError(
                f"{node.name} takes {arity} argument(s), got {len(node.args)}",
                node.line, node.col, source)
        window = 0
        if arity == 1:
            arg = node.args[0]
            if not isinstance(arg, Number) or arg.value != int(arg.value) or arg.value < 1:
                raise QuantlangError(
                    f"{node.name} window must be a positive whole number literal",
                    node.line, node.col, source)
            window = int(arg.value)
        return warmup_fn(window)
    if isinstance(node, (BinOp,)):
        for side in (node.left, node.right):
            if isinstance(side, (Compare, Logic, Not)):
                raise QuantlangError(
                    f"arithmetic {node.op!r} needs numbers, got a condition",
                    node.line, node.col, source)
        return max(_validate(node.left, source), _validate(node.right, source))
    if isinstance(node, Compare):
        for side in (node.left, node.right):
            if isinstance(side, (Compare, Logic, Not)):
                raise QuantlangError(
                    f"comparison {node.op!r} needs numbers on both sides",
                    node.line, node.col, source)
        return max(_validate(node.left, source), _validate(node.right, source))
    if isinstance(node, Logic):
        for side in (node.left, node.right):
            if not isinstance(side, (Compare, Logic, Not)):
                raise QuantlangError(
                    f"{node.op!r} needs conditions on both sides "
                    "(e.g. price() > 100), got a number",
                    node.line, node.col, source)
        return max(_validate(node.left, source), _validate(node.right, source))
    if isinstance(node, Not):
        if not isinstance(node.operand, (Compare, Logic, Not)):
            raise QuantlangError("'not' needs a condition, got a number",
                                 node.line, node.col, source)
        return _validate(node.operand, source)
    if isinstance(node, Neg):
        return _validate(node.operand, source)
    raise AssertionError(f"unknown node {node!r}")  # pragma: no cover


# -- evaluation ---------------------------------------------------------------

def _eval(node, closes: np.ndarray):
    if isinstance(node, Number):
        return node.value
    if isinstance(node, Call):
        window = int(node.args[0].value) if node.args else 0
        return _indicator(node.name, window, closes)
    if isinstance(node, BinOp):
        left, right = _eval(node.left, closes), _eval(node.right, closes)
        if node.op == "+":
            return left + right
        if node.op == "-":
            return left - right
        if node.op == "*":
            return left * right
        return left / right if right != 0 else 0.0  # division by zero -> 0, documented
    if isinstance(node, Compare):
        left, right = _eval(node.left, closes), _eval(node.right, closes)
        return {"<": left < right, ">": left > right, "<=": left <= right,
                ">=": left >= right, "==": left == right, "!=": left != right}[node.op]
    if isinstance(node, Logic):
        if node.op == "and":
            return _eval(node.left, closes) and _eval(node.right, closes)
        return _eval(node.left, closes) or _eval(node.right, closes)
    if isinstance(node, Not):
        return not _eval(node.operand, closes)
    if isinstance(node, Neg):
        return -_eval(node.operand, closes)
    raise AssertionError(f"unknown node {node!r}")  # pragma: no cover


def evaluate_expression(source: str, closes) -> float | bool:
    """Evaluate a single expression (for the REPL) against a close series."""
    from quantlang.parser import Parser

    parser = Parser(source)
    node = parser.expr()
    parser.expect("EOF", hint="one expression at a time")
    _validate(node, source)
    return _eval(node, np.asarray(closes, dtype=float))


# -- the compiled strategy object --------------------------------------------

try:  # integrate with quantsim when available, stand alone otherwise
    from quantsim.backtest import Strategy as _Base
except ImportError:  # pragma: no cover
    class _Base:  # minimal stand-in with the same interface
        warmup = 0
        name = "strategy"

        def reset(self) -> None:
            pass


class DslStrategy(_Base):
    """A compiled quantlang program, usable anywhere a quantsim Strategy is."""

    def __init__(self, program: Program):
        self.program = program
        self.name = program.name
        warmups = [_validate(rule.condition, program.source) for rule in program.rules]
        warmups += [_validate(rule.action, program.source) for rule in program.rules]
        warmups.append(_validate(program.otherwise, program.source))
        self.warmup = max(warmups) if warmups else 1

    def target_weight(self, closes) -> float:
        closes = np.asarray(closes, dtype=float)
        for rule in self.program.rules:
            if _eval(rule.condition, closes):
                return float(np.clip(_eval(rule.action, closes), -1.0, 1.0))
        return float(np.clip(_eval(self.program.otherwise, closes), -1.0, 1.0))


def compile_strategy(source: str) -> DslStrategy:
    """Parse, validate, and wrap a quantlang program. The public entry point."""
    return DslStrategy(parse(source))
