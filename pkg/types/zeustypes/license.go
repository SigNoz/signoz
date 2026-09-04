package zeustypes

import (
	"time"

	"github.com/SigNoz/signoz/pkg/valuer"
)

type LicenseFeature struct {
	Name       string `json:"name"`
	Active     bool   `json:"active"`
	Usage      int64  `json:"usage"`
	UsageLimit int64  `json:"usage_limit"`
	Route      string `json:"route"`
}

type LicensePlan struct {
	ID          valuer.UUID `json:"id"`
	Name        string      `json:"name"`
	Description string      `json:"description"`
	IsActive    bool        `json:"is_active"`
	CreatedAt   time.Time   `json:"created_at"`
	UpdatedAt   time.Time   `json:"updated_at"`
}

type LicenseEventQueue struct {
	Event       string    `json:"event"`
	Status      string    `json:"status"`
	ScheduledAt time.Time `json:"scheduled_at"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type License struct {
	ID         valuer.UUID       `json:"id"`
	Key        string            `json:"key"`
	ValidFrom  int64             `json:"valid_from"`
	ValidUntil int64             `json:"valid_until"`
	Status     string            `json:"status"`
	State      string            `json:"state"`
	Platform   string            `json:"platform"`
	FreeUntil  time.Time         `json:"free_until"`
	CreatedAt  time.Time         `json:"created_at"`
	UpdatedAt  time.Time         `json:"updated_at"`
	PlanID     valuer.UUID       `json:"plan_id"`
	Plan       LicensePlan       `json:"plan"`
	Features   []LicenseFeature  `json:"features"`
	EventQueue LicenseEventQueue `json:"event_queue"`
}
