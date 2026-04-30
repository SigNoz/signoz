package implsystemdashboard

import (
	"context"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/modules/systemdashboard"
	"github.com/SigNoz/signoz/pkg/types/dashboardtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type module struct {
	store dashboardtypes.Store
}

func NewModule(store dashboardtypes.Store) systemdashboard.Module {
	return &module{store: store}
}

func (module *module) Get(ctx context.Context, orgID valuer.UUID, source dashboardtypes.Source) (*dashboardtypes.Dashboard, error) {
	storable, err := module.store.GetBySource(ctx, orgID, string(source))
	if err != nil {
		return nil, err
	}

	return dashboardtypes.NewDashboardFromStorableDashboard(storable), nil
}

// Update applies the new payload as last-writer-wins. The Get and Update run inside one transaction so a
// concurrent Reset cannot interleave and leave the response with a stale id from before the reset.
func (module *module) Update(ctx context.Context, orgID valuer.UUID, source dashboardtypes.Source, dashboard *dashboardtypes.Dashboard) (*dashboardtypes.Dashboard, error) {
	if dashboard == nil {
		return nil, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "dashboard is required")
	}
	if dashboard.Data == nil {
		return nil, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "dashboard.Data is required")
	}

	var updated *dashboardtypes.Dashboard
	err := module.store.RunInTx(ctx, func(ctx context.Context) error {
		existing, err := module.store.GetBySource(ctx, orgID, string(source))
		if err != nil {
			return err
		}

		existing.Data = dashboard.Data
		existing.UpdatedBy = dashboard.UpdatedBy
		existing.UpdatedAt = time.Now()

		if err := module.store.Update(ctx, orgID, existing); err != nil {
			return err
		}

		updated = dashboardtypes.NewDashboardFromStorableDashboard(existing)
		return nil
	})
	if err != nil {
		return nil, err
	}

	return updated, nil
}

func (module *module) Reset(ctx context.Context, orgID valuer.UUID, source dashboardtypes.Source) (*dashboardtypes.Dashboard, error) {
	var reset *dashboardtypes.Dashboard
	err := module.store.RunInTx(ctx, func(ctx context.Context) error {
		defaultDashboard, err := dashboardtypes.NewDefaultSystemDashboard(orgID, source)
		if err != nil {
			return err
		}

		existing, err := module.store.GetBySource(ctx, orgID, string(source))
		if err != nil && !errors.Ast(err, errors.TypeNotFound) {
			return err
		}

		if existing == nil {
			storable, err := dashboardtypes.NewStorableDashboardFromDashboard(defaultDashboard)
			if err != nil {
				return err
			}
			if err := module.store.Create(ctx, storable); err != nil {
				return err
			}
			reset = defaultDashboard
			return nil
		}

		existing.Data = defaultDashboard.Data
		existing.UpdatedBy = "system"
		existing.UpdatedAt = time.Now()

		if err := module.store.Update(ctx, orgID, existing); err != nil {
			return err
		}

		reset = dashboardtypes.NewDashboardFromStorableDashboard(existing)
		return nil
	})
	if err != nil {
		return nil, err
	}

	return reset, nil
}

func (module *module) SetDefaultConfig(ctx context.Context, orgID valuer.UUID) error {
	for _, source := range dashboardtypes.SystemSources {
		if err := module.setDefaultForSource(ctx, orgID, source); err != nil {
			return err
		}
	}

	return nil
}

func (module *module) setDefaultForSource(ctx context.Context, orgID valuer.UUID, source dashboardtypes.Source) error {
	existing, err := module.store.GetBySource(ctx, orgID, string(source))
	if err != nil && !errors.Ast(err, errors.TypeNotFound) {
		return err
	}
	if existing != nil {
		return nil
	}

	dashboard, err := dashboardtypes.NewDefaultSystemDashboard(orgID, source)
	if err != nil {
		return err
	}

	storable, err := dashboardtypes.NewStorableDashboardFromDashboard(dashboard)
	if err != nil {
		return err
	}

	return module.store.Create(ctx, storable)
}
