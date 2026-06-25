package impldashboard

import (
	"context"

	"github.com/SigNoz/signoz/pkg/types/dashboardtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

func (module *module) CreateView(ctx context.Context, orgID valuer.UUID, postable dashboardtypes.PostableDashboardView) (*dashboardtypes.DashboardView, error) {
	if err := postable.Validate(); err != nil {
		return nil, err
	}
	view := postable.NewDashboardView(orgID)
	if err := module.store.CreateDashboardView(ctx, view); err != nil {
		return nil, err
	}
	return view, nil
}

func (module *module) ListViews(ctx context.Context, orgID valuer.UUID) (*dashboardtypes.ListableDashboardView, error) {
	views, err := module.store.ListDashboardViews(ctx, orgID)
	if err != nil {
		return nil, err
	}
	return &dashboardtypes.ListableDashboardView{Views: views}, nil
}

func (module *module) UpdateView(ctx context.Context, orgID valuer.UUID, id valuer.UUID, updateable dashboardtypes.UpdatableDashboardView) (*dashboardtypes.DashboardView, error) {
	if err := updateable.Validate(); err != nil {
		return nil, err
	}
	view, err := module.store.GetDashboardView(ctx, orgID, id)
	if err != nil {
		return nil, err
	}
	view.Update(updateable)
	if err := module.store.UpdateDashboardView(ctx, view); err != nil {
		return nil, err
	}
	return view, nil
}

func (module *module) DeleteView(ctx context.Context, orgID valuer.UUID, id valuer.UUID) error {
	return module.store.DeleteDashboardView(ctx, orgID, id)
}
