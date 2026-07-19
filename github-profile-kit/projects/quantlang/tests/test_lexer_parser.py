import pytest

from quantlang import QuantlangError, parse, tokenize
from quantlang.parser import Compare, Logic, BinOp, Number, Call


GOLDEN = '''
strategy "golden cross" {
  when sma(20) > sma(100) then long
  otherwise flat
}
'''


def test_tokenizer_produces_positions():
    tokens = tokenize('when sma(20) > 1.5 # comment\nthen')
    types = [(t.type, t.value) for t in tokens]
    assert types == [
        ("KEYWORD", "when"), ("IDENT", "sma"), ("LPAREN", "("),
        ("NUMBER", "20"), ("RPAREN", ")"), ("OP", ">"), ("NUMBER", "1.5"),
        ("KEYWORD", "then"), ("EOF", ""),
    ]
    assert tokens[0].line == 1 and tokens[0].col == 1
    assert tokens[-2].line == 2 and tokens[-2].col == 1  # 'then' after newline


def test_two_char_operators_lex_as_one_token():
    values = [t.value for t in tokenize("a >= b <= c == d != e")]
    assert ">=" in values and "<=" in values and "==" in values and "!=" in values


def test_unexpected_character_reports_position():
    with pytest.raises(QuantlangError) as err:
        tokenize("when sma(20) $ 3")
    assert err.value.line == 1 and err.value.col == 14
    assert "^" in err.value.render()


def test_unterminated_string():
    with pytest.raises(QuantlangError, match="unterminated string"):
        tokenize('strategy "oops {')


def test_parse_golden_cross_structure():
    program = parse(GOLDEN)
    assert program.name == "golden cross"
    assert len(program.rules) == 1
    condition = program.rules[0].condition
    assert isinstance(condition, Compare) and condition.op == ">"
    assert isinstance(condition.left, Call) and condition.left.name == "sma"
    assert isinstance(program.rules[0].action, Number)
    assert program.rules[0].action.value == 1.0   # 'long'
    assert isinstance(program.otherwise, Number)
    assert program.otherwise.value == 0.0         # 'flat'


def test_precedence_arithmetic_before_comparison_before_logic():
    program = parse('''strategy "p" {
      when price() + 2 * 3 > 10 and not momentum(5) < 0 then long
      otherwise flat
    }''')
    condition = program.rules[0].condition
    assert isinstance(condition, Logic) and condition.op == "and"
    left = condition.left
    assert isinstance(left, Compare)
    assert isinstance(left.left, BinOp) and left.left.op == "+"
    assert isinstance(left.left.right, BinOp) and left.left.right.op == "*"


def test_missing_then_points_at_the_right_place():
    source = 'strategy "x" {\n  when sma(20) > sma(100) long\n  otherwise flat\n}'
    with pytest.raises(QuantlangError) as err:
        parse(source)
    assert "'then'" in str(err.value)
    assert err.value.line == 2
    rendered = err.value.render()
    assert "when sma(20) > sma(100) long" in rendered and "^" in rendered


def test_missing_otherwise_is_required():
    with pytest.raises(QuantlangError, match="otherwise"):
        parse('strategy "x" { when price() > 0 then long }')


def test_unclosed_paren():
    with pytest.raises(QuantlangError, match="unclosed"):
        parse('strategy "x" { when sma(20 > 3 then long otherwise flat }')


def test_only_one_strategy_per_file():
    with pytest.raises(QuantlangError, match="one strategy"):
        parse(GOLDEN + '\nstrategy "second" { otherwise flat }')
