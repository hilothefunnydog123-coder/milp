"""Tokenizer: source text -> tokens with line/column positions."""
from __future__ import annotations

from dataclasses import dataclass

from quantlang.errors import QuantlangError

KEYWORDS = frozenset({
    "strategy", "when", "then", "otherwise",
    "and", "or", "not", "long", "short", "flat",
})

TWO_CHAR_OPS = (">=", "<=", "==", "!=")
ONE_CHAR_OPS = ">", "<", "+", "-", "*", "/"
PUNCT = {"{": "LBRACE", "}": "RBRACE", "(": "LPAREN", ")": "RPAREN", ",": "COMMA"}


@dataclass(frozen=True)
class Token:
    type: str        # KEYWORD | IDENT | NUMBER | STRING | OP | punctuation | EOF
    value: str
    line: int
    col: int


def tokenize(source: str) -> list[Token]:
    tokens: list[Token] = []
    line, col = 1, 1
    i = 0
    n = len(source)

    def error(message: str) -> QuantlangError:
        return QuantlangError(message, line, col, source)

    while i < n:
        ch = source[i]

        if ch == "\n":
            line += 1
            col = 1
            i += 1
            continue
        if ch in " \t\r":
            i += 1
            col += 1
            continue
        if ch == "#":  # comment to end of line
            while i < n and source[i] != "\n":
                i += 1
            continue

        start_col = col

        if ch == '"':
            j = i + 1
            while j < n and source[j] not in '"\n':
                j += 1
            if j >= n or source[j] != '"':
                raise error("unterminated string")
            tokens.append(Token("STRING", source[i + 1:j], line, start_col))
            col += j - i + 1
            i = j + 1
            continue

        if ch.isdigit() or (ch == "." and i + 1 < n and source[i + 1].isdigit()):
            j = i
            seen_dot = False
            while j < n and (source[j].isdigit() or (source[j] == "." and not seen_dot)):
                seen_dot = seen_dot or source[j] == "."
                j += 1
            tokens.append(Token("NUMBER", source[i:j], line, start_col))
            col += j - i
            i = j
            continue

        if ch.isalpha() or ch == "_":
            j = i
            while j < n and (source[j].isalnum() or source[j] == "_"):
                j += 1
            word = source[i:j]
            kind = "KEYWORD" if word in KEYWORDS else "IDENT"
            tokens.append(Token(kind, word, line, start_col))
            col += j - i
            i = j
            continue

        if source[i:i + 2] in TWO_CHAR_OPS:
            tokens.append(Token("OP", source[i:i + 2], line, start_col))
            i += 2
            col += 2
            continue
        if ch in ONE_CHAR_OPS:
            tokens.append(Token("OP", ch, line, start_col))
            i += 1
            col += 1
            continue
        if ch in PUNCT:
            tokens.append(Token(PUNCT[ch], ch, line, start_col))
            i += 1
            col += 1
            continue

        raise error(f"unexpected character {ch!r}")

    tokens.append(Token("EOF", "", line, col))
    return tokens
