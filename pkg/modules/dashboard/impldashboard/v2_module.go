package impldashboard

import (
	"context"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
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

// ListV2 calls the store for the joined page (the store owns DSL compilation
// and limit+1/hasMore detection), batch-fetches tags for the returned
// dashboard ids, and hands off to the type-side constructor for assembly.
func (module *module) ListV2(ctx context.Context, orgID valuer.UUID, userID valuer.UUID, params *dashboardtypes.ListDashboardsV2Params) (*dashboardtypes.ListableDashboardV2, error) {
	rows, hasMore, err := module.store.ListV2(ctx, orgID, userID, params)
	if err != nil {
		return nil, err
	}

	dashboardIDs := make([]valuer.UUID, len(rows))
	for i, r := range rows {
		dashboardIDs[i] = r.Dashboard.ID
	}
	tagsByEntity, err := module.tagModule.ListForEntities(ctx, dashboardtypes.EntityTypeDashboard, dashboardIDs)
	if err != nil {
		return nil, err
	}

	return dashboardtypes.NewListableDashboardV2(rows, tagsByEntity, hasMore)
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

func (module *module) PatchV2(ctx context.Context, orgID valuer.UUID, id valuer.UUID, updatedBy string, patch dashboardtypes.PatchableDashboardV2) (*dashboardtypes.DashboardV2, error) {
	existing, err := module.GetV2(ctx, orgID, id)
	if err != nil {
		return nil, err
	}
	// Locked-dashboard / state gate — independent of tags, so run it before the tx.
	if err := existing.CanUpdate(); err != nil {
		return nil, err
	}

	updateable, err := patch.Apply(existing)
	if err != nil {
		return nil, err
	}

	err = module.sqlstore.RunInTxCtx(ctx, nil, func(ctx context.Context) error {
		resolvedTags, err := module.tagModule.SyncTags(ctx, orgID, coretypes.KindDashboard, id, updateable.Tags)
		if err != nil {
			return err
		}

		err = existing.Update(*updateable, updatedBy, resolvedTags)
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

// CreatePublicV2 is not supported in the community build.
func (module *module) CreatePublicV2(_ context.Context, _ valuer.UUID, _ valuer.UUID, _ dashboardtypes.PostablePublicDashboard) (*dashboardtypes.DashboardV2, error) {
	return nil, errors.Newf(errors.TypeUnsupported, dashboardtypes.ErrCodePublicDashboardUnsupported, "not implemented")
}

// UpdatePublicV2 is not supported in the community build.
func (module *module) UpdatePublicV2(_ context.Context, _ valuer.UUID, _ valuer.UUID, _ dashboardtypes.UpdatablePublicDashboard) (*dashboardtypes.DashboardV2, error) {
	return nil, errors.Newf(errors.TypeUnsupported, dashboardtypes.ErrCodePublicDashboardUnsupported, "not implemented")
}

func (module *module) LockUnlockV2(ctx context.Context, orgID valuer.UUID, id valuer.UUID, updatedBy string, isAdmin bool, lock bool) error {
	existing, err := module.GetV2(ctx, orgID, id)
	if err != nil {
		return err
	}
	if err := existing.LockUnlock(lock, isAdmin, updatedBy); err != nil {
		return err
	}
	return module.store.LockUnlockV2(ctx, orgID, id, lock, updatedBy)
}

func (module *module) PinV2(ctx context.Context, orgID valuer.UUID, userID valuer.UUID, id valuer.UUID) error {
	if _, err := module.GetV2(ctx, orgID, id); err != nil {
		return err
	}
	return module.store.PinForUser(ctx, &dashboardtypes.PinnedDashboard{
		UserID:      userID,
		DashboardID: id,
		OrgID:       orgID,
		PinnedAt:    time.Now(),
	})
}

func (module *module) UnpinV2(ctx context.Context, userID valuer.UUID, id valuer.UUID) error {
	return module.store.UnpinForUser(ctx, userID, id)
}
