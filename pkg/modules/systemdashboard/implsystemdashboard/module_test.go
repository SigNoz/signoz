package implsystemdashboard

import (
	"context"
	"path/filepath"
	"strconv"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/analytics/analyticstest"
	"github.com/SigNoz/signoz/pkg/factory/factorytest"
	"github.com/SigNoz/signoz/pkg/modules/dashboard"
	"github.com/SigNoz/signoz/pkg/modules/dashboard/impldashboard"
	"github.com/SigNoz/signoz/pkg/modules/tag/impltag"
	"github.com/SigNoz/signoz/pkg/queryparser"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/sqlstore/sqlitesqlstore"
	"github.com/SigNoz/signoz/pkg/types/dashboardtypes"
	"github.com/SigNoz/signoz/pkg/types/systemdashboardtypes"
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
		(*systemdashboardtypes.StorableSystemDashboard)(nil),
	} {
		_, err := store.BunDB().NewCreateTable().Model(model).IfNotExists().Exec(context.Background())
		require.NoError(t, err)
	}

	_, err = store.BunDB().Exec(`CREATE UNIQUE INDEX IF NOT EXISTS uq_system_dashboard_org_name ON system_dashboard (org_id, name)`)
	require.NoError(t, err)

	return store
}

func newTestModule(t *testing.T, sqlStore sqlstore.SQLStore, definitions ...systemdashboardtypes.Definition) (*module, dashboard.Module) {
	t.Helper()

	providerSettings := factorytest.NewSettings()
	dashboardModule := impldashboard.NewModule(
		impldashboard.NewStore(sqlStore),
		providerSettings,
		analyticstest.New(),
		nil,
		queryparser.New(providerSettings),
		impltag.NewModule(impltag.NewStore(sqlStore)),
	)

	registry, err := systemdashboardtypes.NewRegistry(definitions)
	require.NoError(t, err)

	return NewModule(providerSettings, NewStore(sqlStore), registry, dashboardModule).(*module), dashboardModule
}

func newTestDefinition(t *testing.T, version int, displayName string) systemdashboardtypes.Definition {
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

	definition, err := systemdashboardtypes.NewDefinition([]byte(raw))
	require.NoError(t, err)

	return definition
}

func TestReconcileProvisionsThenUpgradesUntilTheRowIsModified(t *testing.T) {
	ctx := context.Background()
	sqlStore := newTestSQLStore(t)
	orgID := valuer.GenerateUUID()

	systemDashboardModule, _ := newTestModule(t, sqlStore, newTestDefinition(t, 1, "v1"))
	require.NoError(t, systemDashboardModule.Reconcile(ctx, orgID))

	provisioned, err := systemDashboardModule.Get(ctx, orgID, testDashboardName)
	require.NoError(t, err)
	assert.Equal(t, dashboardtypes.SourceSystem, provisioned.Source)
	assert.Equal(t, systemdashboardtypes.ProvisionerIdentity, provisioned.CreatedBy)
	assert.Equal(t, "v1", provisioned.Spec.Display.Name)
	assert.Equal(t, 1, stateVersion(t, systemDashboardModule, ctx, orgID))

	// Reconciling the same version again is a no-op.
	require.NoError(t, systemDashboardModule.Reconcile(ctx, orgID))
	unchanged, err := systemDashboardModule.Get(ctx, orgID, testDashboardName)
	require.NoError(t, err)
	assert.Equal(t, provisioned.UpdatedAt, unchanged.UpdatedAt)

	// An unmodified copy is upgraded in place, keeping its id.
	upgradingModule, dashboardModule := newTestModule(t, sqlStore, newTestDefinition(t, 2, "v2"))
	require.NoError(t, upgradingModule.Reconcile(ctx, orgID))

	upgraded, err := upgradingModule.Get(ctx, orgID, testDashboardName)
	require.NoError(t, err)
	assert.Equal(t, provisioned.ID, upgraded.ID)
	assert.Equal(t, "v2", upgraded.Spec.Display.Name)
	assert.Equal(t, 2, stateVersion(t, upgradingModule, ctx, orgID))

	// Once anything but the provisioner writes the row, later releases leave it alone.
	updatable := newTestDefinition(t, 2, "edited out of band").ToUpdatable()
	_, err = dashboardModule.UpdateUnsafeV2(ctx, orgID, upgraded.ID, "user@signoz.io", updatable)
	require.NoError(t, err)

	shippingModule, _ := newTestModule(t, sqlStore, newTestDefinition(t, 3, "v3"))
	require.NoError(t, shippingModule.Reconcile(ctx, orgID))

	untouched, err := shippingModule.Get(ctx, orgID, testDashboardName)
	require.NoError(t, err)
	assert.Equal(t, "user@signoz.io", untouched.UpdatedBy)
	assert.Equal(t, "edited out of band", untouched.Spec.Display.Name)
	assert.Equal(t, 2, stateVersion(t, shippingModule, ctx, orgID))
}

func stateVersion(t *testing.T, module *module, ctx context.Context, orgID valuer.UUID) int {
	t.Helper()

	state, err := module.store.Get(ctx, orgID, dashboardtypes.SystemDashboardNamePrefix+testDashboardName)
	require.NoError(t, err)

	return state.Version
}

func TestSystemDashboardsAreImmutableToUsers(t *testing.T) {
	ctx := context.Background()
	sqlStore := newTestSQLStore(t)
	orgID := valuer.GenerateUUID()

	systemDashboardModule, dashboardModule := newTestModule(t, sqlStore, newTestDefinition(t, 1, "v1"))
	require.NoError(t, systemDashboardModule.Reconcile(ctx, orgID))

	provisioned, err := systemDashboardModule.Get(ctx, orgID, testDashboardName)
	require.NoError(t, err)

	_, err = dashboardModule.UpdateV2(ctx, orgID, provisioned.ID, "user@signoz.io", newTestDefinition(t, 1, "edited").ToUpdatable())
	require.Error(t, err)
	assert.Contains(t, err.Error(), "cannot be modified")
}

func TestReconcileDoesNotDowngrade(t *testing.T) {
	ctx := context.Background()
	sqlStore := newTestSQLStore(t)
	orgID := valuer.GenerateUUID()

	newerModule, _ := newTestModule(t, sqlStore, newTestDefinition(t, 3, "v3"))
	require.NoError(t, newerModule.Reconcile(ctx, orgID))

	olderModule, _ := newTestModule(t, sqlStore, newTestDefinition(t, 2, "v2"))
	require.NoError(t, olderModule.Reconcile(ctx, orgID))

	got, err := newerModule.Get(ctx, orgID, testDashboardName)
	require.NoError(t, err)
	assert.Equal(t, "v3", got.Spec.Display.Name)
	assert.Equal(t, 3, stateVersion(t, newerModule, ctx, orgID))
}

func TestGetRejectsANonSystemDashboard(t *testing.T) {
	ctx := context.Background()
	sqlStore := newTestSQLStore(t)
	orgID := valuer.GenerateUUID()

	systemDashboardModule, dashboardModule := newTestModule(t, sqlStore)

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
	_, err = systemDashboardModule.Get(ctx, orgID, "a-user-dashboard")
	require.Error(t, err)

	_, err = systemDashboardModule.Get(ctx, orgID, dashboardtypes.SystemDashboardNamePrefix+testDashboardName)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "must not carry")
}
