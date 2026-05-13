package impldashboard

import (
	"context"

	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/SigNoz/signoz/pkg/types/dashboardtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

func (module *module) CreateV2(ctx context.Context, orgID valuer.UUID, createdBy string, creator valuer.UUID, postable dashboardtypes.PostableDashboardV2) (*dashboardtypes.DashboardV2, error) {
	if err := postable.Validate(); err != nil {
		return nil, err
	}

	dashboard := dashboardtypes.NewDashboardV2(orgID, createdBy, postable, nil)
	var storableDashboard *dashboardtypes.StorableDashboard

	err := module.sqlstore.RunInTxCtx(ctx, nil, func(ctx context.Context) error {
		resolvedTags, err := module.tagModule.SyncTags(ctx, orgID, coretypes.KindDashboard, dashboard.ID, postable.Tags)
		if err != nil {
			return err
		}
		dashboard.Info.Tags = resolvedTags

		storable, err := dashboard.ToStorableDashboard()
		if err != nil {
			return err
		}
		storableDashboard = storable
		return module.store.Create(ctx, storable)
	})
	if err != nil {
		return nil, err
	}

	module.analytics.TrackUser(ctx, orgID.String(), creator.String(), "Dashboard Created", dashboardtypes.NewStatsFromStorableDashboards([]*dashboardtypes.StorableDashboard{storableDashboard}))
	return dashboard, nil
}

func (module *module) GetV2(ctx context.Context, orgID valuer.UUID, id valuer.UUID) (*dashboardtypes.DashboardV2, error) {
	storable, public, err := module.store.GetV2(ctx, orgID, id)
	if err != nil {
		return nil, err
	}

	tags, err := module.tagModule.ListForResource(ctx, orgID, coretypes.KindDashboard, id)
	if err != nil {
		return nil, err
	}

	return dashboardtypes.NewDashboardV2FromStorable(storable, public, tags)
}
