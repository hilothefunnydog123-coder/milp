# Ride 6-month momentum, but stand aside when the market is overheated
# or too volatile. Half size when RSI is merely elevated.
strategy "cautious momentum" {
  when momentum(126) > 0 and rsi(14) > 80        then flat
  when momentum(126) > 0 and volatility(20) > 0.03 then flat
  when momentum(126) > 0 and rsi(14) > 65        then 0.5
  when momentum(126) > 0                          then long
  otherwise flat
}
