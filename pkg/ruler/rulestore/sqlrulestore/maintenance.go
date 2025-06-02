package sqlrulestore

import (
	"context"
	"time"

	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	ruletypes "github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type maintenance struct {
	sqlstore sqlstore.SQLStore
}

func NewMaintenanceStore(store sqlstore.SQLStore) ruletypes.MaintenanceStore {
	return &maintenance{sqlstore: store}
}

func (r *maintenance) GetAllPlannedMaintenance(ctx context.Context, orgID string) ([]*ruletypes.GettablePlannedMaintenance, error) {
	gettableMaintenancesRules := make([]*ruletypes.GettablePlannedMaintenanceRule, 0)
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

	gettablePlannedMaintenance := make([]*ruletypes.GettablePlannedMaintenance, 0)
	for _, gettableMaintenancesRule := range gettableMaintenancesRules {
		gettablePlannedMaintenance = append(gettablePlannedMaintenance, gettableMaintenancesRule.ConvertGettableMaintenanceRuleToGettableMaintenance())
	}

	return gettablePlannedMaintenance, nil
}

func (r *maintenance) GetPlannedMaintenanceByID(ctx context.Context, id valuer.UUID) (*ruletypes.GettablePlannedMaintenance, error) {
	storableMaintenanceRule := new(ruletypes.GettablePlannedMaintenanceRule)
	err := r.sqlstore.
		BunDB().
		NewSelect().
		Model(storableMaintenanceRule).
		Relation("Rules").
		Where("id = ?", id.StringValue()).
		Scan(ctx)
	if err != nil {
		return nil, err
	}

	return storableMaintenanceRule.ConvertGettableMaintenanceRuleToGettableMaintenance(), nil
}

func (r *maintenance) CreatePlannedMaintenance(ctx context.Context, maintenance ruletypes.GettablePlannedMaintenance) (valuer.UUID, error) {
	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		return valuer.UUID{}, err
	}

	storablePlannedMaintenance := ruletypes.StorablePlannedMaintenance{
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
	}

	maintenanceRules := make([]*ruletypes.StorablePlannedMaintenanceRule, 0)
	for _, ruleIDStr := range maintenance.RuleIDs {
		ruleID, err := valuer.NewUUID(ruleIDStr)
		if err != nil {
			return valuer.UUID{}, err
		}

		maintenanceRules = append(maintenanceRules, &ruletypes.StorablePlannedMaintenanceRule{
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
		return valuer.UUID{}, err
	}

	return storablePlannedMaintenance.ID, nil
}

func (r *maintenance) DeletePlannedMaintenance(ctx context.Context, id valuer.UUID) error {
	_, err := r.sqlstore.
		BunDB().
		NewDelete().
		Model(new(ruletypes.StorablePlannedMaintenance)).
		Where("id = ?", id.StringValue()).
		Exec(ctx)
	if err != nil {
		return err
	}

	return nil
}

func (r *maintenance) EditPlannedMaintenance(ctx context.Context, maintenance ruletypes.GettablePlannedMaintenance, id valuer.UUID) error {
	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		return err
	}

	storablePlannedMaintenance := ruletypes.StorablePlannedMaintenance{
		Identifiable: types.Identifiable{
			ID: id,
		},
		TimeAuditable: types.TimeAuditable{
			CreatedAt: maintenance.CreatedAt,
			UpdatedAt: time.Now(),
		},
		UserAuditable: types.UserAuditable{
			CreatedBy: maintenance.CreatedBy,
			UpdatedBy: claims.Email,
		},
		Name:        maintenance.Name,
		Description: maintenance.Description,
		Schedule:    maintenance.Schedule,
		OrgID:       claims.OrgID,
	}

	storablePlannedMaintenanceRules := make([]*ruletypes.StorablePlannedMaintenanceRule, 0)
	for _, ruleIDStr := range maintenance.RuleIDs {
		ruleID, err := valuer.NewUUID(ruleIDStr)
		if err != nil {
			return err
		}

		storablePlannedMaintenanceRules = append(storablePlannedMaintenanceRules, &ruletypes.StorablePlannedMaintenanceRule{
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
			Model(new(ruletypes.StorablePlannedMaintenanceRule)).
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
