package scalarstate

func init() {
	Register(countAgg{})
	Register(sumAgg{})
	Register(avgAgg{})
	Register(minAgg{})
	Register(maxAgg{})
	Register(varPopAgg{})
	Register(varSampAgg{})
	Register(stddevPopAgg{})
	Register(stddevSampAgg{})
}
