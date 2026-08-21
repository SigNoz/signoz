package systemdashboardtypes

import (
	"context"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
)

var (
	ErrCodeSystemDashboardNotFound           = errors.MustNewCode("system_dashboard_not_found")
	ErrCodeSystemDashboardDefinitionInvalid  = errors.MustNewCode("system_dashboard_definition_invalid")
	ErrCodeSystemDashboardAlreadyProvisioned = errors.MustNewCode("system_dashboard_already_provisioned")
)

// ProvisionerIdentity is stamped into created_by/updated_by by the reconciler. It
// is deliberately not a valid email, so it can never collide with a real account:
// any other value in updated_by means a foreign write.
const ProvisionerIdentity = "signoz"

type Store interface {
	Create(ctx context.Context, storable *StorableSystemDashboard) error

	Get(ctx context.Context, orgID valuer.UUID, name string) (*StorableSystemDashboard, error)

	UpdateVersion(ctx context.Context, orgID valuer.UUID, name string, version int) error

	RunInTx(ctx context.Context, cb func(ctx context.Context) error) error
}

// StorableSystemDashboard records the shipped version each org's copy of a system
// dashboard was last provisioned at. That version is the only thing the dashboard
// row cannot answer, since the binary only embeds the latest definition.
type StorableSystemDashboard struct {
	bun.BaseModel `bun:"table:system_dashboard"`

	types.Identifiable
	types.TimeAuditable
	OrgID       valuer.UUID `bun:"org_id,type:text,notnull"`
	DashboardID valuer.UUID `bun:"dashboard_id,type:text,notnull"`
	Name        string      `bun:"name,type:text,notnull"`
	Version     int         `bun:"version,notnull"`
}

func NewStorableSystemDashboard(orgID valuer.UUID, dashboardID valuer.UUID, name string, version int) *StorableSystemDashboard {
	now := time.Now()
	return &StorableSystemDashboard{
		Identifiable:  types.Identifiable{ID: valuer.GenerateUUID()},
		TimeAuditable: types.TimeAuditable{CreatedAt: now, UpdatedAt: now},
		OrgID:         orgID,
		DashboardID:   dashboardID,
		Name:          name,
		Version:       version,
	}
}
