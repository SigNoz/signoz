package telemetrytraces

import (
	"context"
	"fmt"
	"slices"
	"strconv"
	"strings"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/huandu/go-sqlbuilder"
	"golang.org/x/exp/maps"
)

type conditionBuilder struct {
	fm qbtypes.FieldMapper
}

var _ qbtypes.ConditionBuilder = (*conditionBuilder)(nil)

func NewConditionBuilder(fm qbtypes.FieldMapper) *conditionBuilder {
	return &conditionBuilder{fm: fm}
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

	// TODO(srikanthccv): maybe extend this to every possible attribute
	if key.Name == "duration_nano" || key.Name == "durationNano" { // QoL improvement
		switch v := value.(type) {
		case string:
			if duration, err := time.ParseDuration(v); err == nil {
				value = duration.Nanoseconds()
			} else if f, err := strconv.ParseFloat(v, 64); err == nil {
				value = int64(f)
			} else {
				return "", errors.WrapInvalidInputf(err, errors.CodeInvalidInput, "invalid duration value: %s", v)
			}
		case float64:
			value = int64(v)
		case float32:
			value = int64(v)
		}
	}

	fieldExpression, value = querybuilder.DataTypeCollisionHandledFieldName(key, value, fieldExpression, operator)

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
	// in the query builder, `exists` and `not exists` are used for
	// key membership checks, so depending on the column type, the condition changes
	case qbtypes.FilterOperatorExists, qbtypes.FilterOperatorNotExists:
		columns, err := c.fm.ColumnFor(ctx, orgID, startNs, endNs, key)
		if err != nil {
			return "", err
		}
		pred, err := querybuilder.ExistsExpression(columns, key, startNs, endNs, fieldExpression, operator == qbtypes.FilterOperatorExists)
		if err != nil {
			return "", err
		}
		return sqlbuilder.Escape(pred), nil
	}
	return "", nil
}

// isFoldContext reports whether the context is one CandidateKeys would fold the prefix into
// the key name for (span/trace). These behave like a default context that also addresses
// columns and attributes, unlike strict resource/attribute/scope contexts.
func isFoldContext(fc telemetrytypes.FieldContext) bool {
	switch fc {
	case telemetrytypes.FieldContextSpan, telemetrytypes.FieldContextTrace:
		return true
	}
	return false
}

// candidateLookupKeys returns the metadata map only for fold-contexts, where CandidateKeys
// would otherwise fold the prefix into the key name. Handing it the map lets a same-named
// key under another context resolve first (as ColumnExpressionFor does). Strict contexts
// (resource/attribute/scope) get nil so their explicit context is always honored.
func candidateLookupKeys(key *telemetrytypes.TelemetryFieldKey, fieldKeys map[string][]*telemetrytypes.TelemetryFieldKey) map[string][]*telemetrytypes.TelemetryFieldKey {
	if isFoldContext(key.FieldContext) {
		return fieldKeys
	}
	return nil
}

// ConditionFor resolves the referenced key to the key(s) to filter on (ResolveKeys, else
// synthesized keys with a warning) and builds one condition per resolved key. fieldKeys is
// the full metadata map; the builder owns key resolution.
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

	// has/hasAny/hasAll/hasToken are logs-body-only; reject for traces.
	if err := querybuilder.NewFunctionUnsupportedError(operator); err != nil {
		return nil, nil, err
	}

	matches := querybuilder.MatchingFieldKeys(key, fieldKeys)
	skipResourceFilter := options.SkipResourceFilter

	keys, warning := querybuilder.ResolveKeys(key, matches)
	var warnings []string
	if warning != "" {
		warnings = append(warnings, warning)
	}
	// A bare key that names a real column filters on the column too — first. When metadata
	// only knows the name under other contexts, prepend the column and keep metadata matches
	// only where their type is consistent with it (a corrupt entry can't degrade the column).
	if key.FieldContext == telemetrytypes.FieldContextUnspecified && len(keys) > 0 {
		hasColumn := false
		for _, k := range keys {
			if k.FieldContext == telemetrytypes.FieldContextSpan {
				hasColumn = true
				break
			}
		}
		if !hasColumn {
			probe := telemetrytypes.NewTelemetryFieldKey(key.Name, telemetrytypes.FieldContextSpan, key.FieldDataType)
			if cols, colErr := c.fm.ColumnFor(ctx, orgID, startNs, endNs, probe); colErr == nil && len(cols) > 0 {
				combined := make([]*telemetrytypes.TelemetryFieldKey, 0, len(keys)+1)
				combined = append(combined, probe)
				for _, k := range keys {
					if columnMatchesDataType(cols[0], k.FieldDataType) {
						combined = append(combined, k)
					}
				}
				keys = combined
			}
		}
	}

	synthesized := false
	if len(keys) == 0 {
		// Not in metadata. CandidateKeys resolves it: fold contexts (span/trace) get the
		// metadata map so it can honor a real column, correct to a stripped-name metadata
		// match, or synthesize; strict contexts pass nil and keep their synthesize path.
		keys = c.fm.CandidateKeys(ctx, orgID, key, value, candidateLookupKeys(key, fieldKeys))
		if len(keys) == 0 {
			return nil, warnings, querybuilder.NewKeyNotFoundError(key.Name)
		}
		synthesized = true
		warnings = append(warnings, querybuilder.NewKeyNotFoundWarning(key.Name))
	}

	// When a resource sub-query already covers the term, drop resource keys from the main
	// query. Synthesized keys are exempt: the sub-query skips keys absent from metadata.
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
	}
	return conds, warnings, nil
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
	if c.isSpanScopeField(key.Name) {
		return c.buildSpanScopeCondition(key, operator, value, startNs)
	}

	condition, err := c.conditionFor(ctx, orgID, startNs, endNs, key, operator, value, sb)
	if err != nil {
		return "", err
	}

	if operator.AddDefaultExistsFilter() {
		// skip adding exists filter for intrinsic fields
		field, _ := c.fm.FieldFor(ctx, orgID, startNs, endNs, key)
		if slices.Contains(maps.Keys(IntrinsicFields), field) ||
			slices.Contains(maps.Keys(IntrinsicFieldsDeprecated), field) ||
			slices.Contains(maps.Keys(CalculatedFields), field) ||
			slices.Contains(maps.Keys(CalculatedFieldsDeprecated), field) {
			return condition, nil
		}

		existsCondition, err := c.conditionFor(ctx, orgID, startNs, endNs, key, qbtypes.FilterOperatorExists, nil, sb)
		if err != nil {
			return "", err
		}
		return sb.And(condition, existsCondition), nil
	}
	return condition, nil
}

func (c *conditionBuilder) isSpanScopeField(name string) bool {
	keyName := strings.ToLower(name)
	return keyName == SpanSearchScopeRoot || keyName == SpanSearchScopeEntryPoint
}

func (c *conditionBuilder) buildSpanScopeCondition(key *telemetrytypes.TelemetryFieldKey, operator qbtypes.FilterOperator, value any, startNs uint64) (string, error) {
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
