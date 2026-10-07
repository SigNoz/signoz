package sqlalertmanagerstore

import (
	"context"
	"encoding/json"
	"log/slog"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
)

type maintenance struct {
	sqlstore sqlstore.SQLStore
	logger   *slog.Logger
}

func NewMaintenanceStore(store sqlstore.SQLStore, providerSettings factory.ProviderSettings) alertmanagertypes.MaintenanceStore {
	return &maintenance{
		sqlstore: store,
		logger:   providerSettings.Logger,
	}
}

func (r *maintenance) ListPlannedMaintenance(ctx context.Context, orgID string) ([]*alertmanagertypes.PlannedMaintenance, error) {
	gettableMaintenancesRules := make([]*alertmanagertypes.PlannedMaintenanceWithRules, 0)
	err := r.sqlstore.
		BunDB().
		NewSelect().
		Model(&gettableMaintenancesRules).
		Relation("Rules").
		Where("org_id = ?", orgID).
		Scan(ctx)
	if err != nil {
		return nil, err
	}

	plannedMaintenances := make([]*alertmanagertypes.PlannedMaintenance, 0, len(gettableMaintenancesRules))
	for _, gettableMaintenancesRule := range gettableMaintenancesRules {
		pm, err := gettableMaintenancesRule.ToPlannedMaintenance()
		if err != nil {
			// Don't return an error because we want to process all the valid records.
			// Log and skip instead.
			r.logger.WarnContext(ctx, "skipping planned maintenance", slog.String("maintenance_id", gettableMaintenancesRule.ID.StringValue()), errors.Attr(err))
			continue
		}

		plannedMaintenances = append(plannedMaintenances, pm)
	}

	return plannedMaintenances, nil
}

func (r *maintenance) GetPlannedMaintenanceByID(ctx context.Context, id valuer.UUID) (*alertmanagertypes.PlannedMaintenance, error) {
	storableMaintenanceRule := new(alertmanagertypes.PlannedMaintenanceWithRules)
	err := r.sqlstore.
		BunDB().
		NewSelect().
		Model(storableMaintenanceRule).
		Relation("Rules").
		Where("id = ?", id.StringValue()).
		Scan(ctx)
	if err != nil {
		return nil, r.sqlstore.WrapNotFoundErrf(err, errors.CodeNotFound, "planned maintenance with ID: %s does not exist", id.StringValue())
	}

	return storableMaintenanceRule.ToPlannedMaintenance()
}

