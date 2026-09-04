package scopedtracesstatementbuilder

import (
	"context"

	"github.com/SigNoz/signoz/pkg/querybuilder"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/huandu/go-sqlbuilder"
)

// columnResolver resolves keys to bare column/value expressions through the
// shared storage. It binds no args, so its expressions embed in any builder;
// predicates (which do bind args) are the predicateResolver's job.
type columnResolver struct {
	storage qbtypes.Storage
	keys    map[string][]*telemetrytypes.TelemetryFieldKey
}

func newColumnResolver(storage qbtypes.Storage, keys map[string][]*telemetrytypes.TelemetryFieldKey) *columnResolver {
	return &columnResolver{storage: storage, keys: keys}
}

// Read returns the bare read of one field key.
func (r *columnResolver) Read(ctx context.Context, q qbtypes.QueryInfo, key *telemetrytypes.TelemetryFieldKey) (string, error) {
	return r.storage.Read(ctx, q, key)
}

// ValueFor returns the value expression for an attribute key.
func (r *columnResolver) ValueFor(ctx context.Context, q qbtypes.QueryInfo, key *telemetrytypes.TelemetryFieldKey, dt telemetrytypes.FieldDataType) (string, error) {
	// TODO(nitya): Fix this as this is not correct way
	if cands := r.keys[key.Name]; len(cands) > 0 {
		key = cands[0]
	}
	expr, err := querybuilder.ResolveColumn(ctx, q, r.storage, key, dt, r.keys)
	if err != nil {
		return "", err
	}
	// a materialized column name carries `$$`, which Build would otherwise unescape
	// to a single `$` and reference the wrong column
	return sqlbuilder.Escape(expr), nil
}
