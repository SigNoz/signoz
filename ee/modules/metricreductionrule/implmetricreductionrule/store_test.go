package implmetricreductionrule

import (
	"context"
	"path/filepath"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/factory/factorytest"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/sqlstore/sqlitesqlstore"
	"github.com/SigNoz/signoz/pkg/types/metricreductionruletypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func newTestStore(t *testing.T) sqlstore.SQLStore {
	t.Helper()
	dbPath := filepath.Join(t.TempDir(), "test.db")
	store, err := sqlitesqlstore.New(context.Background(), factorytest.NewSettings(), sqlstore.Config{
		Provider: "sqlite",
		Connection: sqlstore.ConnectionConfig{
			MaxOpenConns:    1,
			MaxConnLifetime: 0,
		},
		Sqlite: sqlstore.SqliteConfig{
			Path:            dbPath,
			Mode:            "wal",
			BusyTimeout:     5 * time.Second,
			TransactionMode: "deferred",
		},
	})
	require.NoError(t, err)

	_, err = store.BunDB().NewCreateTable().
		Model((*metricreductionruletypes.StorableReductionRule)(nil)).
		IfNotExists().
		Exec(context.Background())
	require.NoError(t, err)

	_, err = store.BunDB().Exec(`CREATE UNIQUE INDEX IF NOT EXISTS uq_metric_reduction_rule_org_metric ON metric_reduction_rule (org_id, metric_name)`)
	require.NoError(t, err)
	return store
}

func newRule(orgID valuer.UUID, metricName string, matchType metricreductionruletypes.MatchType, labels []string, by string) *metricreductionruletypes.StorableReductionRule {
	return metricreductionruletypes.NewReductionRule(orgID, metricName, matchType, labels, time.Now(), by)
}

func TestStore_UpsertGetListDelete(t *testing.T) {
	ctx := context.Background()
	s := NewStore(newTestStore(t))
	orgID := valuer.GenerateUUID()

	empty, _, err := s.List(ctx, orgID, &metricreductionruletypes.ListReductionRulesParams{})
	require.NoError(t, err)
	assert.Empty(t, empty)

	require.NoError(t, s.Upsert(ctx, newRule(orgID, "http_requests_total", metricreductionruletypes.MatchTypeDrop, []string{"pod", "container"}, "creator@x.com")))

	got, err := s.Get(ctx, orgID, "http_requests_total")
	require.NoError(t, err)
	assert.Equal(t, metricreductionruletypes.MatchTypeDrop, got.MatchType)
	assert.Equal(t, []string{"pod", "container"}, []string(got.Labels))
	assert.Equal(t, "creator@x.com", got.CreatedBy)

	list, _, err := s.List(ctx, orgID, &metricreductionruletypes.ListReductionRulesParams{})
	require.NoError(t, err)
	require.Len(t, list, 1)
}

func TestStore_UpsertReplacesAndPreservesCreator(t *testing.T) {
	ctx := context.Background()
	s := NewStore(newTestStore(t))
	orgID := valuer.GenerateUUID()

	require.NoError(t, s.Upsert(ctx, newRule(orgID, "cpu_usage", metricreductionruletypes.MatchTypeDrop, []string{"pod"}, "creator@x.com")))
	require.NoError(t, s.Upsert(ctx, newRule(orgID, "cpu_usage", metricreductionruletypes.MatchTypeKeep, []string{"le"}, "editor@x.com")))

	list, _, err := s.List(ctx, orgID, &metricreductionruletypes.ListReductionRulesParams{})
	require.NoError(t, err)
	require.Len(t, list, 1, "upsert on the same (org, metric) replaces, it does not duplicate")

	got, err := s.Get(ctx, orgID, "cpu_usage")
	require.NoError(t, err)
	assert.Equal(t, metricreductionruletypes.MatchTypeKeep, got.MatchType)
	assert.Equal(t, []string{"le"}, []string(got.Labels))
	assert.Equal(t, "creator@x.com", got.CreatedBy, "created_by is preserved on update")
	assert.Equal(t, "editor@x.com", got.UpdatedBy, "updated_by reflects the latest editor")
}

func TestStore_DeleteMissingRuleErrors(t *testing.T) {
	ctx := context.Background()
	s := NewStore(newTestStore(t))
	orgID := valuer.GenerateUUID()

	require.NoError(t, s.Upsert(ctx, newRule(orgID, "mem_usage", metricreductionruletypes.MatchTypeDrop, []string{"pod"}, "creator@x.com")))
	require.NoError(t, s.Delete(ctx, orgID, "mem_usage"))

	_, err := s.Get(ctx, orgID, "mem_usage")
	require.Error(t, err)

	require.Error(t, s.Delete(ctx, orgID, "mem_usage"), "deleting a non-existent rule returns an error")
}

func TestStore_ScopedByOrg(t *testing.T) {
	ctx := context.Background()
	s := NewStore(newTestStore(t))
	orgA := valuer.GenerateUUID()
	orgB := valuer.GenerateUUID()

	require.NoError(t, s.Upsert(ctx, newRule(orgA, "shared_metric", metricreductionruletypes.MatchTypeDrop, []string{"pod"}, "a@x.com")))

	_, err := s.Get(ctx, orgB, "shared_metric")
	require.Error(t, err, "a rule in org A must not be visible to org B")

	list, _, err := s.List(ctx, orgB, &metricreductionruletypes.ListReductionRulesParams{})
	require.NoError(t, err)
	assert.Empty(t, list)
}

func TestStore_ListSortsAndPaginates(t *testing.T) {
	ctx := context.Background()
	s := NewStore(newTestStore(t))
	orgID := valuer.GenerateUUID()

	for _, name := range []string{"c_metric", "a_metric", "b_metric"} {
		require.NoError(t, s.Upsert(ctx, newRule(orgID, name, metricreductionruletypes.MatchTypeDrop, []string{"pod"}, "x@x.com")))
	}

	page, total, err := s.List(ctx, orgID, &metricreductionruletypes.ListReductionRulesParams{
		OrderBy: metricreductionruletypes.OrderByMetricName,
		Order:   metricreductionruletypes.OrderAsc,
		Offset:  0,
		Limit:   2,
	})
	require.NoError(t, err)
	assert.Equal(t, 3, total, "total reflects all rows, not the page size")
	require.Len(t, page, 2)
	assert.Equal(t, "a_metric", page[0].MetricName)
	assert.Equal(t, "b_metric", page[1].MetricName)

	page, _, err = s.List(ctx, orgID, &metricreductionruletypes.ListReductionRulesParams{
		OrderBy: metricreductionruletypes.OrderByMetricName,
		Order:   metricreductionruletypes.OrderDesc,
		Offset:  2,
		Limit:   2,
	})
	require.NoError(t, err)
	require.Len(t, page, 1)
	assert.Equal(t, "a_metric", page[0].MetricName, "desc order with offset 2 lands on the smallest name")
}

func TestStore_RunInTxRollsBackOnError(t *testing.T) {
	ctx := context.Background()
	s := NewStore(newTestStore(t))
	orgID := valuer.GenerateUUID()

	err := s.RunInTx(ctx, func(ctx context.Context) error {
		if err := s.Upsert(ctx, newRule(orgID, "rolled_back", metricreductionruletypes.MatchTypeDrop, []string{"pod"}, "creator@x.com")); err != nil {
			return err
		}
		return assert.AnError
	})
	require.ErrorIs(t, err, assert.AnError)

	_, err = s.Get(ctx, orgID, "rolled_back")
	require.Error(t, err, "the upsert must not persist when the transaction callback fails")
}
