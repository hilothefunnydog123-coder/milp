# Buy sharp dips below the 50-day average, exit once price recovers it.
strategy "dip buyer" {
  when price() < sma(50) * 0.95 then long
  when price() > sma(50)        then flat
  otherwise 0.5                 # partially invested while recovering
}
