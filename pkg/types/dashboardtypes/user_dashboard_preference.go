package dashboardtypes

import (
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
)

const MaxPinnedDashboardsPerUser = 10

var ErrCodePinnedDashboardLimitHit = errors.MustNewCode("pinned_dashboard_limit_hit")

// Only the pin is tracked for now; more preferences can be added later.
type UserDashboardPreference struct {
	bun.BaseModel `bun:"table:user_dashboard_preference,alias:user_dashboard_preference"`

	types.Identifiable
	types.TimeAuditable
	UserID      valuer.UUID `bun:"user_id,type:text"`
	DashboardID valuer.UUID `bun:"dashboard_id,type:text"`
	IsPinned    bool        `bun:"is_pinned,notnull,default:false"`
}

func NewUserDashboardPreference(userID, dashboardID valuer.UUID) *UserDashboardPreference {
	now := time.Now()
	return &UserDashboardPreference{
		Identifiable:  types.Identifiable{ID: valuer.GenerateUUID()},
		TimeAuditable: types.TimeAuditable{CreatedAt: now, UpdatedAt: now},
		UserID:        userID,
		DashboardID:   dashboardID,
		IsPinned:      true,
	}
}
