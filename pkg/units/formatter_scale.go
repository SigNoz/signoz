package units

import (
	"fmt"
	"math"
	"strconv"
	"strings"

	"github.com/samber/lo"
)

type IntervalsInSecondsType map[Interval]int

type Interval string

const (
	IntervalYear        Interval = "year"
	IntervalMonth       Interval = "month"
	IntervalWeek        Interval = "week"
	IntervalDay         Interval = "day"
	IntervalHour        Interval = "hour"
	IntervalMinute      Interval = "minute"
	IntervalSecond      Interval = "second"
	IntervalMillisecond Interval = "millisecond"
)

var Units = []Interval{
	IntervalYear,
	IntervalMonth,
	IntervalWeek,
	IntervalDay,
	IntervalHour,
	IntervalMinute,
	IntervalSecond,
	IntervalMillisecond,
}

var IntervalsInSeconds = IntervalsInSecondsType{
	IntervalYear:        31536000,
	IntervalMonth:       2592000,
	IntervalWeek:        604800,
	IntervalDay:         86400,
	IntervalHour:        3600,
	IntervalMinute:      60,
	IntervalSecond:      1,
	IntervalMillisecond: 1,
}

type DecimalCount *int

func toFixed(value float64, decimals DecimalCount) string {
	if value == 0 {
		return strconv.FormatFloat(value, 'f', getDecimalsForValue(value), 64)
	}

	if math.IsInf(value, 0) {
		return strconv.FormatFloat(value, 'f', -1, 64)
	}

	if decimals == nil {
		count := getDecimalsForValue(value)
		decimals = &count
	}

	factor := math.Pow(10, math.Max(0, float64(*decimals)))
	formatted := strconv.FormatFloat(math.Round(value*factor)/factor, 'f', -1, 64)

	if formatted == "NaN" {
		return ""
	}

	if formatted == "-0" {
		formatted = "0"
	}

	if value == 0 || strings.Contains(formatted, "e") {
		return formatted
	}

	decimalPos := strings.Index(formatted, ".")
	if decimalPos != -1 {
		precision := len(formatted) - decimalPos - 1
		if precision < *decimals {
			return formatted + strings.Repeat("0", *decimals-precision)
		}
	}

	return formatted
}

func toFixedScaled(value float64, scaleFormat string) string {
	return toFixed(value, nil) + scaleFormat
}

func getDecimalsForValue(value float64) int {
	absValue := math.Abs(value)
	log10 := math.Floor(math.Log10(absValue))
	dec := int(-log10 + 1)
	magn := math.Pow10(-dec)
	norm := absValue / magn

	if norm > 2.25 {
		dec++
	}

	if math.Mod(value, 1) == 0 {
		dec = 0
	}

	return int(math.Max(float64(dec), 0))
}

type ValueFormatter func(value float64, decimals *int) string

func logb(base, x float64) float64 {
	return math.Log10(x) / math.Log10(base)
}

func scaledUnits(factor float64, extArray []string, offset int) ValueFormatter {
	return func(value float64, decimals *int) string {
		if value == 0 || math.IsNaN(value) || math.IsInf(value, 0) {
			return fmt.Sprintf("%f", value)
		}

		siIndex := int(math.Floor(logb(factor, math.Abs(value))))
		if value < 0 {
			siIndex = -siIndex
		}
		siIndex = lo.Clamp(siIndex+offset, 0, len(extArray)-1)

		suffix := extArray[siIndex]

		return toFixed(value/math.Pow(factor, float64(siIndex-offset)), decimals) + suffix
	}
}
