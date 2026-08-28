package impldashboard

import (
	"context"
	"path/filepath"
	"strconv"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/analytics/analyticstest"
	"github.com/SigNoz/signoz/pkg/factory/factorytest"
	"github.com/SigNoz/signoz/pkg/modules/tag/impltag"
	"github.com/SigNoz/signoz/pkg/queryparser"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/sqlstore/sqlitesqlstore"
	"github.com/SigNoz/signoz/pkg/types/dashboardtypes"
	"github.com/SigNoz/signoz/pkg/types/tagtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const testDashboardName = "test-overview"

func newTestSQLStore(t *testing.T) sqlstore.SQLStore {
	t.Helper()

	store, err := sqlitesqlstore.New(context.Background(), factorytest.NewSettings(), sqlstore.Config{
		Provider:   "sqlite",
		Connection: sqlstore.ConnectionConfig{MaxOpenConns: 10},
		Sqlite: sqlstore.SqliteConfig{
			Path:            filepath.Join(t.TempDir(), "test.db"),
			Mode:            "wal",
			BusyTimeout:     5 * time.Second,
			TransactionMode: "deferred",
		},
	})
	require.NoError(t, err)

	for _, model := range []any{
		(*dashboardtypes.StorableDashboard)(nil),
		(*tagtypes.Tag)(nil),
		(*tagtypes.TagRelation)(nil),
		(*dashboardtypes.StorableSystemDashboard)(nil),
	} {
		_, err := store.BunDB().NewCreateTable().Model(model).IfNotExists().Exec(context.Background())
		require.NoError(t, err)
	}

	_, err = store.BunDB().Exec(`CREATE UNIQUE INDEX IF NOT EXISTS uq_system_dashboard_org_name ON system_dashboard (org_id, name)`)
	require.NoError(t, err)

	return store
}

func newTestModule(t *testing.T, sqlStore sqlstore.SQLStore, definitions ...dashboardtypes.SystemDashboardDefinition) *module {
	t.Helper()

	registry, err := dashboardtypes.NewSystemDashboardRegistry(definitions)
	require.NoError(t, err)

	providerSettings := factorytest.NewSettings()
	return NewModule(
		NewStore(sqlStore),
		providerSettings,
		analyticstest.New(),
		nil,
		queryparser.New(providerSettings),
		impltag.NewModule(impltag.NewStore(sqlStore)),
		registry,
	).(*module)
}

func newTestDefinition(t *testing.T, version int, displayName string) dashboardtypes.SystemDashboardDefinition {
	t.Helper()

	raw := `{
		"version": ` + strconv.Itoa(version) + `,
		"definition": {
			"schemaVersion": "` + dashboardtypes.SchemaVersion + `",
			"name": "` + dashboardtypes.SystemDashboardNamePrefix + testDashboardName + `",
			"tags": [],
			"spec": {"display": {"name": "` + displayName + `"}, "variables": [], "panels": {}, "layouts": []}
		}
	}`

	definition, err := dashboardtypes.NewSystemDashboardDefinition([]byte(raw))
	require.NoError(t, err)

	return definition
}

func TestReconcileProvisionsThenUpgrades(t *testing.T) {
	ctx := context.Background()
	sqlStore := newTestSQLStore(t)
	orgID := valuer.GenerateUUID()

	dashboardModule := newTestModule(t, sqlStore, newTestDefinition(t, 1, "v1"))
	require.NoError(t, dashboardModule.ReconcileSystemDashboards(ctx, orgID))

	provisioned, err := dashboardModule.GetSystemDashboard(ctx, orgID, testDashboardName)
	require.NoError(t, err)
	assert.Equal(t, dashboardtypes.SourceSystem, provisioned.Source)
	assert.Equal(t, dashboardtypes.ProvisionerIdentity, provisioned.CreatedBy)
	assert.Equal(t, "v1", provisioned.Spec.Display.Name)
	assert.Equal(t, 1, stateVersion(t, dashboardModule, ctx, orgID))

	// Reconciling the same version again is a no-op.
	require.NoError(t, dashboardModule.ReconcileSystemDashboards(ctx, orgID))
	unchanged, err := dashboardModule.GetSystemDashboard(ctx, orgID, testDashboardName)
	require.NoError(t, err)
	assert.Equal(t, provisioned.UpdatedAt, unchanged.UpdatedAt)

	// An unmodified copy is upgraded in place, keeping its id.
	upgradingModule := newTestModule(t, sqlStore, newTestDefinition(t, 2, "v2"))
	require.NoError(t, upgradingModule.ReconcileSystemDashboards(ctx, orgID))

	upgraded, err := upgradingModule.GetSystemDashboard(ctx, orgID, testDashboardName)
	require.NoError(t, err)
	assert.Equal(t, provisioned.ID, upgraded.ID)
	assert.Equal(t, "v2", upgraded.Spec.Display.Name)
	assert.Equal(t, 2, stateVersion(t, upgradingModule, ctx, orgID))
}

func stateVersion(t *testing.T, module *module, ctx context.Context, orgID valuer.UUID) int {
	t.Helper()

	state, err := module.store.GetSystemDashboard(ctx, orgID, dashboardtypes.SystemDashboardNamePrefix+testDashboardName)
	require.NoError(t, err)

	return state.Version
}

func TestSystemDashboardsAreImmutableToUsers(t *testing.T) {
	ctx := context.Background()
	sqlStore := newTestSQLStore(t)
	orgID := valuer.GenerateUUID()

	dashboardModule := newTestModule(t, sqlStore, newTestDefinition(t, 1, "v1"))
	require.NoError(t, dashboardModule.ReconcileSystemDashboards(ctx, orgID))

	provisioned, err := dashboardModule.GetSystemDashboard(ctx, orgID, testDashboardName)
	require.NoError(t, err)

	_, err = dashboardModule.UpdateV2(ctx, orgID, provisioned.ID, "user@signoz.io", newTestDefinition(t, 1, "edited").ToUpdatable())
	require.Error(t, err)
	assert.Contains(t, err.Error(), "cannot be modified")
}

func TestReconcileDoesNotDowngrade(t *testing.T) {
	ctx := context.Background()
	sqlStore := newTestSQLStore(t)
	orgID := valuer.GenerateUUID()

	newerModule := newTestModule(t, sqlStore, newTestDefinition(t, 3, "v3"))
	require.NoError(t, newerModule.ReconcileSystemDashboards(ctx, orgID))

	olderModule := newTestModule(t, sqlStore, newTestDefinition(t, 2, "v2"))
	require.NoError(t, olderModule.ReconcileSystemDashboards(ctx, orgID))

	got, err := newerModule.GetSystemDashboard(ctx, orgID, testDashboardName)
	require.NoError(t, err)
	assert.Equal(t, "v3", got.Spec.Display.Name)
	assert.Equal(t, 3, stateVersion(t, newerModule, ctx, orgID))
}

func TestGetRejectsANonSystemDashboard(t *testing.T) {
	ctx := context.Background()
	sqlStore := newTestSQLStore(t)
	orgID := valuer.GenerateUUID()

	dashboardModule := newTestModule(t, sqlStore)

	var postable dashboardtypes.PostableDashboardV2
	require.NoError(t, postable.UnmarshalJSON([]byte(`{
		"schemaVersion": "`+dashboardtypes.SchemaVersion+`",
		"name": "a-user-dashboard",
		"tags": [],
		"spec": {"display": {"name": "user"}, "variables": [], "panels": {}, "layouts": []}
	}`)))
	_, err := dashboardModule.CreateV2(ctx, orgID, "user@signoz.io", valuer.GenerateUUID(), dashboardtypes.SourceUser, postable)
	require.NoError(t, err)

	// The server-side prefix makes user names structurally unreachable here.
	_, err = dashboardModule.GetSystemDashboard(ctx, orgID, "a-user-dashboard")
	require.Error(t, err)

	_, err = dashboardModule.GetSystemDashboard(ctx, orgID, dashboardtypes.SystemDashboardNamePrefix+testDashboardName)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "must not carry")
}
