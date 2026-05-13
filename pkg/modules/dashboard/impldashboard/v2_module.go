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

	// Tag upserts run outside the dashboard transaction by design: a successful
	// upsert that loses an outer dashboard insert just leaves resolved tag rows
	// around for the next attempt — preferable to coupling the two.
	resolvedTags, err := module.tagModule.CreateMany(ctx, orgID, coretypes.KindDashboard, postable.Tags)
	if err != nil {
		return nil, err
	}

	dashboard := dashboardtypes.NewDashboardV2(orgID, createdBy, postable, resolvedTags)

	storableDashboard, err := dashboard.ToStorableDashboard()
	if err != nil {
		return nil, err
	}

	tagIDs := make([]valuer.UUID, len(resolvedTags))
	for i, t := range resolvedTags {
		tagIDs[i] = t.ID
	}

	err = module.sqlstore.RunInTxCtx(ctx, nil, func(ctx context.Context) error {
		if err := module.store.Create(ctx, storableDashboard); err != nil {
			return err
		}
		return module.tagModule.LinkToResource(ctx, coretypes.KindDashboard, dashboard.ID, tagIDs)
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

	tags, err := module.tagModule.ListForEntity(ctx, dashboardtypes.EntityTypeDashboard, id)
	if err != nil {
		return nil, err
	}

	return dashboardtypes.NewDashboardV2FromStorable(storable, public, tags)
}
