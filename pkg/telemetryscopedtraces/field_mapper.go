package telemetryscopedtraces

import (
	"context"
	"strings"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/huandu/go-sqlbuilder"
)

// fieldMapper resolves aggregate-column SQL through the shared field mapper and
// condition builder, following their method shapes (FieldFor / ConditionFor / …) so
// column resolution reads like the other statement builders. keys is the fetched
// metadata for the keys the columns reference; the gate mask is set by the builder
// after resolveMask (Scoped* aggregates embed it). All returned expressions are
// escaped once, ready to embed in an outer builder.
type fieldMapper struct {
	fm       qbtypes.FieldMapper
	cb       qbtypes.ConditionBuilder
	keys     map[string][]*telemetrytypes.TelemetryFieldKey
	maskExpr string
	maskArgs []any
}

func newFieldMapper(fm qbtypes.FieldMapper, cb qbtypes.ConditionBuilder, keys map[string][]*telemetrytypes.TelemetryFieldKey) *fieldMapper {
	return &fieldMapper{fm: fm, cb: cb, keys: keys}
}

// FieldFor returns the column expression for key via the field mapper.
func (r *fieldMapper) FieldFor(ctx context.Context, orgID valuer.UUID, startNs, endNs uint64, key *telemetrytypes.TelemetryFieldKey) (string, error) {
	expr, err := r.fm.FieldFor(ctx, orgID, startNs, endNs, key)
	if err != nil {
		return "", err
	}
	return sqlbuilder.Escape(expr), nil
}

// ConditionFor returns a boolean predicate for key via the condition builder
// (materialized column when present, else map access).
func (r *fieldMapper) ConditionFor(ctx context.Context, orgID valuer.UUID, startNs, endNs uint64, key *telemetrytypes.TelemetryFieldKey, op qbtypes.FilterOperator, value any) (string, []any, error) {
	sb := sqlbuilder.NewSelectBuilder()
	// The condition builder owns key resolution: hand it the raw key plus the full
	// metadata map and it matches/synthesizes the candidates itself.
	conds, _, err := r.cb.ConditionFor(ctx, orgID, startNs, endNs, key, r.keys, qbtypes.ConditionBuilderOptions{}, op, value, sb)
	if err != nil {
		return "", nil, err
	}
	if len(conds) == 0 {
		return "", nil, nil
	}
	// One condition per candidate variant (a key can be ingested under several data
	// types); OR them all, like the visitor does for EXISTS.
	if len(conds) == 1 {
		sb.Where(conds[0])
	} else {
		sb.Where(sb.Or(conds...))
	}
	expr, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	expr = strings.TrimPrefix(expr, "WHERE ")
	return sqlbuilder.Escape(expr), args, nil
}

// ExistsFor returns the EXISTS predicate for key.
func (r *fieldMapper) ExistsFor(ctx context.Context, orgID valuer.UUID, startNs, endNs uint64, key *telemetrytypes.TelemetryFieldKey) (string, []any, error) {
	return r.ConditionFor(ctx, orgID, startNs, endNs, key, qbtypes.FilterOperatorExists, nil)
}

// ValueFor returns the value expression for an attribute key. The metadata variant
// is preferred because it carries Materialized — a provider's static definition
// never does, so a promoted attribute would otherwise fall back to map access.
func (r *fieldMapper) ValueFor(ctx context.Context, orgID valuer.UUID, startNs, endNs uint64, key *telemetrytypes.TelemetryFieldKey, dt telemetrytypes.FieldDataType) (string, []any, error) {
	if cands := r.keys[key.Name]; len(cands) > 0 {
		key = cands[0]
	}
	expr, err := r.fm.ColumnExpressionFor(ctx, orgID, startNs, endNs, key, dt, r.keys)
	if err != nil {
		return "", nil, err
	}
	// Escape before embedding in the outer builder: a materialized column name carries
	// `$$` (from the dotted attribute name), which go-sqlbuilder's Build would otherwise
	// unescape to a single `$` and reference the wrong column.
	return sqlbuilder.Escape(expr), nil, nil
}
