package implsystemdashboard

import (
	"context"
	"log/slog"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/modules/dashboard"
	"github.com/SigNoz/signoz/pkg/modules/systemdashboard"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/dashboardtypes"
	"github.com/SigNoz/signoz/pkg/types/systemdashboardtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// RootUserGetter is the slice of user.Getter this module needs.
type RootUserGetter interface {
	GetRootUserByOrgID(context.Context, valuer.UUID) (*types.User, []*authtypes.UserRole, error)
}

type module struct {
	settings        factory.ScopedProviderSettings
	store           systemdashboardtypes.Store
	registry        systemdashboardtypes.Registry
	dashboardModule dashboard.Module
	rootUserGetter  RootUserGetter
}

func NewModule(
	providerSettings factory.ProviderSettings,
	store systemdashboardtypes.Store,
	registry systemdashboardtypes.Registry,
	dashboardModule dashboard.Module,
	rootUserGetter RootUserGetter,
) systemdashboard.Module {
	return &module{
		settings:        factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/pkg/modules/systemdashboard/implsystemdashboard"),
		store:           store,
		registry:        registry,
		dashboardModule: dashboardModule,
		rootUserGetter:  rootUserGetter,
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
// A concurrent replica loses the race on the state row's unique (org_id, name)
// index and rolls back, leaving exactly one copy.
func (module *module) provision(ctx context.Context, orgID valuer.UUID, definition systemdashboardtypes.Definition) error {
	err := module.store.RunInTx(ctx, func(ctx context.Context) error {
		created, err := module.dashboardModule.CreateV2(
			ctx,
			orgID,
			systemdashboardtypes.ProvisionerIdentity,
			module.creator(ctx, orgID),
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
			module.settings.Logger().DebugContext(ctx, "system dashboard already provisioned by another replica", slog.String("name", definition.Name()), slog.String("org_id", orgID.StringValue()))
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

// creator attributes the analytics event to the org's root user. The dashboard
// itself is owned by the provisioner identity, never by a real user — and while
// an org is being created there is no root user yet.
func (module *module) creator(ctx context.Context, orgID valuer.UUID) valuer.UUID {
	rootUser, _, err := module.rootUserGetter.GetRootUserByOrgID(ctx, orgID)
	if err != nil {
		return valuer.UUID{}
	}

	return rootUser.ID
}

func (module *module) Get(ctx context.Context, orgID valuer.UUID, name string) (*systemdashboardtypes.SystemDashboard, error) {
	existing, err := module.get(ctx, orgID, name)
	if err != nil {
		return nil, err
	}

	return &systemdashboardtypes.SystemDashboard{Dashboard: existing, Status: module.status(ctx, orgID, existing)}, nil
}

func (module *module) ResolveID(ctx context.Context, orgID valuer.UUID, name string) (valuer.UUID, error) {
	existing, err := module.get(ctx, orgID, name)
	if err != nil {
		return valuer.UUID{}, err
	}

	return existing.ID, nil
}

func (module *module) get(ctx context.Context, orgID valuer.UUID, name string) (*dashboardtypes.DashboardV2, error) {
	existing, err := module.dashboardModule.GetByNameV2(ctx, orgID, name)
	if err != nil {
		return nil, err
	}
	if err := existing.ErrIfNotSystem(); err != nil {
		return nil, err
	}

	return existing, nil
}

// status degrades rather than failing the read: a missing state row or a
// definition dropped from the binary only means no update can be offered.
func (module *module) status(ctx context.Context, orgID valuer.UUID, existing *dashboardtypes.DashboardV2) systemdashboardtypes.Status {
	status := systemdashboardtypes.Status{Modified: existing.UpdatedBy != systemdashboardtypes.ProvisionerIdentity}

	state, err := module.store.Get(ctx, orgID, existing.Name)
	if err != nil {
		module.settings.Logger().WarnContext(ctx, "couldn't read system dashboard state", slog.String("name", existing.Name), slog.String("org_id", orgID.StringValue()), errors.Attr(err))
		return status
	}
	status.Version = state.Version

	if definition, ok := module.registry.Get(existing.Name); ok {
		status.UpdateAvailable = definition.Version > state.Version
	}

	return status
}
