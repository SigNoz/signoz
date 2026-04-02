package dashboardreporttypes

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/uptrace/bun"
)

// DashboardReportScheduleFrequency represents how often a scheduled report should run.
type DashboardReportScheduleFrequency string

const (
	DashboardReportScheduleFrequencyDaily   DashboardReportScheduleFrequency = "daily"
	DashboardReportScheduleFrequencyWeekly  DashboardReportScheduleFrequency = "weekly"
	DashboardReportScheduleFrequencyMonthly DashboardReportScheduleFrequency = "monthly"
)

// DashboardReportSchedule describes when to run a scheduled report.
//
// Note: Phase 1 only needs daily/weekly/monthly. Runner-specific fields (like cron or the exact weekday/day-of-month)
// can be added by the store/runner in later phases.
type DashboardReportSchedule struct {
	Frequency DashboardReportScheduleFrequency `json:"frequency"`

	// Timezone is used to interpret the schedule fields (e.g. for cron/weekday calculations).
	// Use an IANA timezone name (e.g. "UTC", "America/Los_Angeles").
	Timezone string `json:"timezone,omitempty"`

	// TimeOfDay is an optional "HH:MM" string used to run at a specific time.
	TimeOfDay string `json:"timeOfDay,omitempty"`

	// DayOfWeek indicates which weekday to run on for weekly schedules.
	// 0 = Sunday ... 6 = Saturday.
	DayOfWeek *int `json:"dayOfWeek,omitempty"`

	// DayOfMonth indicates which date of the month to run on for monthly schedules.
	// Valid values are 1..31.
	DayOfMonth *int `json:"dayOfMonth,omitempty"`

	// Cron is an optional cron expression that a runner can use directly.
	// If set, it should be interpreted in Timezone.
	Cron string `json:"cron,omitempty"`
}

func (s *DashboardReportSchedule) Scan(src any) error {
	if src == nil {
		*s = DashboardReportSchedule{}
		return nil
	}

	var data []byte
	switch v := src.(type) {
	case []byte:
		data = v
	case string:
		data = []byte(v)
	default:
		return errors.Newf(errors.TypeInternal, errors.CodeInternal, "tried to scan dashboard report schedule from %T instead of string or bytes", src)
	}

	return json.Unmarshal(data, s)
}

func (s DashboardReportSchedule) Value() (driver.Value, error) {
	serialized, err := json.Marshal(s)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "could not serialize dashboard report schedule to JSON")
	}
	// Store as string to ensure PostgreSQL uses TEXT and not bytea.
	return string(serialized), nil
}

// DashboardReportTimeRange stores the configured "lookback" window for a scheduled report.
//
// The window is interpreted relative to the run time:
//
//	end = now - endOffset
//	start = now - startOffset
type DashboardReportTimeRange struct {
	StartOffset valuer.TextDuration `json:"startOffset"`
	EndOffset   valuer.TextDuration `json:"endOffset,omitempty"`
}

func (tr *DashboardReportTimeRange) Scan(src any) error {
	if src == nil {
		*tr = DashboardReportTimeRange{}
		return nil
	}

	var data []byte
	switch v := src.(type) {
	case []byte:
		data = v
	case string:
		data = []byte(v)
	default:
		return errors.Newf(errors.TypeInternal, errors.CodeInternal, "tried to scan dashboard report time range from %T instead of string or bytes", src)
	}

	return json.Unmarshal(data, tr)
}

func (tr DashboardReportTimeRange) Value() (driver.Value, error) {
	serialized, err := json.Marshal(tr)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "could not serialize dashboard report time range to JSON")
	}
	// Store as string to ensure PostgreSQL uses TEXT and not bytea.
	return string(serialized), nil
}

// Window computes the (start, end) epoch-millis time window for a given run time.
func (tr DashboardReportTimeRange) Window(now time.Time) (startMs uint64, endMs uint64, err error) {
	endOffset := tr.EndOffset.Duration()
	startOffset := tr.StartOffset.Duration()
	if startOffset < endOffset {
		return 0, 0, fmt.Errorf("invalid dashboard report time range: startOffset (%s) cannot be smaller than endOffset (%s)", tr.StartOffset.String(), tr.EndOffset.String())
	}

	end := now.Add(-endOffset)
	start := now.Add(-startOffset)
	return uint64(start.UnixMilli()), uint64(end.UnixMilli()), nil
}

// DashboardReportRecipients stores the list of email recipients configured for a scheduled report.
//
// It is stored as a JSON array in the database.
type DashboardReportRecipients []string

