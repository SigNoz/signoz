package implsystemdashboard

import (
	"context"
	"path/filepath"
	"strconv"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/analytics/analyticstest"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory/factorytest"
	"github.com/SigNoz/signoz/pkg/modules/dashboard"
	"github.com/SigNoz/signoz/pkg/modules/dashboard/impldashboard"
	"github.com/SigNoz/signoz/pkg/modules/tag/impltag"
	"github.com/SigNoz/signoz/pkg/queryparser"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/sqlstore/sqlitesqlstore"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/dashboardtypes"
	"github.com/SigNoz/signoz/pkg/types/systemdashboardtypes"
	"github.com/SigNoz/signoz/pkg/types/tagtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const testDashboardName = dashboardtypes.SystemDashboardNamePrefix + "test-overview"

// noRootUser stands in for an org whose root user isn't resolvable — the state
// every org is in while it is being created.
type noRootUser struct{}

func (noRootUser) GetRootUserByOrgID(context.Context, valuer.UUID) (*types.User, []*authtypes.UserRole, error) {
	return nil, nil, errors.New(errors.TypeNotFound, errors.CodeNotFound, "no root user")
}

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

	return NewModule(providerSettings, NewStore(sqlStore), registry, dashboardModule, noRootUser{}).(*module), dashboardModule
}

func newTestDefinition(t *testing.T, version int, displayName string) systemdashboardtypes.Definition {
	t.Helper()

	raw := `{
		"version": ` + strconv.Itoa(version) + `,
		"definition": {
			"schemaVersion": "` + dashboardtypes.SchemaVersion + `",
			"name": "` + testDashboardName + `",
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
	assert.Equal(t, dashboardtypes.SourceSystem, provisioned.Dashboard.Source)
	assert.Equal(t, systemdashboardtypes.ProvisionerIdentity, provisioned.Dashboard.CreatedBy)
	assert.Equal(t, "v1", provisioned.Dashboard.Spec.Display.Name)
	assert.Equal(t, systemdashboardtypes.Status{Modified: false, UpdateAvailable: false, Version: 1}, provisioned.Status)

	// Reconciling the same version again is a no-op.
	require.NoError(t, systemDashboardModule.Reconcile(ctx, orgID))
	unchanged, err := systemDashboardModule.Get(ctx, orgID, testDashboardName)
	require.NoError(t, err)
	assert.Equal(t, provisioned.Dashboard.UpdatedAt, unchanged.Dashboard.UpdatedAt)

	// An unmodified copy is upgraded in place, keeping its id.
	upgradingModule, dashboardModule := newTestModule(t, sqlStore, newTestDefinition(t, 2, "v2"))
	require.NoError(t, upgradingModule.Reconcile(ctx, orgID))

	upgraded, err := upgradingModule.Get(ctx, orgID, testDashboardName)
	require.NoError(t, err)
	assert.Equal(t, provisioned.Dashboard.ID, upgraded.Dashboard.ID)
	assert.Equal(t, "v2", upgraded.Dashboard.Spec.Display.Name)
	assert.Equal(t, systemdashboardtypes.Status{Modified: false, UpdateAvailable: false, Version: 2}, upgraded.Status)

	// Once anything but the provisioner writes the row, the next release is
	// offered rather than applied.
	updatable := newTestDefinition(t, 2, "edited out of band").ToUpdatable()
	_, err = dashboardModule.UpdateUnsafeV2(ctx, orgID, upgraded.Dashboard.ID, "user@signoz.io", updatable)
	require.NoError(t, err)

	edited, err := upgradingModule.Get(ctx, orgID, testDashboardName)
	require.NoError(t, err)
	assert.Equal(t, "user@signoz.io", edited.Dashboard.UpdatedBy)
	assert.Equal(t, systemdashboardtypes.Status{Modified: true, UpdateAvailable: false, Version: 2}, edited.Status)

	shippingModule, _ := newTestModule(t, sqlStore, newTestDefinition(t, 3, "v3"))
	require.NoError(t, shippingModule.Reconcile(ctx, orgID))

	untouched, err := shippingModule.Get(ctx, orgID, testDashboardName)
	require.NoError(t, err)
	assert.Equal(t, "edited out of band", untouched.Dashboard.Spec.Display.Name)
	assert.Equal(t, systemdashboardtypes.Status{Modified: true, UpdateAvailable: true, Version: 2}, untouched.Status)
}

func TestSystemDashboardsAreImmutableToUsers(t *testing.T) {
	ctx := context.Background()
	sqlStore := newTestSQLStore(t)
	orgID := valuer.GenerateUUID()

	systemDashboardModule, dashboardModule := newTestModule(t, sqlStore, newTestDefinition(t, 1, "v1"))
	require.NoError(t, systemDashboardModule.Reconcile(ctx, orgID))

	provisioned, err := systemDashboardModule.Get(ctx, orgID, testDashboardName)
	require.NoError(t, err)

	_, err = dashboardModule.UpdateV2(ctx, orgID, provisioned.Dashboard.ID, "user@signoz.io", newTestDefinition(t, 1, "edited").ToUpdatable())
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
	assert.Equal(t, "v3", got.Dashboard.Spec.Display.Name)
	assert.Equal(t, 3, got.Status.Version)
}

func TestGetDegradesInsteadOfFailing(t *testing.T) {
	ctx := context.Background()
	sqlStore := newTestSQLStore(t)
	orgID := valuer.GenerateUUID()

	provisioner, _ := newTestModule(t, sqlStore, newTestDefinition(t, 1, "v1"))
	require.NoError(t, provisioner.Reconcile(ctx, orgID))

	// An empty registry is the shape of a release that dropped the definition.
	dropped, _ := newTestModule(t, sqlStore)
	got, err := dropped.Get(ctx, orgID, testDashboardName)
	require.NoError(t, err)
	assert.Equal(t, systemdashboardtypes.Status{Modified: false, UpdateAvailable: false, Version: 1}, got.Status)

	_, err = sqlStore.BunDB().NewDelete().Model((*systemdashboardtypes.StorableSystemDashboard)(nil)).Where("org_id = ?", orgID).Exec(ctx)
	require.NoError(t, err)

	got, err = provisioner.Get(ctx, orgID, testDashboardName)
	require.NoError(t, err)
	assert.Equal(t, systemdashboardtypes.Status{Modified: false, UpdateAvailable: false, Version: 0}, got.Status)
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

	_, err = systemDashboardModule.Get(ctx, orgID, "a-user-dashboard")
	require.Error(t, err)
}
