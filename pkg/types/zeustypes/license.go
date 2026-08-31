package zeustypes

import (
	"time"

	"github.com/SigNoz/signoz/pkg/valuer"
)

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
