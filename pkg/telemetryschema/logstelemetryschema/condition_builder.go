package logstelemetryschema

import (
	"context"
	"fmt"
	"regexp"

	schema "github.com/SigNoz/signoz-otel-collector/cmd/signozschemamigrator/schema_migrator"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"

	"github.com/huandu/go-sqlbuilder"
)

// conditionForSearch ORs a case-insensitive match of the search term across the key
// context's searchable columns (unspecified context = every column).
func (s *storage) conditionForSearch(
	q qbtypes.QueryInfo,
	key *telemetrytypes.TelemetryFieldKey,
	value any,
	sb *sqlbuilder.SelectBuilder,
) ([]string, []string, error) {
	// QuoteMeta + LOWER on both sides, not (?i): a literal match that can still use the
	// LOWER(toString(body_v2)) skip index.
	term := regexp.QuoteMeta(fmt.Sprintf("%v", value))

	useJSONBody := q.BodyJSONOn

	var conditions []string

	for _, col := range searchColumns(key.FieldContext, useJSONBody) {
		switch col.Type.GetType() {
		case schema.ColumnTypeEnumMap:
			keysExpr := fmt.Sprintf("mapKeys(%s)", col.Name)
			valsExpr := fmt.Sprintf("mapValues(%s)", col.Name)
			// match() needs a String array; cast non-string map values first.
			if mc, ok := col.Type.(schema.MapColumnType); ok && mc.ValueType.GetType() != schema.ColumnTypeEnumString {
				valsExpr = fmt.Sprintf("arrayMap(x -> toString(x), mapValues(%s))", col.Name)
			}
			conditions = append(conditions, sb.Or(
				fmt.Sprintf("arrayExists(x -> match(LOWER(x), LOWER(%s)), %s)", sb.Var(term), keysExpr),
				fmt.Sprintf("arrayExists(x -> match(LOWER(x), LOWER(%s)), %s)", sb.Var(term), valsExpr),
			))
		case schema.ColumnTypeEnumJSON:
			conditions = append(conditions, fmt.Sprintf("match(LOWER(toString(%s)), LOWER(%s))", col.Name, sb.Var(term)))
		case schema.ColumnTypeEnumString, schema.ColumnTypeEnumLowCardinality:
			conditions = append(conditions, fmt.Sprintf("match(LOWER(%s), LOWER(%s))", col.Name, sb.Var(term)))
		default:
			return nil, nil, errors.NewInternalf(errors.CodeInternal, "search does not support the column type of %q", col.Name)
		}
	}

	if len(conditions) == 0 {
		return nil, nil, nil
	}
	// The advisory rides on CostGuard (set by the visitor), not warnings.
	return []string{sb.Or(conditions...)}, nil, nil
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
func (s *storage) conditionForArrayFunction(
	q qbtypes.QueryInfo,
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

	if q.BodyJSONOn {
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
		// Pin the needle array type to the haystack; scalar fallback below coerces value-level.
		arrayCond := fmt.Sprintf("%s(%s, %s)", operator.FunctionName(), arrayExpr, castNeedleArray(elemType, sb.Var(vals)))
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

// castNeedleArray pins an Int64 needle array to Array(Int64) so it matches the Array(Nullable(Int64))
// haystack; without it a needle >= 2^32 binds as Array(UInt64) and hasAny/hasAll error (code 386).
func castNeedleArray(elemType telemetrytypes.FieldDataType, arg string) string {
	if elemType == telemetrytypes.FieldDataTypeInt64 {
		return fmt.Sprintf("CAST(%s AS Array(Int64))", arg)
	}
	return arg
}

// firstTokenSeparator returns the first char of s that hasToken treats as a token separator
// (anything other than an ASCII letter or digit), and whether one was found.
func firstTokenSeparator(s string) (string, bool) {
	for _, r := range s {
		isAlphaNum := (r >= '0' && r <= '9') || (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z')
		if !isAlphaNum {
			return string(r), true
		}
	}
	return "", false
}

// conditionForHasToken builds a hasToken full-text search over the body column, resolving the
// column from the key name + use_json_body flag.
func (s *storage) conditionForHasToken(
	q qbtypes.QueryInfo,
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
	needleStr, ok := needle.(string)
	if !ok {
		return "", errors.NewInvalidInputf(errors.CodeInvalidInput,
			"function `hasToken` expects value parameter to be a string").WithUrl(hasTokenFunctionDocURL)
	}

	// A multi-token needle makes CH hasToken error (code 36); reject up front as a 400. Both modes flow here.
	if sep, found := firstTokenSeparator(needleStr); found {
		return "", errors.NewInvalidInputf(errors.CodeInvalidInput,
			"function `hasToken` matches a single whole token, but %q contains the separator %q; use a substring filter (e.g. `body CONTAINS '%s'`) to search across separators",
			needleStr, sep, needleStr).WithUrl(hasTokenFunctionDocURL)
	}

	bodyJSONEnabled := q.BodyJSONOn

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

func (s *storage) conditionForResolvedKey(
	ctx context.Context,
	q qbtypes.QueryInfo,
	key *telemetrytypes.TelemetryFieldKey,
	operator qbtypes.FilterOperator,
	value any,
	sb *sqlbuilder.SelectBuilder,
) (string, error) {
	// hasToken resolves from the key name + flag alone (no column resolution), so handle it first.
	if operator == qbtypes.FilterOperatorHasToken {
		return s.conditionForHasToken(q, key, value, sb)
	}

	columns, err := s.getColumn(q, key)
	if errors.Is(err, qbtypes.ErrColumnNotFound) && key.FieldContext == telemetrytypes.FieldContextUnspecified {
		key = telemetrytypes.NewTelemetryFieldKey(key.Name, telemetrytypes.FieldContextBody, key.FieldDataType)
		columns, err = s.getColumn(q, key)
	}
	if err != nil {
		return "", err
	}

	// has/hasAny/hasAll take the body-JSON path, not the normal operator paths.
	if operator.IsArrayFunctionOperator() {
		return s.conditionForArrayFunction(q, key, operator, value, columns, sb)
	}

	// TODO(Piyush): Update this to support multiple JSON columns based on evolutions
	for _, column := range columns {
		if column.Type.GetType() == schema.ColumnTypeEnumJSON && isBodyJSONSearch(key, columns) && q.BodyJSONOn && key.Name != messageSubField {
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

	fieldExpression, err := s.Read(ctx, q, key)
	if err != nil {
		return "", err
	}

	// Check if this is a body JSON search (legacy string-body path, JSON flag off).
	if isBodyJSONSearch(key, columns) && !q.BodyJSONOn {
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
		if isBodyJSONSearch(key, columns) && !q.BodyJSONOn {
			if operator == qbtypes.FilterOperatorExists {
				return GetBodyJSONKeyForExists(ctx, key, operator, value), nil
			}
			return "NOT " + GetBodyJSONKeyForExists(ctx, key, operator, value), nil
		}
		pred, err := querybuilder.ExistsExpression(columns, key, q.StartNs, q.EndNs, fieldExpression, operator == qbtypes.FilterOperatorExists)
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
			cond, err := s.conditionForResolvedKey(ctx, q, key, qbtypes.FilterOperatorEqual, value, sb)
			if err != nil {
				return "", err
			}
			conditions = append(conditions, cond)
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
			cond, err := s.conditionForResolvedKey(ctx, q, key, qbtypes.FilterOperatorNotEqual, value, sb)
			if err != nil {
				return "", err
			}
			conditions = append(conditions, cond)
		}
		return sb.And(conditions...), nil

	}
	return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "unsupported operator: %v", operator)
}

// bodyFullTextDefaultWarning returns the advisory shown when a regexp full-text
// search on `body` resolves to the body.message sub-field (JSON mode), else "". This
// keeps the JSON-vs-legacy decision in the builder rather than the filter visitor.
func (s *storage) bodyFullTextDefaultWarning(ctx context.Context, q qbtypes.QueryInfo, key *telemetrytypes.TelemetryFieldKey, operator qbtypes.FilterOperator) string {
	if operator != qbtypes.FilterOperatorRegexp || key.Name != LogsV2BodyColumn {
		return ""
	}
	if field, err := s.Read(ctx, q, key); err == nil && field == messageSubColumn {
		return querybuilder.BodyFullTextSearchDefaultWarning
	}
	return ""
}

func (s *storage) conditionForKey(
	ctx context.Context,
	q qbtypes.QueryInfo,
	key *telemetrytypes.TelemetryFieldKey,
	operator qbtypes.FilterOperator,
	value any,
	sb *sqlbuilder.SelectBuilder,
) (string, error) {

	condition, err := s.conditionForResolvedKey(ctx, q, key, operator, value, sb)
	if err != nil {
		return "", err
	}

	// Skip adding exists filter for intrinsic fields i.e. Table level log context fields
	buildExistCondition := operator.AddDefaultExistsFilter()
	switch key.FieldContext {
	case telemetrytypes.FieldContextLog:
		// pass; No need to build exist condition for top level columns
		// immediately return
		return condition, nil
	case telemetrytypes.FieldContextScope:
		// scope_name and scope_version are columns; a scope attribute lives in
		// a map and follows the keyless contract like an attribute
		if !s.mapBacked(q, key) {
			return condition, nil
		}
	case telemetrytypes.FieldContextResource, telemetrytypes.FieldContextAttribute:
		// build exist condition for resource and attribute fields based on filter operator
	case telemetrytypes.FieldContextBody:
		// Querying JSON fields already account for Nullability of fields
		// so additional exists checks are not needed
		if q.BodyJSONOn {
			return condition, nil
		}
	}

	if buildExistCondition {
		existsCondition, err := s.conditionForResolvedKey(ctx, q, key, qbtypes.FilterOperatorExists, nil, sb)
		if err != nil {
			return "", err
		}
		return sb.And(condition, existsCondition), nil
	}

	return condition, nil
}

// mapBacked reports whether the key reads a map column, so a row can lack it.
func (s *storage) mapBacked(q qbtypes.QueryInfo, key *telemetrytypes.TelemetryFieldKey) bool {
	columns, err := s.getColumn(q, key)
	return err == nil && len(columns) == 1 && columns[0].Type.GetType() == schema.ColumnTypeEnumMap
}

// Compile keeps the body language: search over a scope, the body functions,
// the body JSON paths, and the body column forms that use its index. Every
// other field compiles through the shared condition.
func (s *storage) Compile(ctx context.Context, q qbtypes.QueryInfo, logical *telemetrytypes.LogicalField, operator qbtypes.FilterOperator, value any, sb *sqlbuilder.SelectBuilder) (qbtypes.Compiled, error) {
	if operator == qbtypes.FilterOperatorSearch {
		conditions, _, err := s.conditionForSearch(q, logical.Single(), value, sb)
		if err != nil || len(conditions) == 0 {
			return qbtypes.Compiled{}, err
		}
		return qbtypes.Compiled{Condition: conditions[0]}, nil
	}
	if logical.IsFamily() || !s.ownLanguage(logical.Single(), operator) {
		return querybuilder.SharedCondition(ctx, q, s, logical, operator, value, sb)
	}
	key := logical.Single()
	condition, err := s.conditionForKey(ctx, q, key, operator, value, sb)
	if err != nil {
		return qbtypes.Compiled{}, err
	}
	compiled := qbtypes.Compiled{Condition: condition}
	if w := s.bodyFullTextDefaultWarning(ctx, q, key, operator); w != "" {
		compiled.Warnings = append(compiled.Warnings, w)
	}
	return compiled, nil
}

// ownLanguage reports whether a term needs the body language: a body path,
// a body function, or the body column itself.
func (s *storage) ownLanguage(key *telemetrytypes.TelemetryFieldKey, operator qbtypes.FilterOperator) bool {
	if operator.IsFunctionOperator() || key.FieldContext == telemetrytypes.FieldContextBody {
		return true
	}
	return key.Name == LogsV2BodyColumn && (key.FieldContext == telemetrytypes.FieldContextLog || key.FieldContext == telemetrytypes.FieldContextUnspecified)
}
