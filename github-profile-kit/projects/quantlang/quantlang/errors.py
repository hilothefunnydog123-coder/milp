"""Compiler errors that point at the source, like a language should."""
from __future__ import annotations


class QuantlangError(Exception):
    """Any error with a position in the source program."""

    def __init__(self, message: str, line: int, col: int, source: str = ""):
        self.message = message
        self.line = line
        self.col = col
        self.source = source
        super().__init__(self.render())

    def render(self) -> str:
        out = f"error: {self.message}"
        if self.source:
            lines = self.source.splitlines()
            if 1 <= self.line <= len(lines):
                src_line = lines[self.line - 1]
                gutter = f"  {self.line} | "
                caret_pad = " " * (len(gutter) + self.col - 1)
                out += f"\n{gutter}{src_line}\n{caret_pad}^"
        return out
