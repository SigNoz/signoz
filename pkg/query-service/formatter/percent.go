package formatter

import "fmt"

type percentFormatter struct{}

func NewPercentFormatter() Formatter {
	return &percentFormatter{}
}

func (*percentFormatter) Name() string {
	return "percent"
}

func toPercent(value float64, decimals DecimalCount) string {
	return toFixed(value, decimals) + "%"
}

func toPercentUnit(value float64, decimals DecimalCount) string {
	return toFixed(value*100, decimals) + "%"
}

func (f *percentFormatter) Format(value float64, unit string) string {
	switch unit {
	case "percent":
		return toPercent(value, nil)
	case "percentunit":
		return toPercentUnit(value, nil)
	}
	// When unit is not matched, return the value as it is.
	return fmt.Sprintf("%v", value)
}
