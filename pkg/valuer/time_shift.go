package valuer

import (
	"encoding/json"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
)

var (
	timeShiftAgoSuffixPattern = regexp.MustCompile(`\s+ago$`)
	timeShiftTextPattern      = regexp.MustCompile(`^(?:(a|an)\s+)?([+-]?\d+(?:\.\d+)?)?\s*([a-z]+)$`)
	timeShiftTextUnits        = map[string]time.Duration{
		"s":       time.Second,
		"sec":     time.Second,
		"secs":    time.Second,
		"second":  time.Second,
		"seconds": time.Second,
		"m":       time.Minute,
		"min":     time.Minute,
		"mins":    time.Minute,
		"minute":  time.Minute,
		"minutes": time.Minute,
		"h":       time.Hour,
		"hr":      time.Hour,
		"hrs":     time.Hour,
		"hour":    time.Hour,
		"hours":   time.Hour,
		"d":       24 * time.Hour,
		"day":     24 * time.Hour,
		"days":    24 * time.Hour,
		"w":       7 * 24 * time.Hour,
		"week":    7 * 24 * time.Hour,
		"weeks":   7 * 24 * time.Hour,
	}
)

// ParseTimeShiftSeconds parses a timeShift value as a floating-point second count.
// It accepts raw numeric seconds as well as user-friendly text like "5m",
// "1.5h", "hour ago", "1 day ago", and "1 week".
func ParseTimeShiftSeconds(value any) (float64, error) {
	switch v := value.(type) {
	case float64:
		return v, nil
	case float32:
		return float64(v), nil
	case int64:
		return float64(v), nil
	case int32:
		return float64(v), nil
	case int:
		return float64(v), nil
	case json.Number:
		return v.Float64()
	case string:
		return parseTimeShiftString(v)
	default:
		return 0, errors.NewInvalidInputf(
			errors.CodeInvalidInput,
			"invalid time shift value type %T",
			value,
		)
	}
}

func parseTimeShiftString(input string) (float64, error) {
	normalized := strings.ToLower(strings.TrimSpace(input))
	if normalized == "" {
		return 0, errors.NewInvalidInputf(
			errors.CodeInvalidInput,
			"time shift value cannot be empty",
		)
	}

	hasAgoSuffix := timeShiftAgoSuffixPattern.MatchString(normalized)
	if hasAgoSuffix {
		normalized = strings.TrimSpace(timeShiftAgoSuffixPattern.ReplaceAllString(normalized, ""))
	}

	if shiftSeconds, err := strconv.ParseFloat(normalized, 64); err == nil {
		if hasAgoSuffix && shiftSeconds < 0 {
			return 0, errors.NewInvalidInputf(
				errors.CodeInvalidInput,
				"time shift value %q cannot be negative when using \"ago\"",
				input,
			)
		}
		return shiftSeconds, nil
	}

	if duration, err := time.ParseDuration(strings.ReplaceAll(normalized, " ", "")); err == nil {
		return durationToSeconds(input, duration, hasAgoSuffix)
	}

	duration, err := parseTimeShiftTextDuration(normalized)
	if err != nil {
		return 0, errors.NewInvalidInputf(
			errors.CodeInvalidInput,
			"invalid time shift value %q",
			input,
		)
	}

	return durationToSeconds(input, duration, hasAgoSuffix)
}

func parseTimeShiftTextDuration(input string) (time.Duration, error) {
	matches := timeShiftTextPattern.FindStringSubmatch(input)
	if matches == nil {
		return 0, errors.NewInvalidInputf(
			errors.CodeInvalidInput,
			"invalid time shift value %q",
			input,
		)
	}

	quantityText := matches[2]
	unitText := matches[3]

	if quantityText == "" {
		quantityText = "1"
	}

	quantity, err := strconv.ParseFloat(quantityText, 64)
	if err != nil {
		return 0, errors.NewInvalidInputf(
			errors.CodeInvalidInput,
			"invalid time shift quantity %q",
			quantityText,
		)
	}

	unit, ok := timeShiftTextUnits[unitText]
	if !ok {
		return 0, errors.NewInvalidInputf(
			errors.CodeInvalidInput,
			"invalid time shift unit %q",
			unitText,
		)
	}

	return time.Duration(quantity * float64(unit)), nil
}

func durationToSeconds(input string, duration time.Duration, hasAgoSuffix bool) (float64, error) {
	if hasAgoSuffix && duration < 0 {
		return 0, errors.NewInvalidInputf(
			errors.CodeInvalidInput,
			"time shift value %q cannot be negative when using \"ago\"",
			input,
		)
	}

	if duration%time.Second != 0 {
		return 0, errors.NewInvalidInputf(
			errors.CodeInvalidInput,
			"time shift value %q must resolve to whole seconds",
			input,
		)
	}

	return duration.Seconds(), nil
}
