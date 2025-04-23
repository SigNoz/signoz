package quickfiltertypes

import (
	"fmt"
	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/uptrace/bun"
	"strings"
	"time"
)

const (
	SignalTraces  = "TRACES"
	SignalLogs    = "LOGS"
	SignalMetrics = "METRICS"
	SignalInfra   = "INFRA"
)

var validSignals = map[string]bool{
	SignalTraces:  true,
	SignalLogs:    true,
	SignalMetrics: true,
	SignalInfra:   true,
}

func IsValidSignal(signal string) bool {
	return validSignals[strings.ToUpper(signal)]
}

type StorableOrgFilter struct {
	bun.BaseModel `bun:"table:org_filters"`
	types.Identifiable
	OrgID     string    `bun:"org_id,type:text,notnull"`
	Filter    string    `bun:"filter,type:text,notnull"`
	Signal    string    `bun:"signal,type:text,notnull"`
	CreatedAt time.Time `bun:"created_at,notnull"`
	UpdatedAt time.Time `bun:"updated_at,notnull"`
}

type SignalFilters struct {
	Signal  string            `json:"signal"`
	Filters []v3.AttributeKey `json:"filters"`
}

type UpdateableQuickFilters struct {
	Signal  string            `json:"signal"`
	Filters []v3.AttributeKey `json:"filters"`
}

// Validate checks if the quick filter update request is valid
func (u *UpdateableQuickFilters) Validate() error {
	// Validate signal
	if !IsValidSignal(u.Signal) {
		return fmt.Errorf("invalid signal: %s", u.Signal)
	}

	// Validate each filter
	for _, filter := range u.Filters {
		if err := filter.Validate(); err != nil {
			return fmt.Errorf("invalid filter: %v", err)
		}
	}

	return nil
}
