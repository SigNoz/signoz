package scopedtracesstatementbuilder

import (
	"context"

	"github.com/SigNoz/signoz/pkg/querybuilder"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/huandu/go-sqlbuilder"
)

// predicateResolver resolves key + operator + value to boolean predicates through the
// shared storage. Args bind into sb as $n markers, so returned predicates can be
// embedded anywhere in sb; maskExpr is set by the builder after resolveMask
// (Scoped* aggregates embed it).
type predicateResolver struct {
	storage  qbtypes.Storage
	keys     map[string][]*telemetrytypes.TelemetryFieldKey
	sb       *sqlbuilder.SelectBuilder
	maskExpr string
}

func newPredicateResolver(storage qbtypes.Storage, keys map[string][]*telemetrytypes.TelemetryFieldKey, sb *sqlbuilder.SelectBuilder) *predicateResolver {
	return &predicateResolver{storage: storage, keys: keys, sb: sb}
}

// ConditionFor returns a boolean predicate for key (materialized column when
// present, else map access), args bound into sb.
func (r *predicateResolver) ConditionFor(ctx context.Context, q qbtypes.QueryInfo, key *telemetrytypes.TelemetryFieldKey, op qbtypes.FilterOperator, value any) (string, error) {
	conds, _, err := querybuilder.Conditions(ctx, q, r.storage, key, op, value, r.keys, false, r.sb)
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
func (r *predicateResolver) ExistsFor(ctx context.Context, q qbtypes.QueryInfo, key *telemetrytypes.TelemetryFieldKey) (string, error) {
	return r.ConditionFor(ctx, q, key, qbtypes.FilterOperatorExists, nil)
}
