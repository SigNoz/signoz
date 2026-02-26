package units

import "fmt"

type throughputFormatter struct {
}

func NewThroughputFormatter() Formatter {
	return &throughputFormatter{}
}

func (*throughputFormatter) Name() string {
	return "throughput"
}

func simpleCountUnit(value float64, symbol string) string {
	units := []string{"", "K", "M", "B", "T"}
	scaler := scaledUnits(1000, units, 0)

	return scaler(value, nil) + " " + symbol
}

func (f *throughputFormatter) Format(value float64, unit string) string {
	switch unit {
	case "cps", "{count}/s":
		return simpleCountUnit(value, "c/s")
	case "ops", "{ops}/s":
		return simpleCountUnit(value, "op/s")
	case "reqps", "{req}/s":
		return simpleCountUnit(value, "req/s")
	case "rps", "{read}/s":
		return simpleCountUnit(value, "r/s")
	case "wps", "{write}/s":
		return simpleCountUnit(value, "w/s")
	case "iops", "{iops}/s":
		return simpleCountUnit(value, "iops")
	case "cpm", "{count}/min":
		return simpleCountUnit(value, "c/m")
	case "opm", "{ops}/min":
		return simpleCountUnit(value, "op/m")
	case "rpm", "{read}/min":
		return simpleCountUnit(value, "r/m")
	case "wpm", "{write}/min":
		return simpleCountUnit(value, "w/m")
	}
	// When unit is not matched, return the value as it is.
	return fmt.Sprintf("%v", value)
}
