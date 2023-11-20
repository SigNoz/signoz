package converter

// boolConverter is a Converter implementation for bool
type boolConverter struct{}

func NewBoolConverter() Converter {
	return &boolConverter{}
}

func (*boolConverter) Name() string {
	return "bool"
}

func (c *boolConverter) Convert(v Value, to Unit) Value {
	// There is no conversion to be done for bool
	return Value{
		F: v.F,
		U: to,
	}
}
