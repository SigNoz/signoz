package impldashboard

import (
	"context"
	"path/filepath"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/factory/factorytest"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/sqlstore/sqlitesqlstore"
	"github.com/SigNoz/signoz/pkg/types/dashboardtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestBuildContainsAnyClauseForDataColumn(t *testing.T) {
	cases := []struct {
		subtestName  string
		searches     []string
		expectedSQL  string
		expectedArgs []any
	}{
		{
			subtestName:  "single search",
			searches:     []string{"http.server.duration"},
			expectedSQL:  `(data LIKE ? ESCAPE '\')`,
			expectedArgs: []any{`%http.server.duration%`},
		},
		{
			subtestName:  "multiple searches are OR-ed",
			searches:     []string{"metric.a", "metric.b", "metric.c"},
			expectedSQL:  `(data LIKE ? ESCAPE '\' OR data LIKE ? ESCAPE '\' OR data LIKE ? ESCAPE '\')`,
			expectedArgs: []any{`%metric.a%`, `%metric.b%`, `%metric.c%`},
		},
		{
			subtestName:  "like wildcards in the search are escaped",
			searches:     []string{`a%b_c\d`},
			expectedSQL:  `(data LIKE ? ESCAPE '\')`,
			expectedArgs: []any{`%a\%b\_c\\d%`},
		},
	}

	for _, c := range cases {
		t.Run(c.subtestName, func(t *testing.T) {
			clause, args := buildContainsAnyClauseForDataColumn(formatter(t), c.searches)
			assert.Equal(t, c.expectedSQL, clause)
			assert.Equal(t, c.expectedArgs, args)
		})
	}
}

func newDashboardTestStore(t *testing.T) sqlstore.SQLStore {
	t.Helper()
	store, err := sqlitesqlstore.New(context.Background(), factorytest.NewSettings(), sqlstore.Config{
		Provider: "sqlite",
		Connection: sqlstore.ConnectionConfig{
			MaxOpenConns:    1,
			MaxConnLifetime: 0,
		},
		Sqlite: sqlstore.SqliteConfig{
			Path:            filepath.Join(t.TempDir(), "dashboard.db"),
			Mode:            "wal",
			BusyTimeout:     5 * time.Second,
			TransactionMode: "deferred",
		},
	})
	require.NoError(t, err)

	_, err = store.BunDB().NewCreateTable().Model((*dashboardtypes.StorableDashboard)(nil)).Exec(context.Background())
	require.NoError(t, err)
	_, err = store.BunDB().NewCreateTable().Model((*dashboardtypes.UserDashboardPreference)(nil)).Exec(context.Background())
	require.NoError(t, err)
	return store
}

func createDashboardForListTest(t *testing.T, store *store, orgID valuer.UUID, name string) {
	t.Helper()
	dashboard, err := dashboardtypes.NewDashboard(
		orgID,
		"test-user",
		dashboardtypes.SourceUser,
		dashboardtypes.StorableDashboardData{"name": name},
	)
	require.NoError(t, err)
	storable, err := dashboardtypes.NewStorableDashboardFromDashboard(dashboard)
	require.NoError(t, err)
	storable.Name = name
	require.NoError(t, store.Create(context.Background(), storable))
}

func TestListV2OutOfRangePagePreservesTotal(t *testing.T) {
	ctx := context.Background()
	store := &store{sqlstore: newDashboardTestStore(t)}
	orgID := valuer.GenerateUUID()
	createDashboardForListTest(t, store, orgID, "one")
	createDashboardForListTest(t, store, orgID, "two")

	params := &dashboardtypes.ListDashboardsV2Params{
		ListFilter: dashboardtypes.ListFilter{
			Sort:  dashboardtypes.ListSortUpdatedAt,
			Order: dashboardtypes.ListOrderDesc,
		},
		Limit:  1,
		Offset: 10,
	}

	dashboards, total, err := store.ListV2(ctx, orgID, params)
	require.NoError(t, err)
	require.Empty(t, dashboards)
	require.Equal(t, int64(2), total)

	dashboardsForUser, totalForUser, err := store.ListForUser(ctx, orgID, valuer.GenerateUUID(), params)
	require.NoError(t, err)
	require.Empty(t, dashboardsForUser)
	require.Equal(t, int64(2), totalForUser)
}
