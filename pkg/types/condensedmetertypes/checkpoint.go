package condensedmetertypes

import (
	"context"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
)

var (
	ErrCodeCheckpointNotFound = errors.MustNewCode("condensed_meter_checkpoint_not_found")
)

// Checkpoint is the last hour whose condensed rows were sent for an org.
type Checkpoint struct {
	bun.BaseModel `bun:"table:condensed_meter_checkpoint"`

	OrgID            valuer.UUID `bun:"org_id,pk,type:text"`
	LastReportedHour time.Time   `bun:"last_reported_hour"`
	UpdatedAt        time.Time   `bun:"updated_at"`
}

type Store interface {
	Get(ctx context.Context, orgID valuer.UUID) (*Checkpoint, error)
	Upsert(ctx context.Context, checkpoint *Checkpoint) error
}

func NewCheckpoint(orgID valuer.UUID, hour time.Time) *Checkpoint {
	return &Checkpoint{
		OrgID:            orgID,
		LastReportedHour: hour,
		UpdatedAt:        time.Now(),
	}
}
