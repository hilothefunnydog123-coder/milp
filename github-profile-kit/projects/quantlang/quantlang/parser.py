"""Recursive-descent parser: tokens -> AST.

Grammar (EBNF):

    program    := "strategy" STRING "{" rule* otherwise "}"
    rule       := "when" expr "then" action
    otherwise  := "otherwise" action
    action     := "long" | "short" | "flat" | expr
    expr       := and_expr ("or" and_expr)*
    and_expr   := not_expr ("and" not_expr)*
    not_expr   := "not" not_expr | comparison
    comparison := sum ((">" | "<" | ">=" | "<=" | "==" | "!=") sum)?
    sum        := term (("+" | "-") term)*
    term       := unary (("*" | "/") unary)*
    unary      := "-" unary | primary
    primary    := NUMBER | call | "(" expr ")"
    call       := IDENT ["(" [expr ("," expr)*] ")"]
"""
from __future__ import annotations

from dataclasses import dataclass, field

from quantlang.errors import QuantlangError
from quantlang.lexer import Token, tokenize

POSITIONS = {"long": 1.0, "short": -1.0, "flat": 0.0}


# -- AST nodes ---------------------------------------------------------------

@dataclass(frozen=True)
class Number:
    value: float
    line: int = 0
    col: int = 0


@dataclass(frozen=True)
class Call:
    name: str
    args: tuple
    line: int = 0
    col: int = 0


@dataclass(frozen=True)
class BinOp:
    op: str
    left: object
    right: object
    line: int = 0
    col: int = 0


@dataclass(frozen=True)
class Compare:
    op: str
    left: object
    right: object
    line: int = 0
    col: int = 0


@dataclass(frozen=True)
class Logic:
    op: str  # "and" | "or"
    left: object
    right: object
    line: int = 0
    col: int = 0


@dataclass(frozen=True)
class Not:
    operand: object
    line: int = 0
    col: int = 0


@dataclass(frozen=True)
class Neg:
    operand: object
    line: int = 0
    col: int = 0


@dataclass(frozen=True)
class Rule:
    condition: object
    action: object
    line: int = 0


@dataclass(frozen=True)
class Program:
    name: str
    rules: tuple
    otherwise: object
    source: str = field(compare=False, default="")


# -- parser ------------------------------------------------------------------

class Parser:
    def __init__(self, source: str):
        self.source = source
        self.tokens = tokenize(source)
        self.pos = 0

    # helpers ---------------------------------------------------------------

    def peek(self) -> Token:
        return self.tokens[self.pos]

    def advance(self) -> Token:
        token = self.tokens[self.pos]
        if token.type != "EOF":
            self.pos += 1
        return token

    def error(self, message: str, token: Token | None = None) -> QuantlangError:
        token = token or self.peek()
        return QuantlangError(message, token.line, token.col, self.source)

    def expect(self, type_: str, value: str | None = None, hint: str = "") -> Token:
        token = self.peek()
        if token.type != type_ or (value is not None and token.value != value):
            want = value or type_.lower()
            got = repr(token.value) if token.value else "end of input"
            message = f"expected {want!r} but got {got}" if value else \
                f"expected {want} but got {got}"
            if hint:
                message += f" — {hint}"
            raise self.error(message, token)
        return self.advance()

    # grammar ---------------------------------------------------------------

    def parse(self) -> Program:
        self.expect("KEYWORD", "strategy",
                    hint='programs start with: strategy "name" { ... }')
        name = self.expect("STRING", hint='strategy needs a quoted name').value
        self.expect("LBRACE")
        rules = []
        while self.peek().type == "KEYWORD" and self.peek().value == "when":
            rules.append(self.rule())
        self.expect("KEYWORD", "otherwise",
                    hint="every strategy needs a fallback position")
        otherwise = self.action()
        self.expect("RBRACE")
        self.expect("EOF", hint="only one strategy per file")
        return Program(name=name, rules=tuple(rules), otherwise=otherwise,
                       source=self.source)

    def rule(self) -> Rule:
        when = self.expect("KEYWORD", "when")
        condition = self.expr()
        self.expect("KEYWORD", "then", hint="every 'when' needs a 'then'")
        return Rule(condition=condition, action=self.action(), line=when.line)

    def action(self):
        token = self.peek()
        if token.type == "KEYWORD" and token.value in POSITIONS:
            self.advance()
            return Number(POSITIONS[token.value], token.line, token.col)
        return self.expr()

    def expr(self):
        node = self.and_expr()
        while self.peek().type == "KEYWORD" and self.peek().value == "or":
            op = self.advance()
            node = Logic("or", node, self.and_expr(), op.line, op.col)
        return node

    def and_expr(self):
        node = self.not_expr()
        while self.peek().type == "KEYWORD" and self.peek().value == "and":
            op = self.advance()
            node = Logic("and", node, self.not_expr(), op.line, op.col)
        return node

    def not_expr(self):
        if self.peek().type == "KEYWORD" and self.peek().value == "not":
            op = self.advance()
            return Not(self.not_expr(), op.line, op.col)
        return self.comparison()

    def comparison(self):
        node = self.sum()
        if self.peek().type == "OP" and self.peek().value in (">", "<", ">=", "<=", "==", "!="):
            op = self.advance()
            return Compare(op.value, node, self.sum(), op.line, op.col)
        return node

    def sum(self):
        node = self.term()
        while self.peek().type == "OP" and self.peek().value in ("+", "-"):
            op = self.advance()
            node = BinOp(op.value, node, self.term(), op.line, op.col)
        return node

    def term(self):
        node = self.unary()
        while self.peek().type == "OP" and self.peek().value in ("*", "/"):
            op = self.advance()
            node = BinOp(op.value, node, self.unary(), op.line, op.col)
        return node

    def unary(self):
        if self.peek().type == "OP" and self.peek().value == "-":
            op = self.advance()
            return Neg(self.unary(), op.line, op.col)
        return self.primary()

    def primary(self):
        token = self.peek()
        if token.type == "NUMBER":
            self.advance()
            return Number(float(token.value), token.line, token.col)
        if token.type == "IDENT":
            return self.call()
        if token.type == "LPAREN":
            self.advance()
            node = self.expr()
            self.expect("RPAREN", hint="unclosed parenthesis")
            return node
        got = repr(token.value) if token.value else "end of input"
        raise self.error(
            f"expected a number, indicator, or '(' but got {got}", token)

    def call(self):
        name_token = self.expect("IDENT")
        args: list = []
        if self.peek().type == "LPAREN":
            self.advance()
            if self.peek().type != "RPAREN":
                args.append(self.expr())
                while self.peek().type == "COMMA":
                    self.advance()
                    args.append(self.expr())
            self.expect("RPAREN", hint="unclosed argument list")
        return Call(name_token.value, tuple(args), name_token.line, name_token.col)


def parse(source: str) -> Program:
    return Parser(source).parse()
