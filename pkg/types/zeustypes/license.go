package zeustypes

import (
	"encoding/json"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/licensetypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type GettableLicensePlan struct {
	ID          valuer.UUID `json:"id"`
	Name        string      `json:"name" required:"true"`
	Description string      `json:"description"`
	IsActive    bool        `json:"is_active"`
	CreatedAt   time.Time   `json:"created_at"`
	UpdatedAt   time.Time   `json:"updated_at"`
}

type GettableLicenseEventQueue struct {
	Event       string    `json:"event"`
	Status      string    `json:"status"`
	ScheduledAt time.Time `json:"scheduled_at"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type GettableLicense struct {
	ID         valuer.UUID               `json:"id" required:"true"`
	Key        string                    `json:"key" required:"true"`
	ValidFrom  int64                     `json:"valid_from"`
	ValidUntil int64                     `json:"valid_until"`
	Status     string                    `json:"status" required:"true"`
	State      string                    `json:"state"`
	Platform   string                    `json:"platform"`
	FreeUntil  time.Time                 `json:"free_until"`
	CreatedAt  time.Time                 `json:"created_at"`
	UpdatedAt  time.Time                 `json:"updated_at"`
	PlanID     valuer.UUID               `json:"plan_id"`
	Plan       GettableLicensePlan       `json:"plan" required:"true"`
	Features   []*licensetypes.Feature   `json:"features"`
	EventQueue GettableLicenseEventQueue `json:"event_queue"`
}

func NewGettableLicense(license *licensetypes.License) (*GettableLicense, error) {
	data, err := json.Marshal(license.Data)
	if err != nil {
		return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "failed to marshal license data")
	}

	gettableLicense := new(GettableLicense)
	if err := json.Unmarshal(data, gettableLicense); err != nil {
		return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "failed to unmarshal license data")
	}

	gettableLicense.ID = license.ID
	gettableLicense.Key = license.Key

	return gettableLicense, nil
}
