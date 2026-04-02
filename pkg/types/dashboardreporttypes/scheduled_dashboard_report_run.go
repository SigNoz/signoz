package dashboardreporttypes

import (
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
)

// ScheduledReportRunStatus represents the lifecycle state of a scheduled dashboard report run.
type ScheduledReportRunStatus string

const (
	ScheduledReportRunStatusPending ScheduledReportRunStatus = "pending"
	ScheduledReportRunStatusRunning ScheduledReportRunStatus = "running"
	ScheduledReportRunStatusSuccess ScheduledReportRunStatus = "success"
	ScheduledReportRunStatusError   ScheduledReportRunStatus = "error"
)

// StorableScheduledReportRun is the scheduled report run record stored in the database.
//
// Table schema (Phase 2):
// scheduled_report_runs(id, scheduled_report_id, org_id, run_start_ms, run_end_ms, status, error_reason)
type StorableScheduledReportRun struct {
	bun.BaseModel `bun:"table:scheduled_report_runs,alias:scheduled_report_runs"`

	types.Identifiable

	ScheduledReportID valuer.UUID `bun:"scheduled_report_id,type:text,notnull" json:"scheduledReportId"`
	OrgID             string      `bun:"org_id,type:text,notnull" json:"orgId"`

	// Epoch millis representing the "lookback" window for the run.
	RunStartMs uint64 `bun:"run_start_ms,type:bigint,notnull" json:"runStartMs"`
	RunEndMs   uint64 `bun:"run_end_ms,type:bigint,notnull" json:"runEndMs"`

	Status ScheduledReportRunStatus `bun:"status,type:text,notnull" json:"status"`
	// ErrorReason contains a human-readable failure reason.
	ErrorReason *string `bun:"error_reason,type:text" json:"errorReason,omitempty"`
}

// GettableScheduledReportRun represents a scheduled report run record returned via the API.
type GettableScheduledReportRun struct {
	types.Identifiable

	ScheduledReportID valuer.UUID              `json:"scheduledReportId"`
	OrgID             string                   `json:"orgId"`
	RunStartMs        uint64                   `json:"runStartMs"`
	RunEndMs          uint64                   `json:"runEndMs"`
	Status            ScheduledReportRunStatus `json:"status"`
	ErrorReason       *string                  `json:"errorReason,omitempty"`
}
