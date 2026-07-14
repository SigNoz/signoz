package telemetrylogs

import (
	"context"
	"fmt"

	schema "github.com/SigNoz/signoz-otel-collector/cmd/signozschemamigrator/schema_migrator"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/flagger"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/types/featuretypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"

	"github.com/huandu/go-sqlbuilder"
)

type conditionBuilder struct {
	fm qbtypes.FieldMapper
	fl flagger.Flagger
}

func NewConditionBuilder(fm qbtypes.FieldMapper, fl flagger.Flagger) *conditionBuilder {
	return &conditionBuilder{fm: fm, fl: fl}
}

// isBodyJSONSearch reports whether a key addresses a path within the body JSON. Only
// an explicit Body context qualifies; a bare, context-less `body` (e.g. full-text
// `count_distinct(body)` or `body EXISTS`) is a full-text match, not a `$.body` path.
func isBodyJSONSearch(key *telemetrytypes.TelemetryFieldKey, columns []*schema.Column) bool {
	if key.FieldContext != telemetrytypes.FieldContextBody {
		return false
	}
	for _, column := range columns {
		if column.Name == LogsV2BodyColumn || column.Name == LogsV2BodyV2Column {
			return true
		}
	}
	return false
}

// conditionForArrayFunction builds `has/hasAny/hasAll(<arrayFieldExpr>, value)` over a
// body JSON array field. The field expression uses the JSON accessor (flag on) or
// legacy string extraction (flag off); value[0] is the needle.
func (c *conditionBuilder) conditionForArrayFunction(
	ctx context.Context,
	startNs, endNs uint64,
	key *telemetrytypes.TelemetryFieldKey,
	operator qbtypes.FilterOperator,
	value any,
	columns []*schema.Column,
	sb *sqlbuilder.SelectBuilder,
) (string, error) {
	if !isBodyJSONSearch(key, columns) {
		return "", errors.NewInvalidInputf(errors.CodeInvalidInput,
			"function `%s` supports only body JSON search", operator.FunctionName()).WithUrl(functionBodyJSONSearchDocURL)
	}

	needle := value
	if args, ok := value.([]any); ok && len(args) > 0 {
		needle = args[0]
	}

	var fieldExpr string
	if c.fl.BooleanOrEmpty(ctx, flagger.FeatureUseJSONBody, featuretypes.NewFlaggerEvaluationContext(valuer.UUID{})) {
		fe, err := c.fm.FieldFor(ctx, startNs, endNs, key)
		if err != nil {
			return "", err
		}
		fieldExpr = fe
	} else {
		// legacy string-body path; value drives array-type inference (e.g. `[*]` paths)
		fieldExpr, _ = GetBodyJSONKey(ctx, key, qbtypes.FilterOperatorUnknown, value)
	}

	return fmt.Sprintf("%s(%s, %s)", operator.FunctionName(), fieldExpr, sb.Var(needle)), nil
}

// conditionForHasToken builds `hasToken(LOWER(<bodyColumn>), LOWER(<needle>))`, a
// full-text token search over the body column. It resolves the column from the key
// name + use_json_body flag, validates the field/value, and tags errors with the doc URL.
func (c *conditionBuilder) conditionForHasToken(
	ctx context.Context,
	key *telemetrytypes.TelemetryFieldKey,
	value any,
	sb *sqlbuilder.SelectBuilder,
) (string, error) {
	// hasToken takes a single needle; unwrap it from the function-argument slice.
	needle := value
	if args, ok := value.([]any); ok && len(args) > 0 {
		needle = args[0]
	}

	// TODO(Tushar): thread orgID here to evaluate correctly
	bodyJSONEnabled := c.fl.BooleanOrEmpty(ctx, flagger.FeatureUseJSONBody, featuretypes.NewFlaggerEvaluationContext(valuer.UUID{}))

	columnName := LogsV2BodyColumn
	if bodyJSONEnabled {
		if key.Name != LogsV2BodyColumn && key.Name != bodyMessageField {
			return "", errors.NewInvalidInputf(errors.CodeInvalidInput,
				"function `hasToken` only supports body/body.message field as first parameter").WithUrl(hasTokenFunctionDocURL)
		}
		columnName = bodyMessageField
	} else if key.Name != LogsV2BodyColumn {
		return "", errors.NewInvalidInputf(errors.CodeInvalidInput,
			"function `hasToken` only supports body field as first parameter").WithUrl(hasTokenFunctionDocURL)
	}

	// hasToken matches string tokens only.
	if _, ok := needle.(string); !ok {
		return "", errors.NewInvalidInputf(errors.CodeInvalidInput,
			"function `hasToken` expects value parameter to be a string").WithUrl(hasTokenFunctionDocURL)
	}

	return fmt.Sprintf("hasToken(LOWER(%s), LOWER(%s))", columnName, sb.Var(needle)), nil
}

