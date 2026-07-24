package impldashboard

import (
	"context"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/transition"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/SigNoz/signoz/pkg/types/dashboardtypes"
	"github.com/SigNoz/signoz/pkg/types/tagtypes"
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

func (m *module) CloneV2(ctx context.Context, orgID valuer.UUID, createdBy string, creator valuer.UUID, id valuer.UUID) (*dashboardtypes.DashboardV2, error) {
	existing, err := m.GetV2(ctx, orgID, id)
	if err != nil {
		return nil, err
	}
	if err := existing.ErrIfNotClonable(); err != nil {
		return nil, err
	}

	return m.CreateV2(ctx, orgID, createdBy, creator, dashboardtypes.SourceUser, existing.ToPostableForCloning())
}

func (module *module) ListV2(ctx context.Context, orgID valuer.UUID, params *dashboardtypes.ListDashboardsV2Params) (*dashboardtypes.ListableDashboardV2, error) {
	dashboards, total, err := module.store.ListV2(ctx, orgID, params)
	if err != nil {
		return nil, err
	}

	dashboardIDs := make([]valuer.UUID, len(dashboards))
	for i, d := range dashboards {
		dashboardIDs[i] = d.ID
	}

	tagsByDashboard, allTags, err := module.fetchDashboardTags(ctx, orgID, dashboardIDs)
	if err != nil {
		return nil, err
	}

	return dashboardtypes.NewListableDashboardV2(dashboards, total, tagsByDashboard, allTags), nil
}

func (module *module) ListForUserV2(ctx context.Context, orgID valuer.UUID, userID valuer.UUID, params *dashboardtypes.ListDashboardsV2Params) (*dashboardtypes.ListableDashboardForUserV2, error) {
	rows, total, err := module.store.ListForUser(ctx, orgID, userID, params)
	if err != nil {
		return nil, err
	}

	dashboardIDs := make([]valuer.UUID, len(rows))
	for i, r := range rows {
		dashboardIDs[i] = r.Dashboard.ID
	}

	tagsByDashboard, allTags, err := module.fetchDashboardTags(ctx, orgID, dashboardIDs)
	if err != nil {
		return nil, err
	}

	return dashboardtypes.NewListableDashboardForUserV2(rows, total, tagsByDashboard, allTags), nil
}

func (module *module) fetchDashboardTags(ctx context.Context, orgID valuer.UUID, dashboardIDs []valuer.UUID) (map[valuer.UUID][]*tagtypes.Tag, []*tagtypes.Tag, error) {
	tagsByDashboard, err := module.tagModule.ListForResources(ctx, orgID, coretypes.KindDashboard, dashboardIDs)
	if err != nil {
		return nil, nil, err
	}

	allTags, err := module.tagModule.List(ctx, orgID, coretypes.KindDashboard)
	if err != nil {
		return nil, nil, err
	}

	return tagsByDashboard, allTags, nil
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
	if err := existing.ErrIfNotUpdatable(); err != nil {
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
	if err := existing.ErrIfNotUpdatable(); err != nil {
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

func (module *module) DeleteV2(ctx context.Context, orgID valuer.UUID, id valuer.UUID) error {
	existing, err := module.GetV2(ctx, orgID, id)
	if err != nil {
		return err
	}
	if err := existing.ErrIfNotDeletable(); err != nil {
		return err
	}

	return module.store.RunInTx(ctx, func(ctx context.Context) error {
		// Syncing to an empty tag set drops every tag link for the dashboard.
		if _, err := module.tagModule.SyncTags(ctx, orgID, coretypes.KindDashboard, id, nil); err != nil {
			return err
		}
		if err := module.store.DeletePreferencesForDashboard(ctx, orgID, id); err != nil {
			return err
		}
		return module.store.Delete(ctx, orgID, id)
	})
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

func (module *module) PinV2(ctx context.Context, orgID valuer.UUID, userID valuer.UUID, id valuer.UUID) error {
	if _, err := module.GetV2(ctx, orgID, id); err != nil {
		return err
	}
	return module.store.PinForUser(ctx, dashboardtypes.NewUserDashboardPreference(userID, id))
}

func (module *module) UnpinV2(ctx context.Context, orgID valuer.UUID, userID valuer.UUID, id valuer.UUID) error {
	return module.store.UnpinForUser(ctx, orgID, userID, id)
}

func (module *module) DeletePreferencesForUser(ctx context.Context, orgID valuer.UUID, userID valuer.UUID) error {
	return module.store.DeletePreferencesForUser(ctx, orgID, userID)
}

// ConvertAllV1ToV2 migrates every dashboard in the org from the v1 to the v2
// schema in place: each v1 dashboard is converted and its stored data is
// overwritten (with tags synced), dashboards already in v2 are skipped. Each
// dashboard is migrated in its own transaction so one failure doesn't roll back
// the rest. Temporary scaffolding for the schema migration.
func (m *module) ConvertAllV1ToV2(ctx context.Context, orgID valuer.UUID) (*dashboardtypes.V1ToV2MigrationResult, error) {
	storables, err := m.store.List(ctx, orgID)
	if err != nil {
		return nil, err
	}

	result := &dashboardtypes.V1ToV2MigrationResult{
		Total:   len(storables),
		Results: make([]dashboardtypes.V1ToV2MigrationItem, 0, len(storables)),
	}

	migrator := transition.NewDashboardMigrateV5(m.settings.Logger(), nil, nil)

	for _, storable := range storables {
		item := dashboardtypes.V1ToV2MigrationItem{ID: storable.ID.String()}

		if storable.IsV2() {
			item.Status = "skipped"
			result.Skipped++
			result.Results = append(result.Results, item)
			continue
		}

		// The v1→v2 conversion assumes v5-shaped widget queries, so run the
		// v4→v5 migration first (in place) — same pass the create path runs.
		migrator.Migrate(ctx, storable.Data)

		if err := m.migrateOneV1ToV2(ctx, orgID, storable); err != nil {
			item.Status = "failed"
			item.Error = err.Error()
			result.Failed++
			// Backfill the name column from the v1 title even though the data couldn't
			// migrate, so the dashboard stays findable by name. Only when it's unset, so a
			// retry doesn't regenerate a different (randomly-suffixed) name. Best-effort.
			if storable.Name == "" {
				if nameErr := m.store.UpdateName(ctx, orgID, storable.ID, storable.V1Name()); nameErr != nil {
					m.settings.Logger().ErrorContext(ctx, "failed to backfill name for unmigrated dashboard", "dashboard_id", storable.ID.String(), "error", nameErr)
				}
			}
		} else {
			item.Status = "migrated"
			result.Migrated++
		}
		result.Results = append(result.Results, item)
	}

	return result, nil
}

func (m *module) migrateOneV1ToV2(ctx context.Context, orgID valuer.UUID, storable *dashboardtypes.StorableDashboard) error {
	v2, err := storable.ConvertV1ToV2()
	if err != nil {
		return err
	}

	return m.store.RunInTx(ctx, func(ctx context.Context) error {
		resolvedTags, err := m.tagModule.SyncTags(ctx, orgID, coretypes.KindDashboard, v2.ID, tagtypes.NewPostableTagsFromTags(v2.Tags))
		if err != nil {
			return err
		}
		v2.Tags = resolvedTags

		v2Storable, err := v2.ToStorableDashboard()
		if err != nil {
			return err
		}

		return m.store.Update(ctx, orgID, v2Storable)
	})
}
