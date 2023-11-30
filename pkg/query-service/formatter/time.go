package formatter

import (
	"fmt"
	"math"
)

type durationFormatter struct {
}

func NewDurationFormatter() Formatter {
	return &durationFormatter{}
}

func (*durationFormatter) Name() string {
	return "duration"
}

func (f *durationFormatter) Format(value float64, unit string) string {
	switch unit {
	case "ns":
		return toNanoSeconds(value)
	case "µs", "us":
		return toMicroSeconds(value)
	case "ms":
		return toMilliSeconds(value)
	case "s":
		return toSeconds(value)
	case "m":
		return toMinutes(value)
	case "h":
		return toHours(value)
	case "d":
		return toDays(value)
	case "w":
		return toWeeks(value)
	}
	// When unit is not matched, return the value as it is.
	return fmt.Sprintf("%v", value)
}

// toNanoSeconds returns a easy to read string representation of the given value in nanoseconds
func toNanoSeconds(value float64) string {
	absValue := math.Abs(value)

	if absValue < 1000 {
		return toFixed(value, nil) + " ns"
	} else if absValue < 1000000 { // 2000 ns is better represented as 2 µs
		return toFixedScaled(value/1000, nil, " µs")
	} else if absValue < 1000000000 { // 2000000 ns is better represented as 2 ms
		return toFixedScaled(value/1000000, nil, " ms")
	} else if absValue < 60000000000 {
		return toFixedScaled(value/1000000000, nil, " s")
	} else if absValue < 3600000000000 {
		return toFixedScaled(value/60000000000, nil, " min")
	} else if absValue < 86400000000000 {
		return toFixedScaled(value/3600000000000, nil, " hour")
	} else {
		return toFixedScaled(value/86400000000000, nil, " day")
	}
}

// toMicroSeconds returns a easy to read string representation of the given value in microseconds
func toMicroSeconds(value float64) string {
	absValue := math.Abs(value)
	if absValue < 1000 {
		return toFixed(value, nil) + " µs"
	} else if absValue < 1000000 { // 2000 µs is better represented as 2 ms
		return toFixedScaled(value/1000, nil, " ms")
	} else {
		return toFixedScaled(value/1000000, nil, " s")
	}
}

// toMilliSeconds returns a easy to read string representation of the given value in milliseconds
func toMilliSeconds(value float64) string {

	absValue := math.Abs(value)

	if absValue < 1000 {
		return toFixed(value, nil) + " ms"
	} else if absValue < 60000 {
		return toFixedScaled(value/1000, nil, " s")
	} else if absValue < 3600000 {
		return toFixedScaled(value/60000, nil, " min")
	} else if absValue < 86400000 { // 172800000 ms is better represented as 2 day
		return toFixedScaled(value/3600000, nil, " hour")
	} else if absValue < 31536000000 {
		return toFixedScaled(value/86400000, nil, " day")
	}

	return toFixedScaled(value/31536000000, nil, " year")
}

// toSeconds returns a easy to read string representation of the given value in seconds
func toSeconds(value float64) string {
	absValue := math.Abs(value)

	if absValue < 0.000001 {
		return toFixedScaled(value*1e9, nil, " ns")
	} else if absValue < 0.001 {
		return toFixedScaled(value*1e6, nil, " µs")
	} else if absValue < 1 {
		return toFixedScaled(value*1e3, nil, " ms")
	} else if absValue < 60 {
		return toFixed(value, nil) + " s"
	} else if absValue < 3600 {
		return toFixedScaled(value/60, nil, " min")
	} else if absValue < 86400 { // 56000 s is better represented as 15.56 hour
		return toFixedScaled(value/3600, nil, " hour")
	} else if absValue < 604800 {
		return toFixedScaled(value/86400, nil, " day")
	} else if absValue < 31536000 {
		return toFixedScaled(value/604800, nil, " week")
	}

	return toFixedScaled(value/3.15569e7, nil, " year")
}

// toMinutes returns a easy to read string representation of the given value in minutes
func toMinutes(value float64) string {
	absValue := math.Abs(value)

	if absValue < 60 {
		return toFixed(value, nil) + " min"
	} else if absValue < 1440 {
		return toFixedScaled(value/60, nil, " hour")
	} else if absValue < 10080 {
		return toFixedScaled(value/1440, nil, " day")
	} else if absValue < 604800 {
		return toFixedScaled(value/10080, nil, " week")
	} else {
		return toFixedScaled(value/5.25948e5, nil, " year")
	}
}

// toHours returns a easy to read string representation of the given value in hours
func toHours(value float64) string {

	absValue := math.Abs(value)

	if absValue < 24 {
		return toFixed(value, nil) + " hour"
	} else if absValue < 168 {
		return toFixedScaled(value/24, nil, " day")
	} else if absValue < 8760 {
		return toFixedScaled(value/168, nil, " week")
	} else {
		return toFixedScaled(value/8760, nil, " year")
	}
}

// toDays returns a easy to read string representation of the given value in days
func toDays(value float64) string {
	absValue := math.Abs(value)

	if absValue < 7 {
		return toFixed(value, nil) + " day"
	} else if absValue < 365 {
		return toFixedScaled(value/7, nil, " week")
	} else {
		return toFixedScaled(value/365, nil, " year")
	}
}

// toWeeks returns a easy to read string representation of the given value in weeks
func toWeeks(value float64) string {
	absValue := math.Abs(value)

	if absValue < 52 {
		return toFixed(value, nil) + " week"
	} else {
		return toFixedScaled(value/52, nil, " year")
	}
}
