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

var _ qbtypes.ConditionBuilder = (*conditionBuilder)(nil)

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

// conditionForArrayFunction builds has/hasAny/hasAll over a body JSON path — via the JSON
// access plan (flag on) or legacy typed extraction (flag off).
func (c *conditionBuilder) conditionForArrayFunction(
	ctx context.Context,
	orgID valuer.UUID,
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

	if c.fl.BooleanOrEmpty(ctx, flagger.FeatureUseJSONBody, featuretypes.NewFlaggerEvaluationContext(orgID)) {
		// JSON access plan: data-type collision handling, nested array paths.
		valueType, needle := InferDataType(needle, operator, key)
		// A not-found (synthesized) body path carries no metadata plan; build an exhaustive
		// one so the query runs against the underlying data (with the not-found warning)
		// instead of erroring, matching the regular-operator path.
		if len(key.JSONPlan) == 0 {
			keyCopy := telemetrytypes.NewTelemetryFieldKey(key.Name, key.FieldContext, key.FieldDataType)
			if err := keyCopy.SetExhaustiveJSONAccessPlan(telemetrytypes.JSONColumnMetadata{BaseColumn: LogsV2BodyV2Column}, valueType); err != nil {
				return "", err
			}
			key = keyCopy
		}
		return NewJSONConditionBuilder(key, valueType).buildArrayFunctionCondition(operator, needle, sb)
	}

	// legacy string-body path: type-matched array extraction, OR-ed with a scalar comparison
	// for a scalar body value (coalesced to false so NOT has() matches missing-key rows).
	elemType := legacyElemType(needle)
	arrayExpr := getBodyJSONArrayKey(key, elemType)
	scalarExpr, scalarGuard, hasScalar := getBodyJSONScalarKey(key, elemType)
	if list, ok := needle.([]any); ok {
		vals := make([]any, len(list))
		for i, v := range list {
			vals[i] = legacyCoerceNeedle(v, elemType)
		}
		arrayCond := fmt.Sprintf("%s(%s, %s)", operator.FunctionName(), arrayExpr, sb.Var(vals))
		if !hasScalar {
			return arrayCond, nil
		}
		var membership string
		if operator == qbtypes.FilterOperatorHasAll {
			eqs := make([]string, len(vals))
			for i, v := range vals {
				eqs[i] = sb.E(scalarExpr, v)
			}
			membership = sb.And(eqs...)
		} else {
			membership = sb.In(scalarExpr, vals...)
		}
		return fmt.Sprintf("(%s OR ifNull(%s, false))", arrayCond, sb.And(membership, scalarGuard)), nil
	}
	typedNeedle := legacyCoerceNeedle(needle, elemType)
	arrayCond := fmt.Sprintf("%s(%s, %s)", operator.FunctionName(), arrayExpr, sb.Var(typedNeedle))
	if !hasScalar {
		return arrayCond, nil
	}
	return fmt.Sprintf("(%s OR ifNull(%s, false))", arrayCond, sb.And(sb.E(scalarExpr, typedNeedle), scalarGuard)), nil
}

// conditionForHasToken builds a hasToken full-text search over the body column, resolving the
// column from the key name + use_json_body flag.
func (c *conditionBuilder) conditionForHasToken(
	ctx context.Context,
	orgID valuer.UUID,
	key *telemetrytypes.TelemetryFieldKey,
	value any,
	sb *sqlbuilder.SelectBuilder,
) (string, error) {
	// hasToken takes a single needle; unwrap it from the function-argument slice.
	needle := value
	if args, ok := value.([]any); ok && len(args) > 0 {
		needle = args[0]
	}

	// hasToken matches string tokens only.
	if _, ok := needle.(string); !ok {
		return "", errors.NewInvalidInputf(errors.CodeInvalidInput,
			"function `hasToken` expects value parameter to be a string").WithUrl(hasTokenFunctionDocURL)
	}

	bodyJSONEnabled := c.fl.BooleanOrEmpty(ctx, flagger.FeatureUseJSONBody, featuretypes.NewFlaggerEvaluationContext(orgID))

	if !bodyJSONEnabled {
		// legacy: token search over the plain body string column only.
		if key.Name != LogsV2BodyColumn {
			return "", errors.NewInvalidInputf(errors.CodeInvalidInput,
				"function `hasToken` only supports body field as first parameter").WithUrl(hasTokenFunctionDocURL)
		}
		return fmt.Sprintf("hasToken(LOWER(%s), LOWER(%s))", LogsV2BodyColumn, sb.Var(needle)), nil
	}

	// JSON mode: a bare body/body.message key searches the body.message column; any other body
	// field is a token search over its JSON string field, incl. strings nested in arrays.
	// `body.message` resolves to a body-context key named `message`, so match that too — else it
	// falls through and emits dynamicElement over the already-typed String column, which errors.
	if key.Name == LogsV2BodyColumn || key.Name == bodyMessageField ||
		(key.FieldContext == telemetrytypes.FieldContextBody && key.Name == messageSubField) {
		return fmt.Sprintf("hasToken(LOWER(%s), LOWER(%s))", bodyMessageField, sb.Var(needle)), nil
	}
	if key.FieldContext == telemetrytypes.FieldContextBody {
		// A not-found (synthesized) body path carries no metadata plan; build an exhaustive
		// one so hasToken runs against the underlying data instead of erroring.
		if len(key.JSONPlan) == 0 {
			keyCopy := telemetrytypes.NewTelemetryFieldKey(key.Name, key.FieldContext, key.FieldDataType)
			if err := keyCopy.SetExhaustiveJSONAccessPlan(telemetrytypes.JSONColumnMetadata{BaseColumn: LogsV2BodyV2Column}, telemetrytypes.FieldDataTypeString); err != nil {
				return "", err
			}
			key = keyCopy
		}
		return NewJSONConditionBuilder(key, telemetrytypes.FieldDataTypeString).buildTokenFunctionCondition(needle, sb)
	}
	return "", errors.NewInvalidInputf(errors.CodeInvalidInput,
		"function `hasToken` only supports the body field or a body JSON string field as first parameter").WithUrl(hasTokenFunctionDocURL)
}

