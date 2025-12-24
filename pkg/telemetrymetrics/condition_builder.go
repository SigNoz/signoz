package telemetrymetrics

import (
	"context"
	"fmt"
	"slices"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/telemetrytraces"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"

	"github.com/huandu/go-sqlbuilder"
)

type conditionBuilder struct {
	fm qbtypes.FieldMapper
}

func NewConditionBuilder(fm qbtypes.FieldMapper) *conditionBuilder {
	return &conditionBuilder{fm: fm}
}

func (c *conditionBuilder) conditionFor(
	ctx context.Context,
	key *telemetrytypes.TelemetryFieldKey,
	operator qbtypes.FilterOperator,
	value any,
	sb *sqlbuilder.SelectBuilder,
) (string, error) {

	switch operator {
	case qbtypes.FilterOperatorContains,
		qbtypes.FilterOperatorNotContains,
		qbtypes.FilterOperatorILike,
		qbtypes.FilterOperatorNotILike,
		qbtypes.FilterOperatorLike,
		qbtypes.FilterOperatorNotLike:
		value = querybuilder.FormatValueForContains(value)
	}

	tblFieldName, err := c.fm.FieldFor(ctx, key)
	if err != nil {
		return "", err
	}

	switch operator {
	case qbtypes.FilterOperatorEqual:
		return sb.E(tblFieldName, value), nil
	case qbtypes.FilterOperatorNotEqual:
		return sb.NE(tblFieldName, value), nil
	case qbtypes.FilterOperatorGreaterThan:
		return sb.G(tblFieldName, value), nil
	case qbtypes.FilterOperatorGreaterThanOrEq:
		return sb.GE(tblFieldName, value), nil
	case qbtypes.FilterOperatorLessThan:
		return sb.LT(tblFieldName, value), nil
	case qbtypes.FilterOperatorLessThanOrEq:
		return sb.LE(tblFieldName, value), nil

	// like and not like
	case qbtypes.FilterOperatorLike:
		return sb.Like(tblFieldName, value), nil
	case qbtypes.FilterOperatorNotLike:
		return sb.NotLike(tblFieldName, value), nil
	case qbtypes.FilterOperatorILike:
		return sb.ILike(tblFieldName, value), nil
	case qbtypes.FilterOperatorNotILike:
		return sb.NotILike(tblFieldName, value), nil

	case qbtypes.FilterOperatorContains:
		return sb.ILike(tblFieldName, fmt.Sprintf("%%%s%%", value)), nil
	case qbtypes.FilterOperatorNotContains:
		return sb.NotILike(tblFieldName, fmt.Sprintf("%%%s%%", value)), nil

	case qbtypes.FilterOperatorRegexp:
		// Note: Escape $$ to $$$$ to avoid sqlbuilder interpreting materialized $ signs
		// Only needed because we are using sprintf instead of sb.Match (not implemented in sqlbuilder)
		return fmt.Sprintf(`match(%s, %s)`, sqlbuilder.Escape(tblFieldName), sb.Var(value)), nil
	case qbtypes.FilterOperatorNotRegexp:
		// Note: Escape $$ to $$$$ to avoid sqlbuilder interpreting materialized $ signs
		// Only needed because we are using sprintf instead of sb.Match (not implemented in sqlbuilder)
		return fmt.Sprintf(`NOT match(%s, %s)`, sqlbuilder.Escape(tblFieldName), sb.Var(value)), nil
	// between and not between
	case qbtypes.FilterOperatorBetween:
		values, ok := value.([]any)
		if !ok {
			return "", qbtypes.ErrBetweenValues
		}
		if len(values) != 2 {
			return "", qbtypes.ErrBetweenValues
		}
		return sb.Between(tblFieldName, values[0], values[1]), nil
	case qbtypes.FilterOperatorNotBetween:
		values, ok := value.([]any)
		if !ok {
			return "", qbtypes.ErrBetweenValues
		}
		if len(values) != 2 {
			return "", qbtypes.ErrBetweenValues
		}
		return sb.NotBetween(tblFieldName, values[0], values[1]), nil

	// in and not in
	case qbtypes.FilterOperatorIn:
		values, ok := value.([]any)
		if !ok {
			return "", qbtypes.ErrInValues
		}
		return sb.In(tblFieldName, values), nil
	case qbtypes.FilterOperatorNotIn:
		values, ok := value.([]any)
		if !ok {
			return "", qbtypes.ErrInValues
		}
		return sb.NotIn(tblFieldName, values), nil

	// exists and not exists
	// in the UI based query builder, `exists` and `not exists` are used for
	// key membership checks, so depending on the column type, the condition changes
	case qbtypes.FilterOperatorExists, qbtypes.FilterOperatorNotExists:

		// if the field is intrinsic, it always exists
		if slices.Contains(IntrinsicFields, key.Name) {
			return "true", nil
		}

		if operator == qbtypes.FilterOperatorExists {
			return fmt.Sprintf("has(JSONExtractKeys(labels), '%s')", key.Name), nil
		}
		return fmt.Sprintf("not has(JSONExtractKeys(labels), '%s')", key.Name), nil
	}
	return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "unsupported operator: %v", operator)
}

func (c *conditionBuilder) ConditionFor(
	ctx context.Context,
	key *telemetrytypes.TelemetryFieldKey,
	operator qbtypes.FilterOperator,
	value any,
	sb *sqlbuilder.SelectBuilder,
	start uint64,
	_ uint64,
) (string, error) {
	if c.isMetricScopeField(key.Name) {
		return c.buildMetricScopeCondition(operator, value, start)
	}

	condition, err := c.conditionFor(ctx, key, operator, value, sb)
	if err != nil {
		return "", err
	}

	return condition, nil
}

func (c *conditionBuilder) isMetricScopeField(keyName string) bool {
	return keyName == MetricScopeFieldIsTopLevelOperation
}

// buildMetricScopeCondition handles synthetic field isTopLevelOperation for metrics signal.
func (c *conditionBuilder) buildMetricScopeCondition(operator qbtypes.FilterOperator, value any, start uint64) (string, error) {
	if operator != qbtypes.FilterOperatorEqual {
		return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "isTopLevelOperation only supports '=' operator")
	}
	// Accept true in bool or string form; anything else is invalid
	isTrue := false
	switch v := value.(type) {
	case bool:
		isTrue = v
	case string:
		isTrue = strings.ToLower(v) == "true"
	default:
		return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "isTopLevelOperation expects boolean value, got %T", value)
	}
	if !isTrue {
		return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "isTopLevelOperation can only be filtered with value 'true'")
	}

	startSec := int64(start / 1000)

	// Note: Escape $$ to $$$$ to avoid sqlbuilder interpreting materialized $ signs
	return sqlbuilder.Escape(fmt.Sprintf(
		"((JSONExtractString(labels, 'operation'), JSONExtractString(labels, 'service.name')) GLOBAL IN (SELECT DISTINCT name, serviceName FROM %s.%s WHERE time >= toDateTime(%d)))",
		telemetrytraces.DBName,
		telemetrytraces.TopLevelOperationsTableName,
		startSec,
	)), nil
}