func (c *conditionBuilder) conditionFor(
	ctx context.Context,
	startNs, endNs uint64,
	key *telemetrytypes.TelemetryFieldKey,
	operator qbtypes.FilterOperator,
	value any,
	sb *sqlbuilder.SelectBuilder,
) (string, error) {
	// hasToken is a token search over the body column resolved purely from the key
	// name + flag, independent of column resolution, so handle it before anything else.
	if operator == qbtypes.FilterOperatorHasToken {
		return c.conditionForHasToken(ctx, key, value, sb)
	}

	columns, err := c.fm.ColumnFor(ctx, startNs, endNs, key)
	if err != nil {
		return "", err
	}

	// has/hasAny/hasAll build `has(<arrayFieldExpr>, value)` over body JSON arrays
	// rather than going through the normal operator paths, so handle them up front.
	if operator.IsArrayFunctionOperator() {
		return c.conditionForArrayFunction(ctx, startNs, endNs, key, operator, value, columns, sb)
	}

	// TODO(Piyush): Update this to support multiple JSON columns based on evolutions
	for _, column := range columns {
		// TODO(Tushar): thread orgID here to evaluate correctly
		if column.Type.GetType() == schema.ColumnTypeEnumJSON && isBodyJSONSearch(key, columns) && c.fl.BooleanOrEmpty(ctx, flagger.FeatureUseJSONBody, featuretypes.NewFlaggerEvaluationContext(valuer.UUID{})) && key.Name != messageSubField {
			valueType, value := InferDataType(value, operator, key)
			cond, err := NewJSONConditionBuilder(key, valueType).buildJSONCondition(operator, value, sb)
			if err != nil {
				return "", err
			}
			return cond, nil
		}
	}

	if operator.IsStringSearchOperator() {
		value = querybuilder.FormatValueForContains(value)
	}

	fieldExpression, err := c.fm.FieldFor(ctx, startNs, endNs, key)
	if err != nil {
		return "", err
	}

	// Check if this is a body JSON search (legacy string-body path, JSON flag off).
	// TODO(Tushar): thread orgID here to evaluate correctly
	if isBodyJSONSearch(key, columns) && !c.fl.BooleanOrEmpty(ctx, flagger.FeatureUseJSONBody, featuretypes.NewFlaggerEvaluationContext(valuer.UUID{})) {
		fieldExpression, value = GetBodyJSONKey(ctx, key, operator, value)
	}

	fieldExpression, value = querybuilder.DataTypeCollisionHandledFieldName(key, value, fieldExpression, operator)

	// make use of case insensitive index for body
	if fieldExpression == "body" || fieldExpression == messageSubColumn {
		switch operator {
		case qbtypes.FilterOperatorLike:
			return sb.ILike(fieldExpression, value), nil
		case qbtypes.FilterOperatorNotLike:
			return sb.NotILike(fieldExpression, value), nil
		case qbtypes.FilterOperatorRegexp:
			// Note: Escape $$ to $$$$ to avoid sqlbuilder interpreting materialized $ signs
			// Only needed because we are using sprintf instead of sb.Match (not implemented in sqlbuilder)
			return fmt.Sprintf(`match(LOWER(%s), LOWER(%s))`, sqlbuilder.Escape(fieldExpression), sb.Var(value)), nil
		case qbtypes.FilterOperatorNotRegexp:
			// Note: Escape $$ to $$$$ to avoid sqlbuilder interpreting materialized $ signs
			// Only needed because we are using sprintf instead of sb.Match (not implemented in sqlbuilder)
			return fmt.Sprintf(`NOT match(LOWER(%s), LOWER(%s))`, sqlbuilder.Escape(fieldExpression), sb.Var(value)), nil
		}
	}

	// regular operators
	switch operator {
	// regular operators
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
		return sb.Between(fieldExpression, values[0], values[1]), nil
	case qbtypes.FilterOperatorNotBetween:
		values, ok := value.([]any)
		if !ok {
			return "", qbtypes.ErrBetweenValues
		}
		if len(values) != 2 {
			return "", qbtypes.ErrBetweenValues
		}
		return sb.NotBetween(fieldExpression, values[0], values[1]), nil

	// in and not in
	case qbtypes.FilterOperatorIn:
		values, ok := value.([]any)
		if !ok {
			return "", qbtypes.ErrInValues
		}
		// instead of using IN, we use `=` + `OR` to make use of index
		conditions := []string{}
		for _, value := range values {
			conditions = append(conditions, sb.E(fieldExpression, value))
		}
		return sb.Or(conditions...), nil
	case qbtypes.FilterOperatorNotIn:
		values, ok := value.([]any)
		if !ok {
			return "", qbtypes.ErrInValues
		}
		// instead of using NOT IN, we use `!=` + `AND` to make use of index
		conditions := []string{}
		for _, value := range values {
			conditions = append(conditions, sb.NE(fieldExpression, value))
		}
		return sb.And(conditions...), nil

	// exists and not exists
	// in the UI based query builder, `exists` and `not exists` are used for
	// key membership checks, so depending on the column type, the condition changes
	case qbtypes.FilterOperatorExists, qbtypes.FilterOperatorNotExists:
		// TODO(Tushar): thread orgID here to evaluate correctly
		if isBodyJSONSearch(key, columns) && !c.fl.BooleanOrEmpty(ctx, flagger.FeatureUseJSONBody, featuretypes.NewFlaggerEvaluationContext(valuer.UUID{})) {
			if operator == qbtypes.FilterOperatorExists {
				return GetBodyJSONKeyForExists(ctx, key, operator, value), nil
			} else {
				return "NOT " + GetBodyJSONKeyForExists(ctx, key, operator, value), nil
			}
		}

		var value any
		column := columns[0]
		if len(key.Evolutions) > 0 {
			// we will use the corresponding column and its evolution entry for the query
			newColumns, _, err := qbtypes.SelectEvolutionsForColumns(columns, key.Evolutions, startNs, endNs)
			if err != nil {
				return "", err
			}

			if len(newColumns) == 0 {
				return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "no valid evolution found for field %s in the given time range", key.Name)
			}

			// This mean tblFieldName is with multiIf, we just need to do a null check.
			if len(newColumns) > 1 {
				if operator == qbtypes.FilterOperatorExists {
					return sb.IsNotNull(fieldExpression), nil
				} else {
					return sb.IsNull(fieldExpression), nil
				}
			}

			// otherwise we have to find the correct exist operator based on the column type
			column = newColumns[0]
		}

		switch column.Type.GetType() {
		case schema.ColumnTypeEnumJSON:
			if operator == qbtypes.FilterOperatorExists {
				return sb.IsNotNull(fieldExpression), nil
			}
			return sb.IsNull(fieldExpression), nil
		case schema.ColumnTypeEnumLowCardinality:
			switch elementType := column.Type.(schema.LowCardinalityColumnType).ElementType; elementType.GetType() {
			case schema.ColumnTypeEnumString:
				value = ""
				if operator == qbtypes.FilterOperatorExists {
					return sb.NE(fieldExpression, value), nil
				}
				return sb.E(fieldExpression, value), nil
			default:
				return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "exists operator is not supported for low cardinality column type %s", elementType)
			}
		case schema.ColumnTypeEnumString:
			value = ""
			if operator == qbtypes.FilterOperatorExists {
				return sb.NE(fieldExpression, value), nil
			} else {
				return sb.E(fieldExpression, value), nil
			}
		case schema.ColumnTypeEnumUInt64, schema.ColumnTypeEnumUInt32, schema.ColumnTypeEnumUInt8:
			value = 0
			if operator == qbtypes.FilterOperatorExists {
				return sb.NE(fieldExpression, value), nil
			} else {
				return sb.E(fieldExpression, value), nil
			}
		case schema.ColumnTypeEnumMap:
			keyType := column.Type.(schema.MapColumnType).KeyType
			if _, ok := keyType.(schema.LowCardinalityColumnType); !ok {
				return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "key type %s is not supported for map column type %s", keyType, column.Type)
			}

			switch valueType := column.Type.(schema.MapColumnType).ValueType; valueType.GetType() {
			case schema.ColumnTypeEnumString, schema.ColumnTypeEnumBool, schema.ColumnTypeEnumFloat64:
				leftOperand := fmt.Sprintf("mapContains(%s, '%s')", column.Name, key.Name)
				if key.Materialized {
					leftOperand = telemetrytypes.FieldKeyToMaterializedColumnNameForExists(key)
				}
				if operator == qbtypes.FilterOperatorExists {
					return sb.E(leftOperand, true), nil
				} else {
					return sb.NE(leftOperand, true), nil
				}
			default:
				return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "exists operator is not supported for map column type %s", valueType)
			}
		default:
			return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "exists operator is not supported for column type %s", column.Type)

		}
	}
	return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "unsupported operator: %v", operator)
}

