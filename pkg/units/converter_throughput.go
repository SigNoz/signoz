package units

// throughputConverter is an implementation of Converter that converts throughput.
type throughputConverter struct {
}

func NewThroughputConverter() Converter {
	return &throughputConverter{}
}

func (*throughputConverter) Name() string {
	return "throughput"
}

// FromThroughputUnit returns how many seconds one unit of the rate spans,
// so per-minute rates can be converted to and from per-second rates.
func FromThroughputUnit(u Unit) float64 {
	switch u {
	case "cpm", "opm", "rpm", "wpm", "{count}/min", "{ops}/min", "{read}/min", "{write}/min":
		return 60
	default:
		return 1
	}
}

func (c *throughputConverter) Convert(v Value, to Unit) Value {
	return Value{
		F: v.F / FromThroughputUnit(v.U) * FromThroughputUnit(to),
		U: to,
	}
}
