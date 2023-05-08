package formatter

import (
	"fmt"
	"math"
	"strconv"
	"strings"
	"time"

	"github.com/dustin/go-humanize"
	"github.com/samber/lo"
)

type IntervalsInSecondsType map[Interval]int

type Interval string

const (
	Year        Interval = "year"
	Month       Interval = "month"
	Week        Interval = "week"
	Day         Interval = "day"
	Hour        Interval = "hour"
	Minute      Interval = "minute"
	Second      Interval = "second"
	Millisecond Interval = "millisecond"
)

var Units = []Interval{
	Year,
	Month,
	Week,
	Day,
	Hour,
	Minute,
	Second,
	Millisecond,
}

var IntervalsInSeconds = IntervalsInSecondsType{
	Year:        31536000,
	Month:       2592000,
	Week:        604800,
	Day:         86400,
	Hour:        3600,
	Minute:      60,
	Second:      1,
	Millisecond: 1,
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
	precision := 0
	if decimalPos != -1 {
		precision = len(formatted) - decimalPos - 1
	}

	if precision < *decimals {
		return formatted + strings.Repeat("0", *decimals-precision)
	}

	return formatted
}

func toFixedScaled(value float64, decimals DecimalCount, scaleFormat string) string {
	return toFixed(value, decimals) + " " + scaleFormat
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

func toNanoSeconds(value float64, decimals DecimalCount) string {
	absvalue := math.Abs(value)

	if absvalue < 1000 {
		return toFixed(value, decimals) + " ns"
	} else if absvalue < 1000000 {
		return toFixedScaled(value/1000, decimals, " µs")
	} else if absvalue < 1000000000 {
		return toFixedScaled(value/1000000, decimals, " ms")
	} else if absvalue < 60000000000 {
		return toFixedScaled(value/1000000000, decimals, " s")
	} else if absvalue < 3600000000000 {
		return toFixedScaled(value/60000000000, decimals, " min")
	} else if absvalue < 86400000000000 {
		return toFixedScaled(value/3600000000000, decimals, " hour")
	} else {
		return toFixedScaled(value/86400000000000, decimals, " day")
	}
}

func toMicroSeconds(value float64, decimals DecimalCount) string {
	absvalue := math.Abs(value)
	if absvalue < 1000 {
		return toFixed(value, decimals) + " µs"
	} else if absvalue < 1000000 {
		return toFixedScaled(value/1000, decimals, " ms")
	} else {
		return toFixedScaled(value/1000000, decimals, " s")
	}
}

func toMilliSeconds(value float64, decimals DecimalCount) string {

	absvalue := math.Abs(value)

	if absvalue < 1000 {
		return toFixed(value, decimals) + " ms"
	} else if absvalue < 60000 {
		return toFixedScaled(value/1000, decimals, " s")
	} else if absvalue < 3600000 {
		return toFixedScaled(value/60000, decimals, " min")
	} else if absvalue < 86400000 {
		return toFixedScaled(value/3600000, decimals, " hour")
	} else if absvalue < 31536000000 {
		return toFixedScaled(value/86400000, decimals, " day")
	}

	return toFixedScaled(value/31536000000, decimals, " year")
}

func toSeconds(value float64, decimals DecimalCount) string {

	absvalue := math.Abs(value)

	if absvalue < 0.000001 {
		return toFixedScaled(value*1e9, decimals, " ns")
	} else if absvalue < 0.001 {
		return toFixedScaled(value*1e6, decimals, " µs")
	} else if absvalue < 1 {
		return toFixedScaled(value*1e3, decimals, " ms")
	} else if absvalue < 60 {
		return toFixed(value, decimals) + " s"
	} else if absvalue < 3600 {
		return toFixedScaled(value/60, decimals, " min")
	} else if absvalue < 86400 {
		return toFixedScaled(value/3600, decimals, " hour")
	} else if absvalue < 604800 {
		return toFixedScaled(value/86400, decimals, " day")
	} else if absvalue < 31536000 {
		return toFixedScaled(value/604800, decimals, " week")
	}

	return toFixedScaled(value/3.15569e7, decimals, " year")
}

func toMinutes(value float64, decimals DecimalCount) string {

	absvalue := math.Abs(value)

	if absvalue < 60 {
		return toFixed(value, decimals) + " min"
	} else if absvalue < 1440 {
		return toFixedScaled(value/60, decimals, " hour")
	} else if absvalue < 10080 {
		return toFixedScaled(value/1440, decimals, " day")
	} else if absvalue < 604800 {
		return toFixedScaled(value/10080, decimals, " week")
	} else {
		return toFixedScaled(value/5.25948e5, decimals, " year")
	}
}

func toHours(value float64, decimals DecimalCount) string {

	absvalue := math.Abs(value)

	if absvalue < 24 {
		return toFixed(value, decimals) + " hour"
	} else if absvalue < 168 {
		return toFixedScaled(value/24, decimals, " day")
	} else if absvalue < 8760 {
		return toFixedScaled(value/168, decimals, " week")
	} else {
		return toFixedScaled(value/8760, decimals, " year")
	}
}

func toDays(value float64, decimals DecimalCount) string {

	absvalue := math.Abs(value)

	if absvalue < 7 {
		return toFixed(value, decimals) + " day"
	} else if absvalue < 365 {
		return toFixedScaled(value/7, decimals, " week")
	} else {
		return toFixedScaled(value/365, decimals, " year")
	}
}

func toDuration(value float64, decimals int, timeScale Interval) string {

	if value < 0 {
		return toDuration(-value, decimals, timeScale) + " ago"
	}

	// Convert value to milliseconds
	value *= float64(IntervalsInSeconds[timeScale] * 1000)

	parts := []string{}

	// After first value >= 1 print only decimals more
	decrementDecimals := false
	decimalsCount := decimals

	if decimals == 0 {
		decimalsCount = -1 // Disable decimals
	}

	for i := 0; i < len(Units) && decimalsCount >= 0; i++ {
		interval := float64(IntervalsInSeconds[Units[i]] * 1000)
		value = value / interval
		if value >= 1 || decrementDecimals {
			decrementDecimals = true
			floor := int(math.Floor(value))
			unit := Units[i]
			if floor != 1 {
				unit += "s"
			}
			parts = append(parts, fmt.Sprintf("%d %s", floor, unit))
			value = math.Mod(value, interval)
			decimalsCount--
		}
	}

	return strings.Join(parts, ", ")
}

func toUtc(value float64) time.Time {
	return time.Unix(0, int64(value)).UTC()
}

func toClock(value float64, decimals int) string {
	if value < 1000 {
		return toUtc(value).Format("SSS\\m\\s")
	}

	if value < 60000 {
		format := "ss\\s:SSS\\m\\s"
		if decimals == 0 {
			format = "ss\\s"
		}
		return toUtc(value).Format(format)
	}

	if value < 3600000 {
		format := "mm\\m:ss\\s:SSS\\m\\s"
		if decimals == 0 {
			format = "mm\\m"
		} else if decimals == 1 {
			format = "mm\\m:ss\\s"
		}
		return toUtc(value).Format(format)
	}

	format := "mm\\m:ss\\s:SSS\\m\\s"

	hours := fmt.Sprintf("%02dh", int(math.Floor(time.Duration(value*float64(time.Microsecond)).Hours())))

	if decimals == 0 {
		format = ""
	} else if decimals == 1 {
		format = "mm\\m"
	} else if decimals == 2 {
		format = "mm\\m:ss\\s"
	}

	text := hours
	if format != "" {
		text += ":" + toUtc(value).Format(format)
	}
	return text
}

func toDurationInMilliseconds(value float64, decimals int) string {
	return toDuration(value, decimals, Millisecond)
}

func toDurationInSeconds(value float64, decimals int) string {
	return toDuration(value, decimals, Second)
}

func toDurationInHoursMinutesSeconds(value int64) string {
	if value < 0 {
		return toDurationInHoursMinutesSeconds(-value) + " ago"
	}
	var parts []string
	numHours := value / 3600
	numMinutes := (value % 3600) / 60
	numSeconds := (value % 3600) % 60
	if numHours > 9 {
		parts = append(parts, strconv.Itoa(int(numHours)))
	} else {
		parts = append(parts, "0"+strconv.Itoa(int(numHours)))
	}
	if numMinutes > 9 {
		parts = append(parts, strconv.Itoa(int(numMinutes)))
	} else {
		parts = append(parts, "0"+strconv.Itoa(int(numMinutes)))
	}
	if numSeconds > 9 {
		parts = append(parts, strconv.Itoa(int(numSeconds)))
	} else {
		parts = append(parts, "0"+strconv.Itoa(int(numSeconds)))
	}
	return strings.Join(parts, ":")
}

func toDurationInDaysHoursMinutesSeconds(value int64) string {
	if value < 0 {
		return toDurationInDaysHoursMinutesSeconds(-value) + " ago"
	}
	var dayString string
	numDays := value / (24 * 3600)
	if numDays > 0 {
		dayString = strconv.Itoa(int(numDays)) + " d "
	}
	hmsString := toDurationInHoursMinutesSeconds(value - numDays*24*3600)
	return dayString + hmsString
}

func toTimeTicks(value float64, decimals DecimalCount) string {
	return toSeconds(value/100, decimals)
}

func toClockMilliseconds(value float64, decimals DecimalCount) string {
	return toClock(value, *decimals)
}

func toClockSeconds(value float64, decimals DecimalCount) string {
	return toClock(value*1000, *decimals)
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

func simpleCountUnit(value float64, decimals *int, symbol string) string {
	units := []string{"", "K", "M", "B", "T"}
	scaler := scaledUnits(1000, units, 0)

	return scaler(value, decimals) + symbol
}

func toPercent(value float64, decimals DecimalCount) string {
	return toFixed(value, decimals) + "%"
}

func toPercentUnit(value float64, decimals DecimalCount) string {
	return toFixed(value*100, decimals) + "%"
}

func toBool(value float64) string {
	if value == 0 {
		return "false"
	}
	return "true"
}

func toBoolYesNo(value float64) string {
	if value == 0 {
		return "no"
	}
	return "yes"
}

func toBoolOnOff(value float64) string {
	if value == 0 {
		return "off"
	}
	return "on"
}

// Humanize returns a human readable value based on the format string
func Humanize(value float64, format string) string {
	switch format {
	// Data
	case "bytes":
		return humanize.IBytes(uint64(value))
	case "decbytes":
		return humanize.Bytes(uint64(value))
	case "bits":
		return humanize.IBytes(uint64(value * 8))
	case "decbits":
		return humanize.Bytes(uint64(value * 8))
	case "kbytes":
		return humanize.IBytes(uint64(value * 1024))
	case "deckbytes":
		return humanize.IBytes(uint64(value * 1000))
	case "mbytes":
		return humanize.IBytes(uint64(value * 1024 * 1024))
	case "decmbytes":
		return humanize.Bytes(uint64(value * 1000 * 1000))
	case "gbytes":
		return humanize.IBytes(uint64(value * 1024 * 1024 * 1024))
	case "decgbytes":
		return humanize.Bytes(uint64(value * 1000 * 1000 * 1000))
	case "tbytes":
		return humanize.IBytes(uint64(value * 1024 * 1024 * 1024 * 1024))
	case "dectbytes":
		return humanize.Bytes(uint64(value * 1000 * 1000 * 1000 * 1000))
	case "pbytes":
		return humanize.IBytes(uint64(value * 1024 * 1024 * 1024 * 1024 * 1024))
	case "decpbytes":
		return humanize.Bytes(uint64(value * 1000 * 1000 * 1000 * 1000 * 1000))
	// Data Rate
	case "binBps":
		return humanize.IBytes(uint64(value)) + "/s"
	case "Bps":
		return humanize.Bytes(uint64(value)) + "/s"
	case "binbps":
		return humanize.IBytes(uint64(value*8)) + "/s"
	case "bps":
		return humanize.Bytes(uint64(value*8)) + "/s"
	case "KiBs":
		return humanize.IBytes(uint64(value*1024)) + "/s"
	case "Kibits":
		return humanize.IBytes(uint64(value*1024*8)) + "/s"
	case "KBs":
		return humanize.IBytes(uint64(value*1000)) + "/s"
	case "Kbits":
		return humanize.IBytes(uint64(value*1000*8)) + "/s"
	case "MiBs":
		return humanize.IBytes(uint64(value*1024*1024)) + "/s"
	case "Mibits":
		return humanize.IBytes(uint64(value*1024*1024*8)) + "/s"
	case "MBs":
		return humanize.IBytes(uint64(value*1000*1000)) + "/s"
	case "Mbits":
		return humanize.IBytes(uint64(value*1000*1000*8)) + "/s"
	case "GiBs":
		return humanize.IBytes(uint64(value*1024*1024*1024)) + "/s"
	case "Gibits":
		return humanize.IBytes(uint64(value*1024*1024*1024*8)) + "/s"
	case "GBs":
		return humanize.IBytes(uint64(value*1000*1000*1000)) + "/s"
	case "Gbits":
		return humanize.IBytes(uint64(value*1000*1000*1000*8)) + "/s"
	case "TiBs":
		return humanize.IBytes(uint64(value*1024*1024*1024*1024)) + "/s"
	case "Tibits":
		return humanize.IBytes(uint64(value*1024*1024*1024*1024*8)) + "/s"
	case "TBs":
		return humanize.IBytes(uint64(value*1000*1000*1000*1000)) + "/s"
	case "Tbits":
		return humanize.IBytes(uint64(value*1000*1000*1000*1000*8)) + "/s"
	case "PiBs":
		return humanize.IBytes(uint64(value*1024*1024*1024*1024*1024)) + "/s"
	case "Pibits":
		return humanize.IBytes(uint64(value*1024*1024*1024*1024*1024*8)) + "/s"
	case "PBs":
		return humanize.IBytes(uint64(value*1000*1000*1000*1000*1000)) + "/s"
	case "Pbits":
		return humanize.IBytes(uint64(value*1000*1000*1000*1000*1000*8)) + "/s"
	// Time
	case "ns":
		return toNanoSeconds(value, nil)
	case "us":
		return toMicroSeconds(value, nil)
	case "ms":
		return toMilliSeconds(value, nil)
	case "s":
		return toSeconds(value, nil)
	case "m":
		return toMinutes(value, nil)
	case "h":
		return toHours(value, nil)
	case "d":
		return toDays(value, nil)
	case "dtdurationms":
		return toDurationInMilliseconds(value, 0)
	case "dtdurations":
		return toDurationInSeconds(value, 0)
	case "dthms":
		return toDurationInHoursMinutesSeconds(int64(value))
	case "dtdhms":
		return toDurationInDaysHoursMinutesSeconds(int64(value))
	case "timeticks":
		return toTimeTicks(value, nil)
	case "clockms":
		return toClockMilliseconds(value, nil)
	case "clocks":
		return toClockSeconds(value, nil)
	// Throughput
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
	// Misc
	case "percent":
		return toPercent(value, nil)
	case "percentunit":
		return toPercentUnit(value, nil)
	// Bool
	case "bool":
		return toBool(value)
	case "bool_yes_no":
		return toBoolYesNo(value)
	case "bool_on_off":
		return toBoolOnOff(value)
	}
	return fmt.Sprintf("%v", value)
}