func (c *conditionBuilder) ConditionFor(
	ctx context.Context,
	startNs uint64,
	endNs uint64,
	key *telemetrytypes.TelemetryFieldKey,
	fieldKeysForName []*telemetrytypes.TelemetryFieldKey,
	operator qbtypes.FilterOperator,
	value any,
	sb *sqlbuilder.SelectBuilder,
) ([]string, []string, error) {

	keys, warning := querybuilder.ResolveKeys(key, fieldKeysForName)
	var warnings []string
	if warning != "" {
		warnings = append(warnings, warning)
	}

	if len(keys) == 0 {
		// No known field key matched. Legacy string-body mode still searches unknown
		// Body-context keys as body JSON paths; JSON-body mode requires a metadata match.
		// TODO(Tushar): thread orgID here to evaluate correctly
		switch {
		case key.FieldContext == telemetrytypes.FieldContextBody && key.Name == "":
			return nil, warnings, errors.NewInvalidInputf(errors.CodeInvalidInput, "missing key for body json search - expected key of the form `body.key` (ex: `body.status`)")
		case key.FieldContext == telemetrytypes.FieldContextBody &&
			!c.fl.BooleanOrEmpty(ctx, flagger.FeatureUseJSONBody, featuretypes.NewFlaggerEvaluationContext(valuer.UUID{})):
			keys = []*telemetrytypes.TelemetryFieldKey{key}
		default:
			return nil, warnings, querybuilder.NewKeyNotFoundError(key.Name)
		}
	}

	// has/hasAny/hasAll need an array field: in JSON-body mode drop non-array matches so a
	// scalar errors clearly instead of failing at ClickHouse runtime (legacy mode skips this).
	if operator.IsArrayFunctionOperator() &&
		c.fl.BooleanOrEmpty(ctx, flagger.FeatureUseJSONBody, featuretypes.NewFlaggerEvaluationContext(valuer.UUID{})) {
		arrayKeys := make([]*telemetrytypes.TelemetryFieldKey, 0, len(keys))
		for _, k := range keys {
			if k.FieldDataType.IsArray() {
				arrayKeys = append(arrayKeys, k)
			}
		}
		if len(arrayKeys) == 0 {
			return nil, warnings, errors.NewInvalidInputf(errors.CodeInvalidInput,
				"function `%s` expects key parameter to be an array field; no array fields found", operator.FunctionName())
		}
		keys = arrayKeys
	}

	conds := make([]string, 0, len(keys))
	for _, k := range keys {
		cond, err := c.conditionForKey(ctx, startNs, endNs, k, operator, value, sb)
		if err != nil {
			return nil, nil, err
		}
		conds = append(conds, cond)
		if w := c.bodyFullTextDefaultWarning(ctx, startNs, endNs, k, operator); w != "" {
			warnings = append(warnings, w)
		}
	}
	return conds, warnings, nil
}

