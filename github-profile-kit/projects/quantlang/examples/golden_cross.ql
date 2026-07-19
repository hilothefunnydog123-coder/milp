# The classic trend filter: long when the fast average is above the slow.
strategy "golden cross" {
  when sma(20) > sma(100) then long
  otherwise flat
}
