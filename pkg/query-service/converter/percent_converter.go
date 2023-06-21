package converter

// percentConverter is a converter for percent unit
type percentConverter struct{}

func NewPercentConverter() Converter {
	return &percentConverter{}
}

func (*percentConverter) Name() string {
	return "percent"
}

func FromPercentUnit(u Unit) float64 {
	switch u {
	case "percent":
		return 1
	case "percentunit":
		return 100
	default:
		return 1
	}
}

func (c *percentConverter) Convert(v Value, to Unit) Value {
	return Value{
		F: v.F * FromPercentUnit(v.U) / FromPercentUnit(to),
		U: to,
	}
}
