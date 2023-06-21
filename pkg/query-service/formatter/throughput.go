package formatter

import "fmt"

type throughputFormatter struct {
}

func NewThroughputFormatter() Formatter {
	return &throughputFormatter{}
}

func (*throughputFormatter) Name() string {
	return "throughput"
}

func simpleCountUnit(value float64, decimals *int, symbol string) string {
	units := []string{"", "K", "M", "B", "T"}
	scaler := scaledUnits(1000, units, 0)

	return scaler(value, decimals) + " " + symbol
}

func (f *throughputFormatter) Format(value float64, unit string) string {
	switch unit {
	case "cps":
		return simpleCountUnit(value, nil, "c/s")
	case "ops":
		return simpleCountUnit(value, nil, "op/s")
	case "reqps":
		return simpleCountUnit(value, nil, "req/s")
	case "rps":
		return simpleCountUnit(value, nil, "r/s")
	case "wps":
		return simpleCountUnit(value, nil, "w/s")
	case "iops":
		return simpleCountUnit(value, nil, "iops")
	case "cpm":
		return simpleCountUnit(value, nil, "c/m")
	case "opm":
		return simpleCountUnit(value, nil, "op/m")
	case "rpm":
		return simpleCountUnit(value, nil, "r/m")
	case "wpm":
		return simpleCountUnit(value, nil, "w/m")
	}
	// When unit is not matched, return the value as it is.
	return fmt.Sprintf("%v", value)
}
