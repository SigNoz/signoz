package converter

type throughputConverter struct {
}

func NewThroughputConverter() Converter {
	return &throughputConverter{}
}

func (c *throughputConverter) Convert(v Value, to Unit) Value {
	// There is no conversion to be done for throughput
	return Value{
		F: v.F,
		U: to,
	}
}
