package querybuilder

import (
	"strconv"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
)

// CoerceDurationValue accepts duration syntax and numeric strings for a
// duration operand, item by item for a list.
func CoerceDurationValue(value any) (any, error) {
	switch v := value.(type) {
	case string:
		if duration, err := time.ParseDuration(v); err == nil {
			return duration.Nanoseconds(), nil
		} else if f, err := strconv.ParseFloat(v, 64); err == nil {
			return int64(f), nil
		} else {
			return nil, errors.WrapInvalidInputf(err, errors.CodeInvalidInput, "invalid duration value: %s", v)
		}
	case float64:
		return int64(v), nil
	case float32:
		return int64(v), nil
	case []any:
		coerced := make([]any, len(v))
		for i, item := range v {
			itemValue, err := CoerceDurationValue(item)
			if err != nil {
				return nil, err
			}
			coerced[i] = itemValue
		}
		return coerced, nil
	}
	return value, nil
}
