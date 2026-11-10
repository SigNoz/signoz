package dashboardtypes

import (
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
)

var (
	ErrCodeDashboardInvalidInput       = errors.MustNewCode("dashboard_invalid_input")
	ErrCodeDashboardNotFound           = errors.MustNewCode("dashboard_not_found")
	ErrCodeDashboardInvalidData        = errors.MustNewCode("dashboard_invalid_data")
	ErrCodeDashboardInvalidWidgetQuery = errors.MustNewCode("dashboard_invalid_widget_query")
	ErrCodeDashboardInvalidSource      = errors.MustNewCode("dashboard_invalid_source")
	ErrCodeDashboardImmutable          = errors.MustNewCode("dashboard_immutable")
	ErrCodeDashboardInvalidPatch       = errors.MustNewCode("dashboard_invalid_patch")
	ErrCodeDashboardMigrationFailed    = errors.MustNewCode("dashboard_migration_failed")
)

type StorableDashboard struct {
	bun.BaseModel `bun:"table:dashboard,alias:dashboard"`

	types.Identifiable
	types.TimeAuditable
	types.UserAuditable
	Data   StorableDashboardData `bun:"data,type:text,notnull"`
	Locked bool                  `bun:"locked,notnull,default:false"`
	OrgID  valuer.UUID           `bun:"org_id,notnull"`
	Source Source                `bun:"source,type:text,notnull"`
	Name   string                `bun:"name,type:text,notnull"`
}

type (
	StorableDashboardData map[string]any
)

// readString reads a string field from the untyped data blob, yielding "" when
// the key is absent, null, or not a string.
func (d StorableDashboardData) readString(key string) string {
	s, _ := d[key].(string)
	return s
}

// ErrIfNotDeletable gates deletion on the columns alone, never on Data, so a
// dashboard whose data is corrupt or stuck on the v1 schema stays deletable.
func (storable StorableDashboard) ErrIfNotDeletable() error {
	if storable.Locked {
		return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "cannot delete a locked dashboard, please unlock the dashboard to delete")
	}
	if !storable.Source.isUserDeletable() {
		return errors.Newf(errors.TypeInvalidInput, ErrCodeDashboardImmutable, "%s dashboards cannot be deleted", storable.Source)
	}
	return nil
}
