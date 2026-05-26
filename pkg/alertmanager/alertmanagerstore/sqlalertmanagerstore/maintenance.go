package sqlalertmanagerstore

import (
	"context"
	"log/slog"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
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

	gettablePlannedMaintenance := make([]*alertmanagertypes.PlannedMaintenance, 0)
	for _, gettableMaintenancesRule := range gettableMaintenancesRules {
		m := gettableMaintenancesRule.ToPlannedMaintenance()
		gettablePlannedMaintenance = append(gettablePlannedMaintenance, m)
		if m.HasScheduleRecurrenceBoundsMismatch() {
			r.logger.WarnContext(ctx, "planned_downtime_recurrence_schedule_mismatch", slog.String("maintenance_id", m.ID.StringValue()))
		}
	}

	return gettablePlannedMaintenance, nil
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

	return storableMaintenanceRule.ToPlannedMaintenance(), nil
}

func (r *maintenance) CreatePlannedMaintenance(ctx context.Context, maintenance *alertmanagertypes.PostablePlannedMaintenance) (*alertmanagertypes.PlannedMaintenance, error) {
	claims, err := authtypes.ClaimsFromContext(ctx)
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
		Schedule:    maintenance.Schedule,
		OrgID:       claims.OrgID,
		Scope:       maintenance.Scope,
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

	return &alertmanagertypes.PlannedMaintenance{
		ID:          storablePlannedMaintenance.ID,
		Name:        storablePlannedMaintenance.Name,
		Description: storablePlannedMaintenance.Description,
		Schedule:    storablePlannedMaintenance.Schedule,
		RuleIDs:     maintenance.AlertIds,
		Scope:       maintenance.Scope,
		CreatedAt:   storablePlannedMaintenance.CreatedAt,
		CreatedBy:   storablePlannedMaintenance.CreatedBy,
		UpdatedAt:   storablePlannedMaintenance.UpdatedAt,
		UpdatedBy:   storablePlannedMaintenance.UpdatedBy,
	}, nil
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
		Schedule:    maintenance.Schedule,
		OrgID:       claims.OrgID,
		Scope:       maintenance.Scope,
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