// bodyFullTextDefaultWarning returns the advisory shown when a regexp full-text
// search on `body` resolves to the body.message sub-field (JSON mode), else "". This
// keeps the JSON-vs-legacy decision in the builder rather than the filter visitor.
func (c *conditionBuilder) bodyFullTextDefaultWarning(ctx context.Context, startNs, endNs uint64, key *telemetrytypes.TelemetryFieldKey, operator qbtypes.FilterOperator) string {
	if operator != qbtypes.FilterOperatorRegexp || key.Name != LogsV2BodyColumn {
		return ""
	}
	if field, err := c.fm.FieldFor(ctx, startNs, endNs, key); err == nil && field == messageSubColumn {
		return querybuilder.BodyFullTextSearchDefaultWarning
	}
	return ""
}

func (c *conditionBuilder) conditionForKey(
	ctx context.Context,
	startNs uint64,
	endNs uint64,
	key *telemetrytypes.TelemetryFieldKey,
	operator qbtypes.FilterOperator,
	value any,
	sb *sqlbuilder.SelectBuilder,
) (string, error) {

	condition, err := c.conditionFor(ctx, startNs, endNs, key, operator, value, sb)
	if err != nil {
		return "", err
	}

	// Skip adding exists filter for intrinsic fields i.e. Table level log context fields
	buildExistCondition := operator.AddDefaultExistsFilter()
	switch key.FieldContext {
	case telemetrytypes.FieldContextLog, telemetrytypes.FieldContextScope:
		// pass; No need to build exist condition for top level columns
		// immediately return
		return condition, nil
	case telemetrytypes.FieldContextResource, telemetrytypes.FieldContextAttribute:
		// build exist condition for resource and attribute fields based on filter operator
	case telemetrytypes.FieldContextBody:
		// Querying JSON fields already account for Nullability of fields
		// so additional exists checks are not needed
		// TODO(Tushar): thread orgID here to evaluate correctly
		if c.fl.BooleanOrEmpty(ctx, flagger.FeatureUseJSONBody, featuretypes.NewFlaggerEvaluationContext(valuer.UUID{})) {
			return condition, nil
		}
	}

	if buildExistCondition {
		existsCondition, err := c.conditionFor(ctx, startNs, endNs, key, qbtypes.FilterOperatorExists, nil, sb)
		if err != nil {
			return "", err
		}
		return sb.And(condition, existsCondition), nil
	}

	return condition, nil
}
