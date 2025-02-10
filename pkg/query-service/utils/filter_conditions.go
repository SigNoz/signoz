package utils

import (
	"fmt"
	"strings"

	"go.signoz.io/signoz/pkg/query-service/model/metrics_explorer"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
)

// skipKey is an optional parameter to skip processing of a specific key
func BuildFilterConditions(fs *metrics_explorer.SummaryFilterSet, skipKey string) ([]string, error) {
	if fs == nil || len(fs.Items) == 0 {
		return nil, nil
	}

	var conditions []string

	for _, item := range fs.Items {
		if skipKey != "" && item.Key.Key == skipKey {
			continue
		}

		toFormat := item.Value
		op := v3.FilterOperator(strings.ToLower(strings.TrimSpace(string(item.Operator))))
		if op == v3.FilterOperatorContains || op == v3.FilterOperatorNotContains {
			toFormat = fmt.Sprintf("%%%s%%", toFormat)
		}
		fmtVal := ClickHouseFormattedValue(toFormat)

		// Determine if the key is a JSON key or a normal column
		isJSONKey := false
		switch item.FilterTypeKey {
		case metrics_explorer.FilterKeyAttributes:
			isJSONKey = true // Assuming attributes are stored as JSON
		case metrics_explorer.FilterKeyMetricName:
			isJSONKey = false // Assuming metric names are normal columns
		case metrics_explorer.FilterKeyUnit:
			isJSONKey = false // Assuming units are normal columns
		}

		condition, err := buildSingleFilterCondition(item.Key.Key, op, fmtVal, isJSONKey)
		if err != nil {
			return nil, err
		}
		conditions = append(conditions, condition)
	}

	return conditions, nil
}

func buildSingleFilterCondition(key string, op v3.FilterOperator, fmtVal string, isJSONKey bool) (string, error) {
	var keyCondition string
	if isJSONKey {
		keyCondition = fmt.Sprintf("JSONExtractString(labels, '%s')", key)
	} else {
		keyCondition = key // Assuming normal column access
	}

	switch op {
	case v3.FilterOperatorEqual:
		return fmt.Sprintf("%s = %s", keyCondition, fmtVal), nil
	case v3.FilterOperatorNotEqual:
		return fmt.Sprintf("%s != %s", keyCondition, fmtVal), nil
	case v3.FilterOperatorIn:
		return fmt.Sprintf("%s IN %s", keyCondition, fmtVal), nil
	case v3.FilterOperatorNotIn:
		return fmt.Sprintf("%s NOT IN %s", keyCondition, fmtVal), nil
	case v3.FilterOperatorLike:
		return fmt.Sprintf("like(%s, %s)", keyCondition, fmtVal), nil
	case v3.FilterOperatorNotLike:
		return fmt.Sprintf("notLike(%s, %s)", keyCondition, fmtVal), nil
	case v3.FilterOperatorRegex:
		return fmt.Sprintf("match(%s, %s)", keyCondition, fmtVal), nil
	case v3.FilterOperatorNotRegex:
		return fmt.Sprintf("not match(%s, %s)", keyCondition, fmtVal), nil
	case v3.FilterOperatorGreaterThan:
		return fmt.Sprintf("%s > %s", keyCondition, fmtVal), nil
	case v3.FilterOperatorGreaterThanOrEq:
		return fmt.Sprintf("%s >= %s", keyCondition, fmtVal), nil
	case v3.FilterOperatorLessThan:
		return fmt.Sprintf("%s < %s", keyCondition, fmtVal), nil
	case v3.FilterOperatorLessThanOrEq:
		return fmt.Sprintf("%s <= %s", keyCondition, fmtVal), nil
	case v3.FilterOperatorContains:
		return fmt.Sprintf("like(%s, %s)", keyCondition, fmtVal), nil
	case v3.FilterOperatorNotContains:
		return fmt.Sprintf("notLike(%s, %s)", keyCondition, fmtVal), nil
	case v3.FilterOperatorExists:
		return fmt.Sprintf("has(JSONExtractKeys(labels), '%s')", key), nil
	case v3.FilterOperatorNotExists:
		return fmt.Sprintf("not has(JSONExtractKeys(labels), '%s')", key), nil
	default:
		return "", fmt.Errorf("unsupported filter operator: %s", op)
	}
}
