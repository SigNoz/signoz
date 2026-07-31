package scopedtracesstatementbuilder

import (
	"context"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/huandu/go-sqlbuilder"
)

// predicateResolver resolves key + operator + value to boolean predicates through the
// shared condition builder, following its method shapes (ConditionFor / ExistsFor).
// keys is the fetched metadata for the keys the scope's columns reference; the gate
// mask is set by the builder after resolveMask (Scoped* aggregates embed it). Args
// bind into sb as $n markers, so returned predicates can be embedded anywhere in sb
// (SELECT, WHERE, HAVING) and every occurrence resolves to the same arg.
type predicateResolver struct {
	cb       qbtypes.ConditionBuilder
	keys     map[string][]*telemetrytypes.TelemetryFieldKey
	sb       *sqlbuilder.SelectBuilder
	maskExpr string
}

func newPredicateResolver(cb qbtypes.ConditionBuilder, keys map[string][]*telemetrytypes.TelemetryFieldKey, sb *sqlbuilder.SelectBuilder) *predicateResolver {
	return &predicateResolver{cb: cb, keys: keys, sb: sb}
}

// ConditionFor returns a boolean predicate for key via the condition builder
// (materialized column when present, else map access), args bound into sb.
func (r *predicateResolver) ConditionFor(ctx context.Context, orgID valuer.UUID, startNs, endNs uint64, key *telemetrytypes.TelemetryFieldKey, op qbtypes.FilterOperator, value any) (string, error) {
	// The condition builder owns key resolution: hand it the raw key plus the full
	// metadata map and it matches/synthesizes the candidates itself.
	conds, _, err := r.cb.ConditionFor(ctx, orgID, startNs, endNs, key, r.keys, qbtypes.ConditionBuilderOptions{}, op, value, r.sb)
	if err != nil {
		return "", err
	}
	if len(conds) == 0 {
		return "", nil
	}
	// One condition per candidate variant (a key can be ingested under several data
	// types); OR them all, like the visitor does for EXISTS.
	if len(conds) == 1 {
		return conds[0], nil
	}
	return r.sb.Or(conds...), nil
}

// ExistsFor returns the EXISTS predicate for key.
func (r *predicateResolver) ExistsFor(ctx context.Context, orgID valuer.UUID, startNs, endNs uint64, key *telemetrytypes.TelemetryFieldKey) (string, error) {
	return r.ConditionFor(ctx, orgID, startNs, endNs, key, qbtypes.FilterOperatorExists, nil)
}
