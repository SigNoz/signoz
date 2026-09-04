package scopedtracesstatementbuilder

import (
	"context"

	"github.com/SigNoz/signoz/pkg/flagger"
	"github.com/SigNoz/signoz/pkg/querybuilder"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/huandu/go-sqlbuilder"
)

// predicateResolver resolves key + operator + value to boolean predicates through the
// shared condition builder. Args bind into sb as $n markers, so returned predicates
// can be embedded anywhere in sb; maskExpr is set by the builder after resolveMask
// (Scoped* aggregates embed it).
type predicateResolver struct {
	cb       qbtypes.ConditionBuilder
	fl       flagger.Flagger
	keys     map[string][]*telemetrytypes.TelemetryFieldKey
	sb       *sqlbuilder.SelectBuilder
	maskExpr string
}

func newPredicateResolver(cb qbtypes.ConditionBuilder, fl flagger.Flagger, keys map[string][]*telemetrytypes.TelemetryFieldKey, sb *sqlbuilder.SelectBuilder) *predicateResolver {
	return &predicateResolver{cb: cb, fl: fl, keys: keys, sb: sb}
}

// ConditionFor returns a boolean predicate for key via the condition builder
// (materialized column when present, else map access), args bound into sb.
func (r *predicateResolver) ConditionFor(ctx context.Context, orgID valuer.UUID, startNs, endNs uint64, key *telemetrytypes.TelemetryFieldKey, op qbtypes.FilterOperator, value any) (string, error) {
	conds, _, err := r.cb.ConditionFor(ctx, orgID, startNs, endNs, key, querybuilder.MatchingLogicalFields(ctx, orgID, r.fl, telemetrytypes.SignalTraces, nil, key, r.keys), r.keys, qbtypes.ConditionBuilderOptions{}, op, value, r.sb)
	if err != nil {
		return "", err
	}
	if len(conds) == 0 {
		return "", nil
	}
	// one condition per data-type variant of the key; OR them all
	if len(conds) == 1 {
		return conds[0], nil
	}
	return r.sb.Or(conds...), nil
}

// ExistsFor returns the EXISTS predicate for key.
func (r *predicateResolver) ExistsFor(ctx context.Context, orgID valuer.UUID, startNs, endNs uint64, key *telemetrytypes.TelemetryFieldKey) (string, error) {
	return r.ConditionFor(ctx, orgID, startNs, endNs, key, qbtypes.FilterOperatorExists, nil)
}
