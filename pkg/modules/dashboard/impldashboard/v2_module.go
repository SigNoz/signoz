package impldashboard

import (
	"context"

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
	resolvedTags, err := module.tagModule.CreateMany(ctx, orgID, dashboardtypes.EntityTypeDashboard, postable.Tags, createdBy)
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
		return module.tagModule.LinkToEntity(ctx, orgID, dashboardtypes.EntityTypeDashboard, dashboard.ID, tagIDs)
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

func (module *module) UpdateV2(ctx context.Context, orgID valuer.UUID, id valuer.UUID, updatedBy string, updateable dashboardtypes.UpdateableDashboardV2) (*dashboardtypes.DashboardV2, error) {
	if err := updateable.Validate(); err != nil {
		return nil, err
	}

	existing, err := module.GetV2(ctx, orgID, id)
	if err != nil {
		return nil, err
	}
	// safety check before upserting tags. existing.Update also has this checks, but
	// because existing.Update needs the resolved tags, that method can only be called
	// after the tags have been resolved.
	if err := existing.CanUpdate(); err != nil {
		return nil, err
	}

	// Tag upserts run outside the update transaction for the same reason as
	// Create: a successful upsert that loses the outer transaction just leaves
	// resolved tag rows around for the next attempt.
	resolvedTags, err := module.tagModule.CreateMany(ctx, orgID, updateable.Tags, updatedBy)
	if err != nil {
		return nil, err
	}
	tagIDs := make([]valuer.UUID, len(resolvedTags))
	for i, t := range resolvedTags {
		tagIDs[i] = t.ID
	}

	if err := existing.Update(updateable, updatedBy, resolvedTags); err != nil {
		return nil, err
	}

	storable, err := existing.ToStorableDashboard()
	if err != nil {
		return nil, err
	}

	err = module.sqlstore.RunInTxCtx(ctx, nil, func(ctx context.Context) error {
		if err := module.tagModule.SyncLinksForEntity(ctx, orgID, dashboardtypes.EntityTypeDashboard, id, tagIDs); err != nil {
			return err
		}
		return module.store.UpdateV2(ctx, orgID, id, updatedBy, storable.Data)
	})
	if err != nil {
		return nil, err
	}

	return existing, nil
}
