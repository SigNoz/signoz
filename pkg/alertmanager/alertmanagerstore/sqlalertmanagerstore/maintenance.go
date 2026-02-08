package sqlalertmanagerstore

import (
	"context"
	"encoding/json"
	"time"

	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type maintenance struct {
	sqlstore sqlstore.SQLStore
}

func NewMaintenanceStore(store sqlstore.SQLStore) alertmanagertypes.MaintenanceStore {
	return &maintenance{sqlstore: store}
}

func (r *maintenance) GetAllPlannedMaintenance(ctx context.Context, orgID string) ([]*alertmanagertypes.GettablePlannedMaintenance, error) {
	storables := make([]*alertmanagertypes.StorablePlannedMaintenance, 0)
	err := r.sqlstore.
		BunDB().
		NewSelect().
		Model(&storables).
		Where("org_id = ?", orgID).
		Scan(ctx)
	if err != nil {
		return nil, err
	}

	result := make([]*alertmanagertypes.GettablePlannedMaintenance, 0, len(storables))
	for _, s := range storables {
		result = append(result, alertmanagertypes.ConvertStorableToGettable(s))
	}

	return result, nil
}

func (r *maintenance) GetPlannedMaintenanceByID(ctx context.Context, id valuer.UUID) (*alertmanagertypes.GettablePlannedMaintenance, error) {
	storable := new(alertmanagertypes.StorablePlannedMaintenance)
	err := r.sqlstore.
		BunDB().
		NewSelect().
		Model(storable).
		Where("id = ?", id.StringValue()).
		Scan(ctx)
	if err != nil {
		return nil, err
	}

	return alertmanagertypes.ConvertStorableToGettable(storable), nil
}

func (r *maintenance) CreatePlannedMaintenance(ctx context.Context, maintenance alertmanagertypes.GettablePlannedMaintenance) (valuer.UUID, error) {
	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		return valuer.UUID{}, err
	}

	var ruleIDsStr string
	if len(maintenance.RuleIDs) > 0 {
		data, err := json.Marshal(maintenance.RuleIDs)
		if err != nil {
			return valuer.UUID{}, err
		}
		ruleIDsStr = string(data)
	}

	storable := alertmanagertypes.StorablePlannedMaintenance{
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
		RuleIDs:     ruleIDsStr,
		Expression:  maintenance.Expression,
		OrgID:       claims.OrgID,
	}

	_, err = r.sqlstore.
		BunDB().
		NewInsert().
		Model(&storable).
		Exec(ctx)
	if err != nil {
		return valuer.UUID{}, err
	}

	return storable.ID, nil
}

func (r *maintenance) DeletePlannedMaintenance(ctx context.Context, id valuer.UUID) error {
	_, err := r.sqlstore.
		BunDB().
		NewDelete().
		Model(new(alertmanagertypes.StorablePlannedMaintenance)).
		Where("id = ?", id.StringValue()).
		Exec(ctx)
	if err != nil {
		return err
	}

	return nil
}

func (r *maintenance) EditPlannedMaintenance(ctx context.Context, maintenance alertmanagertypes.GettablePlannedMaintenance, id valuer.UUID) error {
	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		return err
	}

	var ruleIDsStr string
	if len(maintenance.RuleIDs) > 0 {
		data, err := json.Marshal(maintenance.RuleIDs)
		if err != nil {
			return err
		}
		ruleIDsStr = string(data)
	}

	storable := alertmanagertypes.StorablePlannedMaintenance{
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
		RuleIDs:     ruleIDsStr,
		Expression:  maintenance.Expression,
		OrgID:       claims.OrgID,
	}

	_, err = r.sqlstore.
		BunDB().
		NewUpdate().
		Model(&storable).
		Where("id = ?", storable.ID.StringValue()).
		Exec(ctx)
	if err != nil {
		return err
	}

	return nil
}
