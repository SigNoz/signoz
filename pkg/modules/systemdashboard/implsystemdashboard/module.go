package implsystemdashboard

import (
	"context"
	"log/slog"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/modules/dashboard"
	"github.com/SigNoz/signoz/pkg/modules/systemdashboard"
	"github.com/SigNoz/signoz/pkg/types/dashboardtypes"
	"github.com/SigNoz/signoz/pkg/types/systemdashboardtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type module struct {
	settings        factory.ScopedProviderSettings
	store           systemdashboardtypes.Store
	registry        systemdashboardtypes.Registry
	dashboardModule dashboard.Module
}

func NewModule(
	providerSettings factory.ProviderSettings,
	store systemdashboardtypes.Store,
	registry systemdashboardtypes.Registry,
	dashboardModule dashboard.Module,
) systemdashboard.Module {
	return &module{
		settings:        factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/pkg/modules/systemdashboard/implsystemdashboard"),
		store:           store,
		registry:        registry,
		dashboardModule: dashboardModule,
	}
}

func (module *module) Reconcile(ctx context.Context, orgID valuer.UUID) error {
	for _, definition := range module.registry.List() {
		if err := module.reconcile(ctx, orgID, definition); err != nil {
			return err
		}
	}

	return nil
}

func (module *module) reconcile(ctx context.Context, orgID valuer.UUID, definition systemdashboardtypes.Definition) error {
	existing, err := module.dashboardModule.GetByNameV2(ctx, orgID, definition.Name())
	if err != nil {
		if !errors.Ast(err, errors.TypeNotFound) {
			return err
		}
		return module.provision(ctx, orgID, definition)
	}

	// Anything but the provisioner in updated_by means a foreign write. Leave the
	// row alone — never overwriting is the safe direction.
	if existing.UpdatedBy != systemdashboardtypes.ProvisionerIdentity {
		return nil
	}

	state, err := module.store.Get(ctx, orgID, definition.Name())
	if err != nil {
		return err
	}
	// Only ever move forward: a downgrade must not rewrite the newer content.
	if state.Version >= definition.Version {
		return nil
	}

	return module.upgrade(ctx, orgID, existing.ID, definition)
}

// provision creates the dashboard and its state row in one transaction, so a
// system dashboard can never exist without the version it was provisioned at.
// A concurrent provisioner (another replica, or the org-creation hook racing the
// startup sweep) loses on the state row's unique (org_id, name) index and rolls back.
func (module *module) provision(ctx context.Context, orgID valuer.UUID, definition systemdashboardtypes.Definition) error {
	err := module.store.RunInTx(ctx, func(ctx context.Context) error {
		created, err := module.dashboardModule.CreateV2(
			ctx,
			orgID,
			systemdashboardtypes.ProvisionerIdentity,
			valuer.UUID{},
			dashboardtypes.SourceSystem,
			definition.Dashboard,
		)
		if err != nil {
			return err
		}

		return module.store.Create(ctx, systemdashboardtypes.NewStorableSystemDashboard(orgID, created.ID, definition.Name(), definition.Version))
	})
	if err != nil {
		if errors.Ast(err, errors.TypeAlreadyExists) {
			module.settings.Logger().DebugContext(ctx, "system dashboard already provisioned concurrently", slog.String("name", definition.Name()), slog.String("org_id", orgID.StringValue()))
			return nil
		}
		return err
	}

	module.settings.Logger().InfoContext(ctx, "provisioned system dashboard", slog.String("name", definition.Name()), slog.Int("version", definition.Version), slog.String("org_id", orgID.StringValue()))
	return nil
}

func (module *module) upgrade(ctx context.Context, orgID valuer.UUID, id valuer.UUID, definition systemdashboardtypes.Definition) error {
	err := module.store.RunInTx(ctx, func(ctx context.Context) error {
		if _, err := module.dashboardModule.UpdateUnsafeV2(ctx, orgID, id, systemdashboardtypes.ProvisionerIdentity, definition.ToUpdatable()); err != nil {
			return err
		}

		return module.store.UpdateVersion(ctx, orgID, definition.Name(), definition.Version)
	})
	if err != nil {
		return err
	}

	module.settings.Logger().InfoContext(ctx, "upgraded system dashboard", slog.String("name", definition.Name()), slog.Int("version", definition.Version), slog.String("org_id", orgID.StringValue()))
	return nil
}

func (module *module) Get(ctx context.Context, orgID valuer.UUID, name string) (*dashboardtypes.DashboardV2, error) {
	return module.get(ctx, orgID, name)
}

func (module *module) ResolveID(ctx context.Context, orgID valuer.UUID, name string) (valuer.UUID, error) {
	existing, err := module.get(ctx, orgID, name)
	if err != nil {
		return valuer.UUID{}, err
	}

	return existing.ID, nil
}

func (module *module) get(ctx context.Context, orgID valuer.UUID, name string) (*dashboardtypes.DashboardV2, error) {
	if strings.HasPrefix(name, dashboardtypes.SystemDashboardNamePrefix) {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "name must not carry the %q prefix", dashboardtypes.SystemDashboardNamePrefix)
	}

	existing, err := module.dashboardModule.GetByNameV2(ctx, orgID, dashboardtypes.SystemDashboardNamePrefix+name)
	if err != nil {
		return nil, err
	}
	if err := existing.ErrIfNotSystem(); err != nil {
		return nil, err
	}

	return existing, nil
}
