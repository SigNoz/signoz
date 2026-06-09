package dashboardtypes

import (
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
)

const MaxPinnedDashboardsPerUser = 10

var ErrCodePinnedDashboardLimitHit = errors.MustNewCode("pinned_dashboard_limit_hit")

// Only the pin is tracked for now; more preferences can be added later.
type UserDashboardPreference struct {
	bun.BaseModel `bun:"table:user_dashboard_preference,alias:user_dashboard_preference"`

	UserID      valuer.UUID `bun:"user_id,pk,type:text"`
	DashboardID valuer.UUID `bun:"dashboard_id,pk,type:text"`
	IsPinned    bool        `bun:"is_pinned,notnull,default:false"`
}

func NewUserDashboardPreference(userID, dashboardID valuer.UUID) *UserDashboardPreference {
	return &UserDashboardPreference{
		UserID:      userID,
		DashboardID: dashboardID,
		IsPinned:    true,
	}
}
