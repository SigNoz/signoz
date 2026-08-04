package scopedtracesstatementbuilder

import (
	"context"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/huandu/go-sqlbuilder"
)

// columnResolver resolves keys to bare column/value expressions through the shared
// field mapper. It binds no args, so its expressions embed in any builder; predicates
// (which do bind args) are the predicateResolver's job.
type columnResolver struct {
	fm   qbtypes.FieldMapper
	keys map[string][]*telemetrytypes.TelemetryFieldKey
}

func newColumnResolver(fm qbtypes.FieldMapper, keys map[string][]*telemetrytypes.TelemetryFieldKey) *columnResolver {
	return &columnResolver{fm: fm, keys: keys}
}

func (r *columnResolver) FieldFor(ctx context.Context, orgID valuer.UUID, startNs, endNs uint64, key *telemetrytypes.TelemetryFieldKey) (string, error) {
	return r.fm.FieldFor(ctx, orgID, startNs, endNs, key)
}

// ValueFor returns the value expression for an attribute key.
func (r *columnResolver) ValueFor(ctx context.Context, orgID valuer.UUID, startNs, endNs uint64, key *telemetrytypes.TelemetryFieldKey, dt telemetrytypes.FieldDataType) (string, error) {
	// TODO(nitya): Fix this as this is not correct way
	if cands := r.keys[key.Name]; len(cands) > 0 {
		key = cands[0]
	}
	expr, err := r.fm.ColumnExpressionFor(ctx, orgID, startNs, endNs, key, dt, r.keys)
	if err != nil {
		return "", err
	}
	// a materialized column name carries `$$`, which Build would otherwise unescape
	// to a single `$` and reference the wrong column
	return sqlbuilder.Escape(expr), nil
}
