package metricstelemetryschema

import (
	"context"
	"fmt"
	"slices"

	schema "github.com/SigNoz/signoz-otel-collector/cmd/signozschemamigrator/schema_migrator"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"

	"github.com/huandu/go-sqlbuilder"
)

type conditionBuilder struct {
	fm qbtypes.FieldMapper
}

func NewConditionBuilder(fm qbtypes.FieldMapper) *conditionBuilder {
	return &conditionBuilder{fm: fm}
}

// Labels read back as String from the `labels` JSON whatever type the metadata claims, so the
// collision is always String vs the literal; intrinsic columns keep their own type.
func resolveTypeCollisionForFieldName(fieldExpression string, value any) string {
	if col, isColumn := timeSeriesV4Columns[fieldExpression]; isColumn {
		columnType := col.Type.GetType()
		if lowCardinality, ok := col.Type.(schema.LowCardinalityColumnType); ok {
			columnType = lowCardinality.ElementType.GetType()
		}
		if columnType != schema.ColumnTypeEnumString {
			return fieldExpression
		}
	}

	switch value.(type) {
	case bool:
		return fmt.Sprintf("accurateCastOrNull(%s, 'Bool')", fieldExpression)
	case float64:
		return fmt.Sprintf("toFloat64OrNull(%s)", fieldExpression)
	}
	return fieldExpression
}

