package dashboardtypes

import (
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
)

const MaxPinnedDashboardsPerUser = 10

var ErrCodePinnedDashboardLimitHit = errors.MustNewCode("pinned_dashboard_limit_hit")

type PinnedDashboard struct {
	bun.BaseModel `bun:"table:pinned_dashboard,alias:pinned_dashboard"`

	UserID      valuer.UUID `bun:"user_id,pk,type:text"`
	DashboardID valuer.UUID `bun:"dashboard_id,pk,type:text"`
	OrgID       valuer.UUID `bun:"org_id,type:text,notnull"`
	PinnedAt    time.Time   `bun:"pinned_at,notnull,default:current_timestamp"`
}
