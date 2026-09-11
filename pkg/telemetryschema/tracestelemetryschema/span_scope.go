package tracestelemetryschema

import (
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/huandu/go-sqlbuilder"
)

// coerceDurationValue accepts duration syntax and numeric strings for a
// duration operand, item by item for a list.
func coerceDurationValue(value any) (any, error) {
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
			itemValue, err := coerceDurationValue(item)
			if err != nil {
				return nil, err
			}
			coerced[i] = itemValue
		}
		return coerced, nil
	}
	return value, nil
}

func isSpanScopeField(name string) bool {
	keyName := strings.ToLower(name)
	return keyName == SpanSearchScopeRoot || keyName == SpanSearchScopeEntryPoint
}

func buildSpanScopeCondition(key *telemetrytypes.TelemetryFieldKey, operator qbtypes.FilterOperator, value any, startNs uint64) (string, error) {
	if operator != qbtypes.FilterOperatorEqual {
		return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "span scope field %s only supports '=' operator", key.Name)
	}

	var isTrue bool
	switch v := value.(type) {
	case bool:
		isTrue = v
	case string:
		isTrue = strings.ToLower(v) == "true"
	default:
		return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "span scope field %s expects boolean value, got %T", key.Name, value)
	}

	if !isTrue {
		return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "span scope field %s can only be filtered with value 'true'", key.Name)
	}

	keyName := strings.ToLower(key.Name)
	switch keyName {
	case SpanSearchScopeRoot:
		return "parent_span_id = ''", nil
	case SpanSearchScopeEntryPoint:
		if startNs > 0 { // only add time filter if it is a valid time, else do not add
			startS := int64(startNs / 1_000_000_000)
			// Note: Escape $$ to $$$$ to avoid sqlbuilder interpreting materialized $ signs
			return sqlbuilder.Escape(fmt.Sprintf("((name, resource_string_service$$name) GLOBAL IN (SELECT DISTINCT name, serviceName from %s.%s WHERE time >= toDateTime(%d))) AND parent_span_id != ''",
				DBName, TopLevelOperationsTableName, startS)), nil
		}
		// Note: Escape $$ to $$$$ to avoid sqlbuilder interpreting materialized $ signs
		return sqlbuilder.Escape(fmt.Sprintf("((name, resource_string_service$$name) GLOBAL IN (SELECT DISTINCT name, serviceName from %s.%s)) AND parent_span_id != ''",
			DBName, TopLevelOperationsTableName)), nil
	default:
		return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid span search scope: %s", key.Name)
	}
}
