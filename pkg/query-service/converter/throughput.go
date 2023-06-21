package converter

// throughputConverter is an implementation of Converter that converts throughput
type throughputConverter struct {
}

func NewThroughputConverter() Converter {
	return &throughputConverter{}
}

func (*throughputConverter) Name() string {
	return "throughput"
}

func (c *throughputConverter) Convert(v Value, to Unit) Value {
	// There is no conversion to be done for throughput
	return Value{
		F: v.F,
		U: to,
	}
}