func (r *maintenance) CreatePlannedMaintenance(ctx context.Context, maintenance *alertmanagertypes.PostablePlannedMaintenance) (*alertmanagertypes.PlannedMaintenance, error) {
	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		return nil, err
	}

	schedule, err := json.Marshal(maintenance.Schedule)
	if err != nil {
		return nil, err
	}

	storablePlannedMaintenance := alertmanagertypes.StorablePlannedMaintenance{
		Identifiable: types.Identifiable{
			ID: valuer.GenerateUUID(),
		},
		TimeAuditable: types.TimeAuditable{
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
		UserAuditable: types.UserAuditable{
			CreatedBy: claims.Email,
			UpdatedBy: claims.Email,
		},
		Name:        maintenance.Name,
		Description: maintenance.Description,
		Schedule:    string(schedule),
		OrgID:       claims.OrgID,
		Scope:       maintenance.Scope,
		Origin:      alertmanagertypes.MaintenanceOriginMaintenance,
	}

	maintenanceRules := make([]*alertmanagertypes.StorablePlannedMaintenanceRule, 0)
	for _, ruleIDStr := range maintenance.AlertIds {
		ruleID, err := valuer.NewUUID(ruleIDStr)
		if err != nil {
			return nil, err
		}

		maintenanceRules = append(maintenanceRules, &alertmanagertypes.StorablePlannedMaintenanceRule{
			Identifiable: types.Identifiable{
				ID: valuer.GenerateUUID(),
			},
			PlannedMaintenanceID: storablePlannedMaintenance.ID,
			RuleID:               ruleID,
		})
	}

	err = r.sqlstore.RunInTxCtx(ctx, nil, func(ctx context.Context) error {
		_, err := r.sqlstore.
			BunDBCtx(ctx).
			NewInsert().
			Model(&storablePlannedMaintenance).
			Exec(ctx)
		if err != nil {
			return err
		}

		if len(maintenanceRules) > 0 {
			_, err = r.sqlstore.
				BunDBCtx(ctx).
				NewInsert().
				Model(&maintenanceRules).
				Exec(ctx)
			if err != nil {
				return err
			}

		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	pm := &alertmanagertypes.PlannedMaintenance{
		ID:          storablePlannedMaintenance.ID,
		Name:        storablePlannedMaintenance.Name,
		Description: storablePlannedMaintenance.Description,
		RuleIDs:     maintenance.AlertIds,
		Scope:       maintenance.Scope,
		Origin:      storablePlannedMaintenance.Origin,
		CreatedAt:   storablePlannedMaintenance.CreatedAt,
		CreatedBy:   storablePlannedMaintenance.CreatedBy,
		UpdatedAt:   storablePlannedMaintenance.UpdatedAt,
		UpdatedBy:   storablePlannedMaintenance.UpdatedBy,
	}
	if err = json.Unmarshal([]byte(storablePlannedMaintenance.Schedule), &pm.Schedule); err != nil {
		return nil, err
	}
	return pm, nil
}

func (r *maintenance) DeletePlannedMaintenance(ctx context.Context, id valuer.UUID) error {
	_, err := r.sqlstore.
		BunDB().
		NewDelete().
		Model(new(alertmanagertypes.StorablePlannedMaintenance)).
		Where("id = ?", id.StringValue()).
		Exec(ctx)
	if err != nil {
		return r.sqlstore.WrapAlreadyExistsErrf(err, errors.CodeAlreadyExists, "cannot delete planned maintenance because it is referenced by associated rules, remove the rules from the planned maintenance first")
	}

	return nil
}

func (r *maintenance) UpdatePlannedMaintenance(ctx context.Context, maintenance *alertmanagertypes.PostablePlannedMaintenance, id valuer.UUID) error {
	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		return err
	}

	existing, err := r.GetPlannedMaintenanceByID(ctx, id)
	if err != nil {
		return err
	}

	schedule, err := json.Marshal(maintenance.Schedule)
	if err != nil {
		return err
	}

	storablePlannedMaintenance := alertmanagertypes.StorablePlannedMaintenance{
		Identifiable: types.Identifiable{
			ID: id,
		},
		TimeAuditable: types.TimeAuditable{
			CreatedAt: existing.CreatedAt,
			UpdatedAt: time.Now(),
		},
		UserAuditable: types.UserAuditable{
			CreatedBy: existing.CreatedBy,
			UpdatedBy: claims.Email,
		},
		Name:        maintenance.Name,
		Description: maintenance.Description,
		Schedule:    string(schedule),
		OrgID:       claims.OrgID,
		Scope:       maintenance.Scope,
		Origin:      existing.Origin,
	}

	storablePlannedMaintenanceRules := make([]*alertmanagertypes.StorablePlannedMaintenanceRule, 0)
	for _, ruleIDStr := range maintenance.AlertIds {
		ruleID, err := valuer.NewUUID(ruleIDStr)
		if err != nil {
			return err
		}

		storablePlannedMaintenanceRules = append(storablePlannedMaintenanceRules, &alertmanagertypes.StorablePlannedMaintenanceRule{
			Identifiable: types.Identifiable{
				ID: valuer.GenerateUUID(),
			},
			RuleID:               ruleID,
			PlannedMaintenanceID: storablePlannedMaintenance.ID,
		})
	}

	err = r.sqlstore.RunInTxCtx(ctx, nil, func(ctx context.Context) error {
		_, err := r.sqlstore.
			BunDBCtx(ctx).
			NewUpdate().
			Model(&storablePlannedMaintenance).
			Where("id = ?", storablePlannedMaintenance.ID.StringValue()).
			Exec(ctx)
		if err != nil {
			return err
		}

		_, err = r.sqlstore.
			BunDBCtx(ctx).
			NewDelete().
			Model(new(alertmanagertypes.StorablePlannedMaintenanceRule)).
			Where("planned_maintenance_id = ?", storablePlannedMaintenance.ID.StringValue()).
			Exec(ctx)
		if err != nil {
			return err
		}

		if len(storablePlannedMaintenanceRules) > 0 {
			_, err = r.sqlstore.
				BunDBCtx(ctx).
				NewInsert().
				Model(&storablePlannedMaintenanceRules).
				Exec(ctx)
			if err != nil {
				return err
			}
		}

		return nil
	})
	if err != nil {
		return err
	}

	return nil
}

func (r *maintenance) ListAdhocPlannedMaintenanceByRule(ctx context.Context, orgID string, ruleID valuer.UUID) ([]*alertmanagertypes.PlannedMaintenance, error) {
	rows, err := r.listAdhocWithRules(ctx, r.sqlstore.BunDBCtx(ctx), orgID, ruleID)
	if err != nil {
		return nil, err
	}

	plannedMaintenances := make([]*alertmanagertypes.PlannedMaintenance, 0, len(rows))
	for _, row := range rows {
		plannedMaintenance, err := row.ToPlannedMaintenance()
		if err != nil {
			r.logger.WarnContext(ctx, "skipping adhoc planned maintenance", slog.String("maintenance_id", row.ID.StringValue()), errors.Attr(err))
			continue
		}
		plannedMaintenances = append(plannedMaintenances, plannedMaintenance)
	}

	return plannedMaintenances, nil
}

func (r *maintenance) UpsertAdhocPlannedMaintenance(ctx context.Context, ruleID valuer.UUID, ruleName string, endTime time.Time) (*alertmanagertypes.PlannedMaintenance, error) {
	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		return nil, err
	}

	var maintenanceID valuer.UUID
	now := time.Now().UTC()

	err = r.sqlstore.RunInTxCtx(ctx, nil, func(ctx context.Context) error {
		db := r.sqlstore.BunDBCtx(ctx)

		rows, err := r.listAdhocWithRules(ctx, db, claims.OrgID, ruleID)
		if err != nil {
			return err
		}

		if len(rows) == 0 {
			storableMaintenance, storableMaintenanceRule, err := alertmanagertypes.NewAdhocStorablePlannedMaintenance(claims.OrgID, claims.Email, ruleID, ruleName, now, endTime)
			if err != nil {
				return err
			}
			if _, err := db.NewInsert().Model(storableMaintenance).Exec(ctx); err != nil {
				return err
			}
			if _, err := db.NewInsert().Model(storableMaintenanceRule).Exec(ctx); err != nil {
				return err
			}
			maintenanceID = storableMaintenance.ID
			return nil
		}

		existing := rows[0]
		maintenanceID = existing.ID

		// An active mute keeps its original start; an expired leftover restarts at now.
		startTime := now
		if plannedMaintenance, err := existing.ToPlannedMaintenance(); err == nil && plannedMaintenance.IsActive(now) {
			startTime = plannedMaintenance.Schedule.StartTime
		}

		schedule, err := json.Marshal(&alertmanagertypes.Schedule{Timezone: "UTC", StartTime: startTime, EndTime: endTime})
		if err != nil {
			return err
		}

		if _, err := db.NewUpdate().
			Model((*alertmanagertypes.StorablePlannedMaintenance)(nil)).
			Set("schedule = ?", string(schedule)).
			Set("updated_at = ?", now).
			Set("updated_by = ?", claims.Email).
			Where("id = ?", existing.ID.StringValue()).
			Exec(ctx); err != nil {
			return err
		}

		// Self-heal duplicates that predate the single-adhoc-row invariant.
		if len(rows) > 1 {
			extraIDs := make([]string, 0, len(rows)-1)
			for _, row := range rows[1:] {
				extraIDs = append(extraIDs, row.ID.StringValue())
			}
			if err := r.deleteMaintenancesByIDs(ctx, db, extraIDs); err != nil {
				return err
			}
		}

		return nil
	})
	if err != nil {
		return nil, err
	}

	return r.GetPlannedMaintenanceByID(ctx, maintenanceID)
}

func (r *maintenance) DeleteAdhocPlannedMaintenanceByRule(ctx context.Context, orgID string, ruleID valuer.UUID) (int64, error) {
	var deleted int64

	err := r.sqlstore.RunInTxCtx(ctx, nil, func(ctx context.Context) error {
		db := r.sqlstore.BunDBCtx(ctx)

		rows, err := r.listAdhocWithRules(ctx, db, orgID, ruleID)
		if err != nil {
			return err
		}
		if len(rows) == 0 {
			return nil
		}

		ids := make([]string, 0, len(rows))
		for _, row := range rows {
			ids = append(ids, row.ID.StringValue())
		}

		if err := r.deleteMaintenancesByIDs(ctx, db, ids); err != nil {
			return err
		}
		deleted = int64(len(ids))
		return nil
	})
	if err != nil {
		return 0, err
	}

	return deleted, nil
}

func (r *maintenance) listAdhocWithRules(ctx context.Context, db bun.IDB, orgID string, ruleID valuer.UUID) ([]*alertmanagertypes.PlannedMaintenanceWithRules, error) {
	rows := make([]*alertmanagertypes.PlannedMaintenanceWithRules, 0)
	err := db.NewSelect().
		Model(&rows).
		Relation("Rules").
		Join("JOIN planned_maintenance_rule AS pmr ON pmr.planned_maintenance_id = ?TableAlias.id").
		Where("?TableAlias.org_id = ?", orgID).
		Where("?TableAlias.origin = ?", alertmanagertypes.MaintenanceOriginAdhoc).
		Where("pmr.rule_id = ?", ruleID.StringValue()).
		Scan(ctx)
	if err != nil {
		return nil, err
	}
	return rows, nil
}

func (r *maintenance) deleteMaintenancesByIDs(ctx context.Context, db bun.IDB, ids []string) error {
	if _, err := db.NewDelete().
		Model((*alertmanagertypes.StorablePlannedMaintenanceRule)(nil)).
		Where("planned_maintenance_id IN (?)", bun.In(ids)).
		Exec(ctx); err != nil {
		return err
	}
	if _, err := db.NewDelete().
		Model((*alertmanagertypes.StorablePlannedMaintenance)(nil)).
		Where("id IN (?)", bun.In(ids)).
		Exec(ctx); err != nil {
		return err
	}
	return nil
}
