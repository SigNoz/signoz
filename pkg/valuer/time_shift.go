package valuer

import (
	"fmt"
	"strconv"
	"strings"
	"time"
)

var agoUnitSeconds = map[string]float64{
	"second": 1, "seconds": 1,
	"minute": 60, "minutes": 60,
	"hour": 3600, "hours": 3600,
	"day": 86400, "days": 86400,
	"week": 604800, "weeks": 604800,
}

// ParseTimeShiftSeconds converts a timeShift argument into seconds (float64).
// Accepts numeric seconds (3600, "3600"), Go duration strings ("5m", "1.5h"),
// and human-readable phrases ("1 hour ago", "2 days ago", "1 week ago").
func ParseTimeShiftSeconds(value any) (float64, error) {
	switch v := value.(type) {
	case float64:
		return v, nil
	case int64:
		return float64(v), nil
	case int:
		return float64(v), nil
	case string:
		return parseTimeShiftSecondsFromString(v)
	default:
		return 0, fmt.Errorf("unsupported type %T for time shift", value)
	}
}

func parseTimeShiftSecondsFromString(s string) (float64, error) {
	s = strings.TrimSpace(s)
	if s == "" {
		return 0, fmt.Errorf("empty time shift value")
	}

	// Raw number: "3600", "-300", "86400.5"
	if f, err := strconv.ParseFloat(s, 64); err == nil {
		return f, nil
	}

	// "N unit ago" phrase: "1 hour ago", "2 days ago", "1 week ago"
	lower := strings.ToLower(s)
	if strings.HasSuffix(lower, " ago") {
		phrase := strings.TrimSuffix(lower, " ago")
		parts := strings.Fields(phrase)
		if len(parts) == 2 {
			if count, err := strconv.ParseFloat(parts[0], 64); err == nil {
				if secs, ok := agoUnitSeconds[parts[1]]; ok {
					return count * secs, nil
				}
			}
		}
	}

	// Go duration string: "5m", "1.5h", "1h30m", "-10m"
	if d, err := time.ParseDuration(s); err == nil {
		secs := d.Seconds()
		if secs > 0 && secs < 1 {
			return 0, fmt.Errorf("time shift must be at least 1 second, got %q", s)
		}
		return secs, nil
	}

	return 0, fmt.Errorf("invalid time shift value %q: expected seconds, a duration like \"5m\", or a phrase like \"1 hour ago\"", s)
}