func (c *conditionBuilder) conditionForResolvedKey(
	ctx context.Context,
	orgID valuer.UUID,
	startNs, endNs uint64,
	key *telemetrytypes.TelemetryFieldKey,
	operator qbtypes.FilterOperator,
	value any,
	sb *sqlbuilder.SelectBuilder,
) (string, error) {
	// hasToken resolves from the key name + flag alone (no column resolution), so handle it first.
	if operator == qbtypes.FilterOperatorHasToken {
		return c.conditionForHasToken(ctx, orgID, key, value, sb)
	}

	columns, err := c.fm.ColumnFor(ctx, orgID, startNs, endNs, key)
	if errors.Is(err, qbtypes.ErrColumnNotFound) && key.FieldContext == telemetrytypes.FieldContextUnspecified {
		key = telemetrytypes.NewTelemetryFieldKey(key.Name, telemetrytypes.FieldContextBody, key.FieldDataType)
		columns, err = c.fm.ColumnFor(ctx, orgID, startNs, endNs, key)
	}
	if err != nil {
		return "", err
	}

	// has/hasAny/hasAll take the body-JSON path, not the normal operator paths.
	if operator.IsArrayFunctionOperator() {
		return c.conditionForArrayFunction(ctx, orgID, key, operator, value, columns, sb)
	}

	// TODO(Piyush): Update this to support multiple JSON columns based on evolutions
	for _, column := range columns {
		if column.Type.GetType() == schema.ColumnTypeEnumJSON && isBodyJSONSearch(key, columns) && c.fl.BooleanOrEmpty(ctx, flagger.FeatureUseJSONBody, featuretypes.NewFlaggerEvaluationContext(orgID)) && key.Name != messageSubField {
			valueType, value := InferDataType(value, operator, key)
			if len(key.JSONPlan) == 0 {
				keyCopy := telemetrytypes.NewTelemetryFieldKey(key.Name, key.FieldContext, key.FieldDataType)
				if err := keyCopy.SetExhaustiveJSONAccessPlan(
					telemetrytypes.JSONColumnMetadata{BaseColumn: LogsV2BodyV2Column}, valueType,
				); err != nil {
					return "", err
				}
				key = keyCopy
			}
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

	fieldExpression, err := c.fm.FieldFor(ctx, orgID, startNs, endNs, key)
	if err != nil {
		return "", err
	}

	// Check if this is a body JSON search (legacy string-body path, JSON flag off).
	if isBodyJSONSearch(key, columns) && !c.fl.BooleanOrEmpty(ctx, flagger.FeatureUseJSONBody, featuretypes.NewFlaggerEvaluationContext(orgID)) {
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

	case qbtypes.FilterOperatorExists, qbtypes.FilterOperatorNotExists:
		if isBodyJSONSearch(key, columns) && !c.fl.BooleanOrEmpty(ctx, flagger.FeatureUseJSONBody, featuretypes.NewFlaggerEvaluationContext(orgID)) {
			if operator == qbtypes.FilterOperatorExists {
				return GetBodyJSONKeyForExists(ctx, key, operator, value), nil
			}
			return "NOT " + GetBodyJSONKeyForExists(ctx, key, operator, value), nil
		}
		pred, err := querybuilder.ExistsExpression(columns, key, startNs, endNs, fieldExpression, operator == qbtypes.FilterOperatorExists)
		if err != nil {
			return "", err
		}
		return sqlbuilder.Escape(pred), nil

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

	}
	return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "unsupported operator: %v", operator)
}

// candidateLookupKeys returns the metadata map only for fold-contexts, where CandidateKeys
// would otherwise fold the prefix into the key name. Handing it the map lets a same-named
// key under another context resolve first (as ColumnExpressionFor does). Strict contexts
// (resource/attribute/scope) get nil so their explicit context is always honored.
func candidateLookupKeys(key *telemetrytypes.TelemetryFieldKey, fieldKeys map[string][]*telemetrytypes.TelemetryFieldKey) map[string][]*telemetrytypes.TelemetryFieldKey {
	if key.FieldContext == telemetrytypes.FieldContextLog {
		return fieldKeys
	}
	return nil
}

func (c *conditionBuilder) ConditionFor(
	ctx context.Context,
	orgID valuer.UUID,
	startNs uint64,
	endNs uint64,
	key *telemetrytypes.TelemetryFieldKey,
	fieldKeys map[string][]*telemetrytypes.TelemetryFieldKey,
	options qbtypes.ConditionBuilderOptions,
	operator qbtypes.FilterOperator,
	value any,
	sb *sqlbuilder.SelectBuilder,
) ([]string, []string, error) {
	matches := querybuilder.MatchingFieldKeys(key, fieldKeys)
	skipResourceFilter := options.SkipResourceFilter

	keys, warning := querybuilder.ResolveKeys(key, matches)
	var warnings []string
	if warning != "" {
		warnings = append(warnings, warning)
	}

	synthesized := false
	if len(keys) == 0 {
		_, isIntrinsicColumn := logsV2Columns[key.Name]
		switch {
		case key.FieldContext == telemetrytypes.FieldContextBody && key.Name == "":
			return nil, warnings, errors.NewInvalidInputf(errors.CodeInvalidInput, "missing key for body json search - expected key of the form `body.key` (ex: `body.status`)")
		case key.FieldContext == telemetrytypes.FieldContextLog && isIntrinsicColumn:
			keys = []*telemetrytypes.TelemetryFieldKey{key}
		default:
			// Fold-contexts get the metadata map so a same-named key under another context
			// wins before the prefix folds into the key name (matching ColumnExpressionFor);
			// strict contexts pass nil and stay honored as-is.
			keys = c.fm.CandidateKeys(ctx, orgID, key, value, candidateLookupKeys(key, fieldKeys))
			if operator.IsFunctionOperator() {
				if key.FieldContext != telemetrytypes.FieldContextBody {
					// has/hasAny/hasAll/hasToken are body-JSON only
					return nil, warnings, querybuilder.NewFunctionUnsupportedError(operator)
				}
				bodyKeys := make([]*telemetrytypes.TelemetryFieldKey, 0, len(keys))
				for _, k := range keys {
					if k.FieldContext == telemetrytypes.FieldContextBody {
						bodyKeys = append(bodyKeys, k)
					}
				}
				keys = bodyKeys
			}
			if len(keys) == 0 {
				return nil, warnings, querybuilder.NewKeyNotFoundError(key.Name)
			}
			synthesized = true
			warnings = append(warnings, querybuilder.NewKeyNotFoundWarning(key.Name))
		}
	}

	if skipResourceFilter && !synthesized {
		filtered := make([]*telemetrytypes.TelemetryFieldKey, 0, len(keys))
		for _, k := range keys {
			if k.FieldContext != telemetrytypes.FieldContextResource {
				filtered = append(filtered, k)
			}
		}
		if len(filtered) == 0 {
			return nil, warnings, nil
		}
		keys = filtered
	}

	conds := make([]string, 0, len(keys))
	for _, k := range keys {
		cond, err := c.conditionForKey(ctx, orgID, startNs, endNs, k, operator, value, sb)
		if err != nil {
			return nil, nil, err
		}
		conds = append(conds, cond)
		if w := c.bodyFullTextDefaultWarning(ctx, orgID, startNs, endNs, k, operator); w != "" {
			warnings = append(warnings, w)
		}
	}
	return conds, warnings, nil
}

// bodyFullTextDefaultWarning returns the advisory shown when a regexp full-text
// search on `body` resolves to the body.message sub-field (JSON mode), else "". This
// keeps the JSON-vs-legacy decision in the builder rather than the filter visitor.
func (c *conditionBuilder) bodyFullTextDefaultWarning(ctx context.Context, orgID valuer.UUID, startNs, endNs uint64, key *telemetrytypes.TelemetryFieldKey, operator qbtypes.FilterOperator) string {
	if operator != qbtypes.FilterOperatorRegexp || key.Name != LogsV2BodyColumn {
		return ""
	}
	if field, err := c.fm.FieldFor(ctx, orgID, startNs, endNs, key); err == nil && field == messageSubColumn {
		return querybuilder.BodyFullTextSearchDefaultWarning
	}
	return ""
}

func (c *conditionBuilder) conditionForKey(
	ctx context.Context,
	orgID valuer.UUID,
	startNs uint64,
	endNs uint64,
	key *telemetrytypes.TelemetryFieldKey,
	operator qbtypes.FilterOperator,
	value any,
	sb *sqlbuilder.SelectBuilder,
) (string, error) {

	condition, err := c.conditionForResolvedKey(ctx, orgID, startNs, endNs, key, operator, value, sb)
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
		if c.fl.BooleanOrEmpty(ctx, flagger.FeatureUseJSONBody, featuretypes.NewFlaggerEvaluationContext(orgID)) {
			return condition, nil
		}
	}

	if buildExistCondition {
		existsCondition, err := c.conditionForResolvedKey(ctx, orgID, startNs, endNs, key, qbtypes.FilterOperatorExists, nil, sb)
		if err != nil {
			return "", err
		}
		return sb.And(condition, existsCondition), nil
	}

	return condition, nil
}
