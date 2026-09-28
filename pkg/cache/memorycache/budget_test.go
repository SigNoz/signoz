package memorycache

import (
	"context"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/cache"
	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func cachedDataOfSize(n int) *qbtypes.CachedData {
	return &qbtypes.CachedData{Buckets: []*qbtypes.CachedBucket{{EndMs: 1, Type: qbtypes.RequestTypeTimeSeries, Value: make([]byte, n)}}}
}

// ristretto admits an update of an existing key without checking the budget,
// so an entry that grows in place could take the process past MaxCost.
func TestSet_GrowingEntryStaysWithinBudget(t *testing.T) {
	const budget = 1 << 20
	p, err := New(context.Background(), instrumentationtest.New().ToProviderSettings(), cache.Config{Provider: "memory", Memory: cache.Memory{NumCounters: 1000, MaxCost: budget}})
	require.NoError(t, err)
	prov := p.(*provider)
	orgID := valuer.GenerateUUID()
	ctx := context.Background()

	require.NoError(t, prov.Set(ctx, orgID, "entry", cachedDataOfSize(512<<10), time.Hour))
	require.NoError(t, prov.Set(ctx, orgID, "entry", cachedDataOfSize(2<<20), time.Hour))

	used := int64(prov.cc.Metrics.CostAdded()) - int64(prov.cc.Metrics.CostEvicted())
	assert.LessOrEqual(t, used, int64(budget), "the cache holds %d bytes against a budget of %d", used, budget)
}
