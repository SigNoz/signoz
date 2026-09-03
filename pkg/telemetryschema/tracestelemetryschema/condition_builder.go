package tracestelemetryschema

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
var _ querybuilder.TermSchema = (*conditionBuilder)(nil)

func NewConditionBuilder(fm qbtypes.FieldMapper) *conditionBuilder {
	return &conditionBuilder{fm: fm}
}

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

// ConditionFor rejects the logs-only function operators and hands the term to
// the generic flow; the traces-specific behavior lives in the TermSchema
// methods below.
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
	// has/hasAny/hasAll/hasToken/search are logs-only functions; reject for traces.
	if err := querybuilder.NewFunctionUnsupportedError(operator); err != nil {
		return nil, nil, err
	}
	scope := querybuilder.CompileScope{OrgID: orgID, StartNs: startNs, EndNs: endNs}
	return querybuilder.CompileTerm(ctx, scope, c, querybuilder.SkipResourceDrop, key, logicalFields, fieldKeys, options, operator, value, sb)
}

// AmendEvidence: a bare key that names a real column filters on the column too — first.
// When metadata only knows the name under other contexts, prepend the column and keep
// metadata matches only where their type is consistent with it (a corrupt entry can't
// degrade the column).
func (c *conditionBuilder) AmendEvidence(ctx context.Context, scope querybuilder.CompileScope, key *telemetrytypes.TelemetryFieldKey, fields []*telemetrytypes.LogicalField) []*telemetrytypes.LogicalField {
	if key.FieldContext != telemetrytypes.FieldContextUnspecified || len(fields) == 0 {
		return fields
	}
	for _, logical := range fields {
		if logical.FieldContext == telemetrytypes.FieldContextSpan {
			return fields
		}
	}
	probe := telemetrytypes.NewTelemetryFieldKey(key.Name, telemetrytypes.FieldContextSpan, key.FieldDataType)
	cols, colErr := c.fm.ColumnFor(ctx, scope.OrgID, scope.StartNs, scope.EndNs, probe)
	if colErr != nil || len(cols) == 0 {
		return fields
	}
	combined := make([]*telemetrytypes.LogicalField, 0, len(fields)+1)
	combined = append(combined, telemetrytypes.SingleLogicalField(key.Name, probe))
	for _, logical := range fields {
		if columnMatchesDataType(cols[0], logical.FieldDataType) {
			combined = append(combined, logical)
		}
	}
	return combined
}

// Synthesize: not in metadata. CandidateKeys resolves it: fold contexts (span/trace) get
// the metadata map so it can honor a real column, correct to a stripped-name metadata
// match, or synthesize; strict contexts pass nil and keep their synthesize path.
func (c *conditionBuilder) Synthesize(ctx context.Context, scope querybuilder.CompileScope, key *telemetrytypes.TelemetryFieldKey, _ qbtypes.FilterOperator, value any, fieldKeys map[string][]*telemetrytypes.TelemetryFieldKey) ([]*telemetrytypes.LogicalField, []string, error) {
	fields := querybuilder.WrapAsLogicalFields(key.Name, c.fm.CandidateKeys(ctx, scope.OrgID, key, value, candidateLookupKeys(key, fieldKeys)))
	if len(fields) == 0 {
		return nil, nil, querybuilder.NewKeyNotFoundError(key.Name)
	}
	return fields, []string{querybuilder.NewKeyNotFoundWarning(key.Name)}, nil
}

// CompileField: span-scope names build their own predicates; everything else compiles
// through the shared operator switch (with the duration coercion in front), and the
// default exists guard applies except to intrinsic columns, which always exist.
func (c *conditionBuilder) CompileField(ctx context.Context, scope querybuilder.CompileScope, logical *telemetrytypes.LogicalField, operator qbtypes.FilterOperator, value any, sb *sqlbuilder.SelectBuilder) (string, []string, error) {
	if c.isSpanScopeField(logical.Name) {
		cond, err := c.buildSpanScopeCondition(logical.Single(), operator, value, scope.StartNs)
		return cond, nil, err
	}

	// TODO(srikanthccv): maybe extend this to every possible attribute
	if logical.Name == "duration_nano" || logical.Name == "durationNano" { // QoL improvement
		coerced, err := coerceDurationValue(value)
		if err != nil {
			return "", nil, err
		}
		value = coerced
	}

	cond, err := querybuilder.CompileFieldWithSharedOperators(ctx, scope, c.fm, logical, operator, value, sb, !c.isIntrinsic(ctx, scope, logical))
	return cond, nil, err
}

// isIntrinsic reports whether the field reads an always-present table column,
// which needs no exists guard.
func (c *conditionBuilder) isIntrinsic(ctx context.Context, scope querybuilder.CompileScope, logical *telemetrytypes.LogicalField) bool {
	field, _ := c.fm.FieldFor(ctx, scope.OrgID, scope.StartNs, scope.EndNs, logical.Single())
	return slices.Contains(maps.Keys(IntrinsicFields), field) ||
		slices.Contains(maps.Keys(IntrinsicFieldsDeprecated), field) ||
		slices.Contains(maps.Keys(CalculatedFields), field) ||
		slices.Contains(maps.Keys(CalculatedFieldsDeprecated), field)
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
