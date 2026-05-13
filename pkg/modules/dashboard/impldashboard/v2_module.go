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

func (module *module) UpdateV2(ctx context.Context, orgID valuer.UUID, id valuer.UUID, updatedBy string, updateable dashboardtypes.UpdateableDashboardV2) (*dashboardtypes.DashboardV2, error) {
	if err := updateable.Validate(); err != nil {
		return nil, err
	}

	existing, err := module.GetV2(ctx, orgID, id)
	if err != nil {
		return nil, err
	}
	// Locked-dashboard / state gate — independent of tags, so run it before the tx.
	if err := existing.CanUpdate(); err != nil {
		return nil, err
	}

	err = module.sqlstore.RunInTxCtx(ctx, nil, func(ctx context.Context) error {
		resolvedTags, err := module.tagModule.SyncTags(ctx, orgID, coretypes.KindDashboard, id, updateable.Tags)
		if err != nil {
			return err
		}

		err = existing.Update(updateable, updatedBy, resolvedTags)
		if err != nil {
			return err
		}

		storable, err := existing.ToStorableDashboard()
		if err != nil {
			return err
		}

		return module.store.UpdateV2(ctx, orgID, id, updatedBy, storable.Data)
	})
	if err != nil {
		return nil, err
	}

	return existing, nil
}
