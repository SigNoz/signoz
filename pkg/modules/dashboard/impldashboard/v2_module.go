package impldashboard

import (
	"context"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/SigNoz/signoz/pkg/types/dashboardtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

func (m *module) CreateV2(ctx context.Context, orgID valuer.UUID, createdBy string, creator valuer.UUID, source dashboardtypes.Source, postable dashboardtypes.PostableDashboardV2) (*dashboardtypes.DashboardV2, error) {
	if !source.IsValid() {
		return nil, errors.Newf(errors.TypeInvalidInput, dashboardtypes.ErrCodeDashboardInvalidSource, "invalid dashboard source %q, must be one of user, system, integration", source.StringValue())
	}
	if err := postable.Validate(); err != nil {
		return nil, err
	}

	dashboard := postable.NewDashboardV2(orgID, createdBy, source)
	var storableDashboard *dashboardtypes.StorableDashboard

	err := m.store.RunInTx(ctx, func(ctx context.Context) error {
		resolvedTags, err := m.tagModule.SyncTags(ctx, orgID, coretypes.KindDashboard, dashboard.ID, postable.Tags)
		if err != nil {
			return err
		}
		dashboard.Tags = resolvedTags

		storable, err := dashboard.ToStorableDashboard()
		if err != nil {
			return err
		}
		storableDashboard = storable
		return m.store.Create(ctx, storable)
	})
	if err != nil {
		return nil, err
	}

	m.analytics.TrackUser(ctx, orgID.String(), creator.String(), "Dashboard Created", dashboardtypes.NewStatsFromStorableDashboards([]*dashboardtypes.StorableDashboard{storableDashboard}))
	return dashboard, nil
}

func (module *module) GetV2(ctx context.Context, orgID valuer.UUID, id valuer.UUID) (*dashboardtypes.DashboardV2, error) {
	storable, err := module.store.Get(ctx, orgID, id)
	if err != nil {
		return nil, err
	}

	tags, err := module.tagModule.ListForResource(ctx, orgID, coretypes.KindDashboard, id)
	if err != nil {
		return nil, err
	}

	return storable.ToDashboardV2(tags)
}

func (module *module) UpdateV2(ctx context.Context, orgID valuer.UUID, id valuer.UUID, updatedBy string, updatable dashboardtypes.UpdatableDashboardV2) (*dashboardtypes.DashboardV2, error) {
	if err := updatable.Validate(); err != nil {
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

	err = module.store.RunInTx(ctx, func(ctx context.Context) error {
		resolvedTags, err := module.tagModule.SyncTags(ctx, orgID, coretypes.KindDashboard, id, updatable.Tags)
		if err != nil {
			return err
		}

		err = existing.Update(updatable, updatedBy, resolvedTags)
		if err != nil {
			return err
		}

		storable, err := existing.ToStorableDashboard()
		if err != nil {
			return err
		}

		return module.store.Update(ctx, orgID, storable)
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

	err = module.store.RunInTx(ctx, func(ctx context.Context) error {
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

		return module.store.Update(ctx, orgID, storable)
	})
	if err != nil {
		return nil, err
	}

	return existing, nil
}

func (module *module) LockUnlockV2(ctx context.Context, orgID valuer.UUID, id valuer.UUID, updatedBy string, isAdmin bool, lock bool) error {
	existing, err := module.GetV2(ctx, orgID, id)
	if err != nil {
		return err
	}
	if err := existing.LockUnlock(lock, isAdmin, updatedBy); err != nil {
		return err
	}
	storable, err := existing.ToStorableDashboard()
	if err != nil {
		return err
	}
	return module.store.Update(ctx, orgID, storable)
}
