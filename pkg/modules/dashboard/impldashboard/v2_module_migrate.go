package impldashboard

import (
	"context"
	"log/slog"

	"github.com/SigNoz/signoz/pkg/transition"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/SigNoz/signoz/pkg/types/dashboardtypes"
	"github.com/SigNoz/signoz/pkg/types/tagtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// Temporary v1→v2 bulk-migration scaffolding. It lives only on the migration
// feature branches (removed from the base branch that merges to main) and is
// kept in a dedicated file, off the core Module interface, so base→branch merges
// stay conflict-free. Callers reach it via dashboard.V1ToV2Migrator.

// ConvertAllV1ToV2 migrates every dashboard in the org from the v1 to the v2
// schema in place: each v1 dashboard is converted and its stored data is
// overwritten (with tags synced), dashboards already in v2 are skipped. Each
// dashboard is migrated in its own transaction so one failure doesn't roll back
// the rest.
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
					m.settings.Logger().ErrorContext(ctx, "failed to backfill name for unmigrated dashboard", slog.String("dashboard_id", storable.ID.String()), slog.Any("error", nameErr))
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
