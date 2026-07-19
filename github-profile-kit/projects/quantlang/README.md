# 📜 quantlang

**A tiny programming language for trading strategies.** Hand-written lexer → recursive-descent parser → compile-time validator → interpreter, ~700 lines of Python with zero parsing dependencies. Programs compile into strategy objects that run on the [quantsim](https://github.com/hilothefunnydog123-coder/quantsim) backtesting engine — and a test proves the compiled output is **bitwise identical** to the equivalent hand-written Python strategy, all the way through a backtest.

```
strategy "cautious momentum" {
  when momentum(126) > 0 and rsi(14) > 80          then flat
  when momentum(126) > 0 and volatility(20) > 0.03 then flat
  when momentum(126) > 0 and rsi(14) > 65          then 0.5
  when momentum(126) > 0                           then long
  otherwise flat
}
```

Rules read top-down, first match wins, `otherwise` is mandatory (the compiler refuses strategies with undefined behavior). Positions are `long`, `short`, `flat`, or any numeric weight — `0.5` means half-invested.

## 🚀 Quickstart

```bash
pip install "quantlang[backtest] @ git+https://github.com/hilothefunnydog123-coder/quantlang.git"

quantlang check examples/golden_cross.ql
quantlang backtest examples/golden_cross.ql --symbol SPY
quantlang repl        # evaluate indicator expressions interactively
```

```
quantlang backtest — "golden cross" on SPY · 2,517 bars

metric             strategy  buy & hold
total return        +60.94%     +14.57%
Sharpe (rf=0)          0.72        0.22
max drawdown        -21.35%     -58.19%
```

## 🧠 Real compiler diagnostics

Errors point at the source with a caret, and unknown names get *did-you-mean* suggestions — because a language without good errors is just a config format with opinions:

```
error: unknown indicator 'smaa' — did you mean 'sma'?
  2 |   when smaa(20) > sma(100) then long
             ^

error: expected 'then' but got 'long' — every 'when' needs a 'then'
  2 |   when sma(20) > sma(100) long
                                ^
```

Validation happens at **compile time**: unknown indicators, wrong arity, non-integer windows, and type errors (`sma(20) and 3` — a number where a condition belongs) are all rejected before a single bar is processed. A strategy that compiles cannot fail mid-backtest with a name error.

## 📖 The language

**Indicators** — `price()`, `sma(n)`, `ema(n)`, `rsi(n)`, `momentum(n)`, `highest(n)`, `lowest(n)`, `volatility(n)`

**Operators** (by precedence, loosest first) — `or` · `and` · `not` · comparisons `> < >= <= == !=` · `+ -` · `* /` · unary `-`

**Grammar** (full EBNF in [`parser.py`](quantlang/parser.py)):

```ebnf
program := "strategy" STRING "{" rule* "otherwise" action "}"
rule    := "when" expr "then" action
action  := "long" | "short" | "flat" | expr
```

The compiler also derives each strategy's **warmup** automatically — `momentum(126)` needs 127 bars, so the strategy won't emit signals before it has them.

## 🔬 The equivalence guarantee

The flagship test compiles the golden-cross program and runs it through a full quantsim backtest next to the hand-written Python `SMACrossover`:

```python
dsl    = run_backtest(closes, compile_strategy(GOLDEN_CROSS_SOURCE))
python = run_backtest(closes, SMACrossover(fast=20, slow=100))
assert np.array_equal(dsl.weights, python.weights)   # every daily decision
assert np.array_equal(dsl.equity,  python.equity)    # every dollar
```

Not "approximately the same backtest" — the same backtest.

## ✅ Tests

```bash
pip install -e ".[dev,backtest]" && pytest
```

26 tests: tokenization with positions, AST structure and operator precedence, error positions and caret rendering, compile-time type checking, every indicator against a NumPy reference, first-match semantics, weight clamping, and the quantsim equivalence and example-program suites.

## 📄 License

MIT. Yes, you can now say you wrote a programming language.
