package dashboardtypes

import (
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
)

var (
	ErrCodePublicDashboardNotFound      = errors.MustNewCode("public_dashboard_not_found")
	ErrCodePublicDashboardAlreadyExists = errors.MustNewCode("public_dashboard_already_exists")
)

type StorablePublicDashboard struct {
	bun.BaseModel `bun:"table:public_dashboard"`

	types.Identifiable
	types.TimeAuditable
	TimeRangeEnabled bool   `bun:"time_range_enabled,type:boolean,notnull"`
	DashboardID      string `bun:"dashboard_id,type:text,notnull"`
	OrgID            string `bun:"org_id,type:text,notnull"`
}

type PublicDashboard struct {
	types.Identifiable
	types.TimeAuditable

	TimeRangeEnabled bool        `json:"timeRangeEnabled"`
	DashboardID      string      `json:"dashboardId"`
	OrgID            valuer.UUID `json:"orgId"`
}

type GettablePublicDashboard = PublicDashboard

type PostablePublicDashboard struct {
	TimeRangeEnabled bool `json:"timeRangeEnabled"`
}

type UpdatablePublicDashboard struct {
	TimeRangeEnabled bool `json:"timeRangeEnabled"`
}

func NewPublicDashboard(timeRangeEnabled bool, dashboardID string, orgID valuer.UUID) *PublicDashboard {
	return &PublicDashboard{
		Identifiable: types.Identifiable{
			ID: valuer.GenerateUUID(),
		},
		TimeAuditable: types.TimeAuditable{
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
		TimeRangeEnabled: timeRangeEnabled,
		DashboardID:      dashboardID,
		OrgID:            orgID,
	}
}

func NewStorablePublicDashboardFromPublicDashboard(publicDashboard *PublicDashboard) *StorablePublicDashboard {
	return &StorablePublicDashboard{
		Identifiable:     publicDashboard.Identifiable,
		TimeAuditable:    publicDashboard.TimeAuditable,
		TimeRangeEnabled: publicDashboard.TimeRangeEnabled,
		DashboardID:      publicDashboard.DashboardID,
		OrgID:            publicDashboard.OrgID.StringValue(),
	}
}

func NewPublicDashboardFromStorablePublicDashboard(storable *StorablePublicDashboard) *PublicDashboard {
	return &PublicDashboard{
		Identifiable:     storable.Identifiable,
		TimeAuditable:    storable.TimeAuditable,
		TimeRangeEnabled: storable.TimeRangeEnabled,
		DashboardID:      storable.DashboardID,
		OrgID:            valuer.MustNewUUID(storable.OrgID),
	}
}

func (typ *PublicDashboard) Update(timeRangeEnabled bool) {
	typ.TimeRangeEnabled = timeRangeEnabled
	typ.UpdatedAt = time.Now()
}
