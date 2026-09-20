package aivision

import (
	"fmt"
	"math"
	"strconv"
	"strings"
	"time"
)

func escapeLike(value string) string {
	return strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`).Replace(value)
}

func validateRange(start, end int64, maxRange time.Duration) error {
	if start < 0 || end <= start {
		return fmt.Errorf("start and end must be epoch milliseconds with start < end")
	}
	if end-start > maxRange.Milliseconds() {
		return fmt.Errorf("query range exceeds %s", maxRange)
	}
	return nil
}

func asInt64(value any) (int64, error) {
	switch typed := value.(type) {
	case int64:
		return typed, nil
	case uint64:
		if typed > math.MaxInt64 {
			return 0, fmt.Errorf("integer overflow")
		}
		return int64(typed), nil
	case int:
		return int64(typed), nil
	case float64:
		return int64(typed), nil
	case string:
		return strconv.ParseInt(typed, 10, 64)
	default:
		return 0, fmt.Errorf("expected integer, got %T", value)
	}
}

func asFloat64(value any) (float64, error) {
	switch typed := value.(type) {
	case float64:
		return typed, nil
	case int64:
		return float64(typed), nil
	case uint64:
		return float64(typed), nil
	case string:
		return strconv.ParseFloat(typed, 64)
	default:
		return 0, fmt.Errorf("expected number, got %T", value)
	}
}

func defaultString(value, fallback string) string {
	if value == "" {
		return fallback
	}
	return value
}

func telemetryTable(prefix, suffix string) string {
	if prefix == "" {
		prefix = "signoz"
	}
	return "`" + prefix + "_" + suffix + "`"
}
