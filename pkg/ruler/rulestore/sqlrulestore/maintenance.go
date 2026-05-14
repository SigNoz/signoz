package sqlrulestore

import (
	"context"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
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

func (r *maintenance) ListPlannedMaintenance(ctx context.Context, orgID string) ([]*ruletypes.PlannedMaintenance, error) {
	gettableMaintenancesRules := make([]*ruletypes.PlannedMaintenanceWithRules, 0)
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

	gettablePlannedMaintenance := make([]*ruletypes.PlannedMaintenance, 0)
	for _, gettableMaintenancesRule := range gettableMaintenancesRules {
		gettablePlannedMaintenance = append(gettablePlannedMaintenance, gettableMaintenancesRule.ToPlannedMaintenance())
	}

	return gettablePlannedMaintenance, nil
}

func (r *maintenance) GetPlannedMaintenanceByID(ctx context.Context, id valuer.UUID) (*ruletypes.PlannedMaintenance, error) {
	storableMaintenanceRule := new(ruletypes.PlannedMaintenanceWithRules)
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

func (r *maintenance) CreatePlannedMaintenance(ctx context.Context, maintenance *ruletypes.PostablePlannedMaintenance) (*ruletypes.PlannedMaintenance, error) {
	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		return nil, err
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
	for _, ruleIDStr := range maintenance.AlertIds {
		ruleID, err := valuer.NewUUID(ruleIDStr)
		if err != nil {
			return nil, err
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
		return nil, err
	}

	return &ruletypes.PlannedMaintenance{
		ID:          storablePlannedMaintenance.ID,
		Name:        storablePlannedMaintenance.Name,
		Description: storablePlannedMaintenance.Description,
		Schedule:    storablePlannedMaintenance.Schedule,
		RuleIDs:     maintenance.AlertIds,
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
		Model(new(ruletypes.StorablePlannedMaintenance)).
		Where("id = ?", id.StringValue()).
		Exec(ctx)
	if err != nil {
		return r.sqlstore.WrapAlreadyExistsErrf(err, errors.CodeAlreadyExists, "cannot delete planned maintenance because it is referenced by associated rules, remove the rules from the planned maintenance first")
	}

	return nil
}

func (r *maintenance) UpdatePlannedMaintenance(ctx context.Context, maintenance *ruletypes.PostablePlannedMaintenance, id valuer.UUID) error {
	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		return err
	}

	existing, err := r.GetPlannedMaintenanceByID(ctx, id)
	if err != nil {
		return err
	}

	storablePlannedMaintenance := ruletypes.StorablePlannedMaintenance{
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
	}

	storablePlannedMaintenanceRules := make([]*ruletypes.StorablePlannedMaintenanceRule, 0)
	for _, ruleIDStr := range maintenance.AlertIds {
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