func (r *DashboardReportRecipients) Scan(src any) error {
	if src == nil {
		*r = DashboardReportRecipients{}
		return nil
	}

	var data []byte
	switch v := src.(type) {
	case []byte:
		data = v
	case string:
		data = []byte(v)
	default:
		return errors.Newf(errors.TypeInternal, errors.CodeInternal, "tried to scan dashboard report recipients from %T instead of string or bytes", src)
	}

	return json.Unmarshal(data, r)
}

func (r DashboardReportRecipients) Value() (driver.Value, error) {
	serialized, err := json.Marshal(r)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "could not serialize dashboard report recipients to JSON")
	}
	return string(serialized), nil
}

// VariablesSnapshot stores query range variables (map-based) in a form that can be
// serialized/deserialized to/from the scheduled report TEXT column.
//
// Semantics are intentionally compatible with query_range's `variables` payload:
// map[string]qbtypes.VariableItem.
type VariablesSnapshot map[string]qbtypes.VariableItem

func (vs *VariablesSnapshot) Scan(src any) error {
	if src == nil {
		*vs = VariablesSnapshot{}
		return nil
	}

	var data []byte
	switch v := src.(type) {
	case []byte:
		data = v
	case string:
		data = []byte(v)
	default:
		return errors.Newf(errors.TypeInternal, errors.CodeInternal, "tried to scan dashboard report variables snapshot from %T instead of string or bytes", src)
	}

	if len(data) == 0 {
		*vs = VariablesSnapshot{}
		return nil
	}

	var m map[string]qbtypes.VariableItem
	if err := json.Unmarshal(data, &m); err != nil {
		return err
	}
	if m == nil {
		m = map[string]qbtypes.VariableItem{}
	}

	*vs = VariablesSnapshot(m)
	return nil
}

func (vs VariablesSnapshot) Value() (driver.Value, error) {
	if vs == nil {
		// Store empty object to satisfy NOT NULL DEFAULT '{}' and keep consistent shape.
		return "{}", nil
	}

	serialized, err := json.Marshal(vs)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "could not serialize dashboard report variables snapshot to JSON")
	}
	return string(serialized), nil
}

// StorableScheduledDashboardReport is the scheduled report record stored in the database.
//
// Table schema (Phase 1):
// scheduled_reports(id, org_id, dashboard_id, name, recipients, schedule, time_range)
type StorableScheduledDashboardReport struct {
	bun.BaseModel `bun:"table:scheduled_reports,alias:scheduled_reports"`

	types.Identifiable

	OrgID       string      `bun:"org_id,type:text,notnull" json:"orgId"`
	DashboardID valuer.UUID `bun:"dashboard_id,type:text,notnull" json:"dashboardId"`
	Name        string      `bun:"name,type:text,notnull" json:"name"`

	Recipients DashboardReportRecipients `bun:"recipients,type:text,notnull" json:"recipients"`
	Schedule   DashboardReportSchedule   `bun:"schedule,type:text,notnull" json:"schedule"`
	TimeRange  DashboardReportTimeRange  `bun:"time_range,type:text,notnull" json:"timeRange"`

	Variables VariablesSnapshot `bun:"variables,type:text,notnull" json:"variables"`
}

// PostableScheduledDashboardReport represents a request to create a scheduled report.
type PostableScheduledDashboardReport struct {
	DashboardID valuer.UUID               `json:"dashboardId" required:"true"`
	Name        string                    `json:"name" required:"true"`
	Recipients  DashboardReportRecipients `json:"recipients" required:"true"`
	Schedule    DashboardReportSchedule   `json:"schedule" required:"true"`
	TimeRange   DashboardReportTimeRange  `json:"timeRange" required:"true"`

	Variables VariablesSnapshot `json:"variables"`
}

// GettableScheduledDashboardReport represents a scheduled report record returned via the API.
type GettableScheduledDashboardReport struct {
	types.Identifiable

	OrgID       string                    `json:"orgId" required:"true"`
	DashboardID valuer.UUID               `json:"dashboardId" required:"true"`
	Name        string                    `json:"name" required:"true"`
	Recipients  DashboardReportRecipients `json:"recipients" required:"true"`
	Schedule    DashboardReportSchedule   `json:"schedule" required:"true"`
	TimeRange   DashboardReportTimeRange  `json:"timeRange" required:"true"`

	Variables VariablesSnapshot `json:"variables" required:"true"`
}
