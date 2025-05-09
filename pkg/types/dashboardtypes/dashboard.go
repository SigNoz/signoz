package dashboardtypes

import (
	"context"
	"time"

	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
)

type Dashboard struct {
	ID     string      `json:"id"`
	Data   Data        `json:"data"`
	Locked bool        `json:"isLocked"`
	OrgID  valuer.UUID `json:"orgId"`
	types.TimeAuditable
	types.UserAuditable
}

type StorableDashboard struct {
	bun.BaseModel `bun:"table:dashboards"`

	types.Identifiable `bun:"id,pk,type:text"`
	Data               Data        `bun:"data,type:text,notnull"`
	IsLocked           bool        `bun:"is_locked,notnull"`
	OrgID              valuer.UUID `bun:"org_id,notnull"`
	types.TimeAuditable
	types.UserAuditable
}

func NewStorableDashboard(raw map[string]any, email string, orgID valuer.UUID) (*StorableDashboard, error) {
	data, err := NewData(raw)
	if err != nil {
		return nil, err
	}

	return &StorableDashboard{
		Identifiable: types.Identifiable{ID: valuer.GenerateUUID()},
		Data:         data,
		IsLocked:     false,
		OrgID:        orgID,
		TimeAuditable: types.TimeAuditable{
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
		UserAuditable: types.UserAuditable{
			CreatedBy: email,
			UpdatedBy: email,
		},
	}, nil
}

func NewDashboardFromStorableDashboard(storableDashboard *StorableDashboard) *Dashboard {
	return &Dashboard{
		ID:            storableDashboard.ID.String(),
		Data:          storableDashboard.Data,
		Locked:        storableDashboard.IsLocked,
		OrgID:         storableDashboard.OrgID,
		TimeAuditable: storableDashboard.TimeAuditable,
		UserAuditable: storableDashboard.UserAuditable,
	}
}

type Store interface {
	Create(context.Context, *StorableDashboard) error
	Get(context.Context, valuer.UUID) (*StorableDashboard, error)
	List(context.Context, valuer.UUID) ([]*StorableDashboard, error)
	Update(context.Context, *StorableDashboard) error
	Delete(context.Context, valuer.UUID) error
}