func (c *conditionBuilder) conditionFor(
	ctx context.Context,
	orgID valuer.UUID,
	startNs uint64,
	endNs uint64,
	key *telemetrytypes.TelemetryFieldKey,
	operator qbtypes.FilterOperator,
	value any,
	sb *sqlbuilder.SelectBuilder,
) (string, error) {

	if operator.IsStringSearchOperator() {
		value = querybuilder.FormatValueForContains(value)
	}

	fieldExpression, err := c.fm.FieldFor(ctx, orgID, startNs, endNs, key)
	if err != nil {
		return "", err
	}

	// TODO(srikanthccv): use querybuilder.DataTypeCollisionHandledFieldName when metrics schemas are updated
	fieldExpression = resolveTypeCollisionForFieldName(fieldExpression, value)

	switch operator {
	case qbtypes.FilterOperatorEqual:
		return sb.E(fieldExpression, value), nil
	case qbtypes.FilterOperatorNotEqual:
		return sb.NE(fieldExpression, value), nil
	case qbtypes.FilterOperatorGreaterThan:
		return sb.G(fieldExpression, value), nil
	case qbtypes.FilterOperatorGreaterThanOrEq:
		return sb.GE(fieldExpression, value), nil
	case qbtypes.FilterOperatorLessThan:
		return sb.LT(fieldExpression, value), nil
	case qbtypes.FilterOperatorLessThanOrEq:
		return sb.LE(fieldExpression, value), nil

	// like and not like
	case qbtypes.FilterOperatorLike:
		return sb.Like(fieldExpression, value), nil
	case qbtypes.FilterOperatorNotLike:
		return sb.NotLike(fieldExpression, value), nil
	case qbtypes.FilterOperatorILike:
		return sb.ILike(fieldExpression, value), nil
	case qbtypes.FilterOperatorNotILike:
		return sb.NotILike(fieldExpression, value), nil

	case qbtypes.FilterOperatorContains:
		return sb.ILike(fieldExpression, fmt.Sprintf("%%%s%%", value)), nil
	case qbtypes.FilterOperatorNotContains:
		return sb.NotILike(fieldExpression, fmt.Sprintf("%%%s%%", value)), nil

	case qbtypes.FilterOperatorRegexp:
		// Note: Escape $$ to $$$$ to avoid sqlbuilder interpreting materialized $ signs
		// Only needed because we are using sprintf instead of sb.Match (not implemented in sqlbuilder)
		return fmt.Sprintf(`match(%s, %s)`, sqlbuilder.Escape(fieldExpression), sb.Var(value)), nil
	case qbtypes.FilterOperatorNotRegexp:
		// Note: Escape $$ to $$$$ to avoid sqlbuilder interpreting materialized $ signs
		// Only needed because we are using sprintf instead of sb.Match (not implemented in sqlbuilder)
		return fmt.Sprintf(`NOT match(%s, %s)`, sqlbuilder.Escape(fieldExpression), sb.Var(value)), nil
	// between and not between
	case qbtypes.FilterOperatorBetween:
		values, ok := value.([]any)
		if !ok {
			return "", qbtypes.ErrBetweenValues
		}
		if len(values) != 2 {
			return "", qbtypes.ErrBetweenValues
		}
		// both bounds share one expression, so the lower bound picks the cast
		fieldExpression = resolveTypeCollisionForFieldName(fieldExpression, values[0])
		return sb.Between(fieldExpression, values[0], values[1]), nil
	case qbtypes.FilterOperatorNotBetween:
		values, ok := value.([]any)
		if !ok {
			return "", qbtypes.ErrBetweenValues
		}
		if len(values) != 2 {
			return "", qbtypes.ErrBetweenValues
		}
		fieldExpression = resolveTypeCollisionForFieldName(fieldExpression, values[0])
		return sb.NotBetween(fieldExpression, values[0], values[1]), nil

	// in and not in
	case qbtypes.FilterOperatorIn:
		values, ok := value.([]any)
		if !ok {
			return "", qbtypes.ErrInValues
		}
		// instead of using IN, we use `=` + `OR` to make use of index
		conditions := []string{}
		for _, item := range values {
			conditions = append(conditions, sb.E(resolveTypeCollisionForFieldName(fieldExpression, item), item))
		}
		return sb.Or(conditions...), nil
	case qbtypes.FilterOperatorNotIn:
		values, ok := value.([]any)
		if !ok {
			return "", qbtypes.ErrInValues
		}
		// instead of using NOT IN, we use `!=` + `AND` to make use of index
		conditions := []string{}
		for _, item := range values {
			conditions = append(conditions, sb.NE(resolveTypeCollisionForFieldName(fieldExpression, item), item))
		}
		return sb.And(conditions...), nil

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

// ConditionFor rejects the logs-only function operators and hands the term to
// the generic flow; metrics has no resource sub-query, so options are unused.
func (c *conditionBuilder) ConditionFor(
	ctx context.Context,
	orgID valuer.UUID,
	startNs uint64,
	endNs uint64,
	key *telemetrytypes.TelemetryFieldKey,
	logicalFields []*telemetrytypes.LogicalField,
	fieldKeys map[string][]*telemetrytypes.TelemetryFieldKey,
	options qbtypes.ConditionBuilderOptions,
	operator qbtypes.FilterOperator,
	value any,
	sb *sqlbuilder.SelectBuilder,
) ([]string, []string, error) {
	// has/hasAny/hasAll/hasToken/search are logs-only functions; reject for metrics.
	if err := querybuilder.NewFunctionUnsupportedError(operator); err != nil {
		return nil, nil, err
	}
	scope := querybuilder.CompileScope{OrgID: orgID, StartNs: startNs, EndNs: endNs}
	return querybuilder.CompileTerm(ctx, scope, c, querybuilder.SkipResourceNone, key, logicalFields, fieldKeys, options, operator, value, sb)
}

// AmendEvidence: metrics fold no intrinsic storage into the evidence.
func (c *conditionBuilder) AmendEvidence(_ context.Context, _ querybuilder.CompileScope, _ *telemetrytypes.TelemetryFieldKey, fields []*telemetrytypes.LogicalField) []*telemetrytypes.LogicalField {
	return fields
}

// Synthesize: an intrinsic time-series column passes through as itself; any
// other name reads as a label (with the context-prefixed spelling second),
// with an advisory when the metadata has never seen it. Labels always read
// from the JSON, so an unknown name still queries instead of erroring.
func (c *conditionBuilder) Synthesize(_ context.Context, _ querybuilder.CompileScope, key *telemetrytypes.TelemetryFieldKey, _ qbtypes.FilterOperator, _ any, fieldKeys map[string][]*telemetrytypes.TelemetryFieldKey) ([]*telemetrytypes.LogicalField, []string, error) {
	if _, isColumn := timeSeriesV4Columns[key.Name]; isColumn {
		return querybuilder.WrapAsLogicalFields(key.Name, []*telemetrytypes.TelemetryFieldKey{key}), nil, nil
	}
	var warnings []string
	if len(fieldKeys[key.Name]) == 0 {
		warnings = append(warnings, fmt.Sprintf("label `%s` not found in metadata; check the label name for typos", key.Name))
	}
	keys := []*telemetrytypes.TelemetryFieldKey{
		telemetrytypes.NewTelemetryFieldKey(key.Name, telemetrytypes.FieldContextAttribute, key.FieldDataType),
	}
	if key.FieldContext != telemetrytypes.FieldContextUnspecified {
		keys = append(keys, telemetrytypes.NewTelemetryFieldKey(
			key.FieldContext.StringValue()+"."+key.Name, telemetrytypes.FieldContextAttribute, key.FieldDataType))
	}
	return querybuilder.WrapAsLogicalFields(key.Name, keys), warnings, nil
}

// CompileField: a family compiles through the shared operator switch; a
// single label keeps the metrics operator forms (labels read back as String
// from the labels JSON, so the collision handling differs) and takes no
// exists guard.
func (c *conditionBuilder) CompileField(ctx context.Context, scope querybuilder.CompileScope, logical *telemetrytypes.LogicalField, operator qbtypes.FilterOperator, value any, sb *sqlbuilder.SelectBuilder) (string, []string, error) {
	if logical.IsFamily() {
		cond, err := querybuilder.CompileFieldWithSharedOperators(ctx, scope, c.fm, logical, operator, value, sb, false)
		return cond, nil, err
	}
	cond, err := c.conditionFor(ctx, scope.OrgID, scope.StartNs, scope.EndNs, logical.Single(), operator, value, sb)
	return cond, nil, err
}
