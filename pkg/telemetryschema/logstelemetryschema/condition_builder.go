package logstelemetryschema

import (
	"context"
	"fmt"
	"strings"

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

// conditionForSearch ORs a case-insensitive match of the search term across the key
// context's searchable columns (unspecified context = every column).
func (c *conditionBuilder) conditionForSearch(
	ctx context.Context,
	orgID valuer.UUID,
	key *telemetrytypes.TelemetryFieldKey,
	value any,
	sb *sqlbuilder.SelectBuilder,
) ([]string, []string, error) {
	// A literal substring match, LOWER on both sides (what ILike renders) rather than (?i),
	// so the lowered skip indexes still match the expression.
	pattern := "%" + escapeLikeLiteral(fmt.Sprintf("%v", value)) + "%"

	useJSONBody := c.fl.BooleanOrEmpty(ctx, flagger.FeatureUseJSONBody, featuretypes.NewFlaggerEvaluationContext(orgID))

	var conditions []string

	for _, col := range searchColumns(key.FieldContext, useJSONBody) {
		switch col.Type.GetType() {
		case schema.ColumnTypeEnumMap:
			keysExpr := fmt.Sprintf("mapKeys(%s)", col.Name)
			valsExpr := fmt.Sprintf("mapValues(%s)", col.Name)
			// arrayExists over mapValues matches no index expression - only has/hasAny do - so these
			// arms cannot prune whatever the case folding, and carry no companion.
			// LIKE needs a String array; cast non-string map values first.
			if mc, ok := col.Type.(schema.MapColumnType); ok && mc.ValueType.GetType() != schema.ColumnTypeEnumString {
				valsExpr = fmt.Sprintf("arrayMap(x -> toString(x), mapValues(%s))", col.Name)
			}
			conditions = append(conditions, sb.Or(
				fmt.Sprintf("arrayExists(x -> %s, %s)", sb.ILike("x", pattern), keysExpr),
				fmt.Sprintf("arrayExists(x -> %s, %s)", sb.ILike("x", pattern), valsExpr),
			))
		case schema.ColumnTypeEnumJSON:
			conditions = append(conditions, sb.ILike(fmt.Sprintf("toString(%s)", col.Name), pattern))
		case schema.ColumnTypeEnumString, schema.ColumnTypeEnumLowCardinality:
			conditions = append(conditions, sb.ILike(col.Name, pattern))
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

// numberAttributeIndexPredicate returns what an equality on a numeric attribute implies over
// mapValues(attributes_number), which its bloom filter indexes while the subscript the comparison
// reads matches nothing. The paired mapContains is what makes membership hold for the zero default.
func numberAttributeIndexPredicate(columns []*schema.Column, value any, sb *sqlbuilder.SelectBuilder) string {
	if len(columns) != 1 || columns[0].Name != LogsV2AttributesNumberColumn {
		return ""
	}
	// a non-numeric value means the collision handler compared the column as text, where an
	// Array(Float64) membership check has no supertype
	switch value.(type) {
	case int, int8, int16, int32, int64, uint, uint8, uint16, uint32, uint64, float32, float64:
		return fmt.Sprintf("has(mapValues(%s), %s)", LogsV2AttributesNumberColumn, sb.Var(value))
	}
	return ""
}

// stringAttributeIndexPredicate returns the raw-value match a case-insensitive one implies when
// the pattern holds no ASCII letter, LOWER being the identity on those bytes. A letter breaks it:
// an `a` in the pattern may have come from an `A` in the value.
func stringAttributeIndexPredicate(columns []*schema.Column, fieldExpression, pattern string, sb *sqlbuilder.SelectBuilder) string {
	if len(columns) != 1 || columns[0].Name != LogsV2AttributesStringColumn {
		return ""
	}
	if strings.ContainsFunc(pattern, func(r rune) bool { return (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') }) {
		return ""
	}
	return sb.Like(fieldExpression, pattern)
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

	element := value
	if args, ok := value.([]any); ok && len(args) > 0 {
		element = args[0]
	}

	if c.fl.BooleanOrEmpty(ctx, flagger.FeatureUseJSONBody, featuretypes.NewFlaggerEvaluationContext(orgID)) {
		// JSON access plan: data-type collision handling, nested array paths.
		valueType, element := InferDataType(element, operator, key)
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
		return NewJSONConditionBuilder(key, valueType).buildArrayFunctionCondition(operator, element, sb)
	}

	return c.legacyArrayFunctionCondition(key, operator, element, sb), nil
}

// legacyArrayFunctionCondition builds the has-family comparison over the plain body string, with
// what it implies over the indexed LOWER(body): the path, since the extraction yields nothing for an
// absent one, and each element, since it must appear in the text. The comparison decides the row.
func (c *conditionBuilder) legacyArrayFunctionCondition(
	key *telemetrytypes.TelemetryFieldKey,
	operator qbtypes.FilterOperator,
	element any,
	sb *sqlbuilder.SelectBuilder,
) string {
	// type-matched array extraction, OR-ed with a scalar comparison for a scalar body value
	// (coalesced to false so NOT has() matches missing-key rows).
	elemType := legacyElemType(element)
	arrayExpr := getBodyJSONArrayKey(key, elemType)
	scalarExpr, scalarGuard, hasScalar := getBodyJSONScalarKey(key, elemType)

	elements, isList := element.([]any)
	if !isList {
		elements = []any{element}
	}
	vals := make([]any, len(elements))
	for i, v := range elements {
		vals[i] = legacyCoerceElement(v, elemType)
	}

	var cond string
	switch {
	case isList:
		// Pin the element array type to the array it is tested against; scalar fallback below coerces value-level.
		arrayCond := fmt.Sprintf("%s(%s, %s)", operator.FunctionName(), arrayExpr, castElementArray(elemType, sb.Var(vals)))
		if !hasScalar {
			cond = arrayCond
			break
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
		cond = fmt.Sprintf("(%s OR ifNull(%s, false))", arrayCond, sb.And(membership, scalarGuard))
	default:
		arrayCond := fmt.Sprintf("%s(%s, %s)", operator.FunctionName(), arrayExpr, sb.Var(vals[0]))
		if !hasScalar {
			cond = arrayCond
			break
		}
		cond = fmt.Sprintf("(%s OR ifNull(%s, false))", arrayCond, sb.And(sb.E(scalarExpr, vals[0]), scalarGuard))
	}

	predicates := []string{cond}
	if predicate := bodyIndexPredicate(bodyPathLiterals(key), sb); predicate != "" {
		predicates = append(predicates, predicate)
	}
	// only strings imply text: the family compares at the element type it infers, so a quoted
	// number is still a number here and its digits need not appear in the body
	if elemType == telemetrytypes.FieldDataTypeString {
		predicates = append(predicates, elementLiterals(operator, elements, sb)...)
	}
	if len(predicates) > 1 {
		return sb.And(predicates...)
	}
	return cond
}

// elementLiterals returns what the elements of a has-family filter imply about the body text. has
// and hasAll require every one, so each becomes its own predicate; hasAny requires only one, so the
// arms are ORed - and an element yielding no literal leaves that OR unassertable.
func elementLiterals(operator qbtypes.FilterOperator, elements []any, sb *sqlbuilder.SelectBuilder) []string {
	if operator == qbtypes.FilterOperatorHasAny {
		// resolve every element before binding anything: one unusable element voids the whole OR
		runSets := make([][]string, 0, len(elements))
		for _, v := range elements {
			str, ok := v.(string)
			if !ok {
				return nil
			}
			runs := jsonTextRuns(str)
			if len(runs) == 0 {
				return nil
			}
			runSets = append(runSets, runs)
		}
		arms := make([]string, 0, len(runSets))
		for _, runs := range runSets {
			arms = append(arms, bodyIndexPredicate(runs, sb))
		}
		if len(arms) == 0 {
			return nil
		}
		return []string{sb.Or(arms...)}
	}

	var predicates []string
	for _, v := range elements {
		str, ok := v.(string)
		if !ok {
			continue
		}
		if predicate := bodyIndexPredicate(jsonTextRuns(str), sb); predicate != "" {
			predicates = append(predicates, predicate)
		}
	}
	return predicates
}

// castElementArray pins an Int64 element array to Array(Int64) so it matches the Array(Nullable(Int64))
// it is tested against; without it an element >= 2^32 binds as Array(UInt64) and hasAny/hasAll error (code 386).
func castElementArray(elemType telemetrytypes.FieldDataType, arg string) string {
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
func (c *conditionBuilder) conditionForHasToken(
	ctx context.Context,
	orgID valuer.UUID,
	key *telemetrytypes.TelemetryFieldKey,
	value any,
	sb *sqlbuilder.SelectBuilder,
) (string, error) {
	// hasToken takes a single token; unwrap it from the function-argument slice.
	token := value
	if args, ok := value.([]any); ok && len(args) > 0 {
		token = args[0]
	}

	// hasToken matches string tokens only.
	tokenStr, ok := token.(string)
	if !ok {
		return "", errors.NewInvalidInputf(errors.CodeInvalidInput,
			"function `hasToken` expects value parameter to be a string").WithUrl(hasTokenFunctionDocURL)
	}

	// A multi-token value makes CH hasToken error (code 36); reject up front as a 400. Both modes flow here.
	if sep, found := firstTokenSeparator(tokenStr); found {
		return "", errors.NewInvalidInputf(errors.CodeInvalidInput,
			"function `hasToken` matches a single whole token, but %q contains the separator %q; use a substring filter (e.g. `body CONTAINS '%s'`) to search across separators",
			tokenStr, sep, tokenStr).WithUrl(hasTokenFunctionDocURL)
	}

	bodyJSONEnabled := c.fl.BooleanOrEmpty(ctx, flagger.FeatureUseJSONBody, featuretypes.NewFlaggerEvaluationContext(orgID))

	if !bodyJSONEnabled {
		// legacy: token search over the plain body string column only.
		if key.Name != LogsV2BodyColumn {
			return "", errors.NewInvalidInputf(errors.CodeInvalidInput,
				"function `hasToken` only supports body field as first parameter").WithUrl(hasTokenFunctionDocURL)
		}
		return fmt.Sprintf("hasToken(LOWER(%s), LOWER(%s))", LogsV2BodyColumn, sb.Var(token)), nil
	}

	// JSON mode: a bare body/body.message key searches the body.message column; any other body
	// field is a token search over its JSON string field, incl. strings nested in arrays.
	// `body.message` resolves to a body-context key named `message`, so match that too — else it
	// falls through and emits dynamicElement over the already-typed String column, which errors.
	if key.Name == LogsV2BodyColumn || key.Name == bodyMessageField ||
		(key.FieldContext == telemetrytypes.FieldContextBody && key.Name == messageSubField) {
		return fmt.Sprintf("hasToken(LOWER(%s), LOWER(%s))", bodyMessageField, sb.Var(token)), nil
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
		return NewJSONConditionBuilder(key, telemetrytypes.FieldDataTypeString).buildTokenFunctionCondition(token, sb)
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

	useJSONBody := c.fl.BooleanOrEmpty(ctx, flagger.FeatureUseJSONBody, featuretypes.NewFlaggerEvaluationContext(orgID))
	legacyBodyJSONSearch := isBodyJSONSearch(key, columns) && !useJSONBody

	// has/hasAny/hasAll take the body-JSON path, not the normal operator paths.
	if operator.IsArrayFunctionOperator() {
		return c.conditionForArrayFunction(ctx, orgID, key, operator, value, columns, sb)
	}

	// TODO(Piyush): Update this to support multiple JSON columns based on evolutions
	for _, column := range columns {
		if column.Type.GetType() == schema.ColumnTypeEnumJSON && isBodyJSONSearch(key, columns) && useJSONBody && key.Name != messageSubField {
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
	if legacyBodyJSONSearch {
		return c.conditionForLegacyBodyJSON(ctx, orgID, startNs, endNs, key, operator, value, columns, sb)
	}

	fieldExpression, value = querybuilder.DataTypeCollisionHandledFieldName(key, value, fieldExpression, operator)

	return c.conditionForOperator(ctx, orgID, startNs, endNs, key, operator, value, columns, fieldExpression, sb)
}

// conditionForLegacyBodyJSON renders a filter over a path inside the plain string body, with what it
// implies over the indexed LOWER(body) - nothing such a filter compares matches an index expression.
func (c *conditionBuilder) conditionForLegacyBodyJSON(
	ctx context.Context,
	orgID valuer.UUID,
	startNs, endNs uint64,
	key *telemetrytypes.TelemetryFieldKey,
	operator qbtypes.FilterOperator,
	value any,
	columns []*schema.Column,
	sb *sqlbuilder.SelectBuilder,
) (string, error) {
	if operator == qbtypes.FilterOperatorExists || operator == qbtypes.FilterOperatorNotExists {
		exists := GetBodyJSONKeyForExists(ctx, key, operator, value)
		if operator == qbtypes.FilterOperatorNotExists {
			// matches the rows without the path, which say nothing about the body text
			return "NOT " + exists, nil
		}
		if predicate := bodyIndexPredicate(bodyPathLiterals(key), sb); predicate != "" {
			return sb.And(exists, predicate), nil
		}
		return exists, nil
	}

	fieldExpression, value := GetBodyJSONKey(ctx, key, operator, value)
	fieldExpression, value = querybuilder.DataTypeCollisionHandledFieldName(key, value, fieldExpression, operator)
	cond, err := c.conditionForOperator(ctx, orgID, startNs, endNs, key, operator, value, columns, fieldExpression, sb)
	if err != nil {
		return "", err
	}
	if predicate := bodyIndexPredicate(bodyValueLiterals(operator, value), sb); predicate != "" {
		return sb.And(cond, predicate), nil
	}
	return cond, nil
}

// conditionForOperator renders the comparison itself, once the field expression and value have been
// resolved for the column the key landed on.
func (c *conditionBuilder) conditionForOperator(
	ctx context.Context,
	orgID valuer.UUID,
	startNs, endNs uint64,
	key *telemetrytypes.TelemetryFieldKey,
	operator qbtypes.FilterOperator,
	value any,
	columns []*schema.Column,
	fieldExpression string,
	sb *sqlbuilder.SelectBuilder,
) (string, error) {

	// make use of case insensitive index for body
	if fieldExpression == "body" || fieldExpression == messageSubColumn {
		switch operator {
		case qbtypes.FilterOperatorEqual:
			// Bloom filters index lower(body), not the column; `=` still decides the row.
			if _, ok := value.(string); ok && fieldExpression == LogsV2BodyColumn {
				return sb.And(
					sb.E(fieldExpression, value),
					fmt.Sprintf("LOWER(%s) = LOWER(%s)", fieldExpression, sb.Var(value)),
				), nil
			}
		case qbtypes.FilterOperatorLike:
			if _, ok := value.(string); ok && fieldExpression == LogsV2BodyColumn {
				return sb.And(
					sb.Like(fieldExpression, value),
					sb.ILike(fieldExpression, value),
				), nil
			}
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
		if predicate := numberAttributeIndexPredicate(columns, value, sb); predicate != "" {
			return sb.And(sb.E(fieldExpression, value), predicate), nil
		}
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
		if pattern, ok := value.(string); ok {
			if predicate := stringAttributeIndexPredicate(columns, fieldExpression, pattern, sb); predicate != "" {
				return sb.And(sb.ILike(fieldExpression, pattern), predicate), nil
			}
		}
		return sb.ILike(fieldExpression, value), nil
	case qbtypes.FilterOperatorNotILike:
		return sb.NotILike(fieldExpression, value), nil

	case qbtypes.FilterOperatorExists, qbtypes.FilterOperatorNotExists:
		pred, err := querybuilder.ExistsExpression(columns, key, startNs, endNs, fieldExpression, operator == qbtypes.FilterOperatorExists)
		if err != nil {
			return "", err
		}
		return sqlbuilder.Escape(pred), nil

	case qbtypes.FilterOperatorContains:
		// The map value indexes are over raw mapValues, which a case-insensitive match reaches only
		// for the patterns stringAttributeIndexPredicate can assert the raw value from.
		pattern := fmt.Sprintf("%%%s%%", value)
		if predicate := stringAttributeIndexPredicate(columns, fieldExpression, pattern, sb); predicate != "" {
			return sb.And(sb.ILike(fieldExpression, pattern), predicate), nil
		}
		return sb.ILike(fieldExpression, pattern), nil
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
			cond, err := c.conditionForResolvedKey(ctx, orgID, startNs, endNs, key, qbtypes.FilterOperatorEqual, value, sb)
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
			cond, err := c.conditionForResolvedKey(ctx, orgID, startNs, endNs, key, qbtypes.FilterOperatorNotEqual, value, sb)
			if err != nil {
				return "", err
			}
			conditions = append(conditions, cond)
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
	matches := querybuilder.MatchingLogicalFields(ctx, orgID, nil, key, fieldKeys)
	skipResourceFilter := options.SkipResourceFilter

	// search() resolves its own (optional) scope; handle it before key resolution.
	if operator == qbtypes.FilterOperatorSearch {
		return c.conditionForSearch(ctx, orgID, key, value, sb)
	}

	// Logs fields have no family support yet, so every logical field is
	// single-member and flattens losslessly to its physical key.
	resolved, warning := querybuilder.ResolveLogicalFields(key, matches)
	keys := querybuilder.SingleKeys(resolved)
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
