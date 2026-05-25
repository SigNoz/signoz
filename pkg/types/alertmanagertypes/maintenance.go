package alertmanagertypes

import (
	"context"
	"encoding/json"
	"time"

	"github.com/expr-lang/expr"
	"github.com/prometheus/common/model"
	"github.com/uptrace/bun"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
)

var ErrCodeInvalidPlannedMaintenancePayload = errors.MustNewCode("invalid_planned_maintenance_payload")

const scopeDocUrl = "https://signoz.io/docs/alerts-management/planned-maintenance/#scoping-with-label-expressions"

type MaintenanceStatus struct {
	valuer.String
}

var (
	MaintenanceStatusActive   = MaintenanceStatus{valuer.NewString("active")}
	MaintenanceStatusUpcoming = MaintenanceStatus{valuer.NewString("upcoming")}
	MaintenanceStatusExpired  = MaintenanceStatus{valuer.NewString("expired")}
)

// Enum implements jsonschema.Enum; returns the acceptable values for MaintenanceStatus.
func (MaintenanceStatus) Enum() []any {
	return []any{
		MaintenanceStatusActive,
		MaintenanceStatusUpcoming,
		MaintenanceStatusExpired,
	}
}

type MaintenanceKind struct {
	valuer.String
}

var (
	MaintenanceKindFixed     = MaintenanceKind{valuer.NewString("fixed")}
	MaintenanceKindRecurring = MaintenanceKind{valuer.NewString("recurring")}
)

// Enum implements jsonschema.Enum; returns the acceptable values for MaintenanceKind.
func (MaintenanceKind) Enum() []any {
	return []any{
		MaintenanceKindFixed,
		MaintenanceKindRecurring,
	}
}

type StorablePlannedMaintenance struct {
	bun.BaseModel `bun:"table:planned_maintenance"`
	types.Identifiable
	types.TimeAuditable
	types.UserAuditable
	Name        string    `bun:"name,type:text,notnull"`
	Description string    `bun:"description,type:text"`
	Schedule    *Schedule `bun:"schedule,type:text,notnull"`
	OrgID       string    `bun:"org_id,type:text"`
	Scope       string    `bun:"scope,type:text"`
}

type PlannedMaintenance struct {
	ID          valuer.UUID       `json:"id" required:"true"`
	Name        string            `json:"name" required:"true"`
	Description string            `json:"description"`
	Schedule    *Schedule         `json:"schedule" required:"true"`
	RuleIDs     []string          `json:"alertIds"`
	Scope       string            `json:"scope,omitempty"`
	CreatedAt   time.Time         `json:"createdAt"`
	CreatedBy   string            `json:"createdBy"`
	UpdatedAt   time.Time         `json:"updatedAt"`
	UpdatedBy   string            `json:"updatedBy"`
	Status      MaintenanceStatus `json:"status" required:"true"`
	Kind        MaintenanceKind   `json:"kind" required:"true"`
}

// PostablePlannedMaintenance is the input payload for creating or updating a
// planned maintenance. Server-owned fields (id, timestamps, audit users,
// derived status / kind) are deliberately not accepted from the client.
type PostablePlannedMaintenance struct {
	Name        string    `json:"name" required:"true"`
	Description string    `json:"description"`
	Schedule    *Schedule `json:"schedule" required:"true"`
	AlertIds    []string  `json:"alertIds"`
	Scope       string    `json:"scope"`
}

func (p *PostablePlannedMaintenance) Validate() error {
	if p.Name == "" {
		return errors.Newf(errors.TypeInvalidInput, ErrCodeInvalidPlannedMaintenancePayload, "missing name in the payload")
	}
	if p.Schedule == nil {
		return errors.Newf(errors.TypeInvalidInput, ErrCodeInvalidPlannedMaintenancePayload, "missing schedule in the payload")
	}
	if p.Schedule.Timezone == "" {
		return errors.Newf(errors.TypeInvalidInput, ErrCodeInvalidPlannedMaintenancePayload, "missing timezone in the payload")
	}

	if _, err := time.LoadLocation(p.Schedule.Timezone); err != nil {
		return errors.Newf(errors.TypeInvalidInput, ErrCodeInvalidPlannedMaintenancePayload, "invalid timezone in the payload")
	}

	if !p.Schedule.StartTime.IsZero() && !p.Schedule.EndTime.IsZero() {
		if p.Schedule.StartTime.After(p.Schedule.EndTime) {
			return errors.Newf(errors.TypeInvalidInput, ErrCodeInvalidPlannedMaintenancePayload, "start time cannot be after end time")
		}
	}

	if p.Schedule.Recurrence != nil {
		if p.Schedule.Recurrence.RepeatType.IsZero() {
			return errors.Newf(errors.TypeInvalidInput, ErrCodeInvalidPlannedMaintenancePayload, "missing repeat type in the payload")
		}
		if p.Schedule.Recurrence.Duration.IsZero() {
			return errors.Newf(errors.TypeInvalidInput, ErrCodeInvalidPlannedMaintenancePayload, "missing duration in the payload")
		}
		if p.Schedule.Recurrence.EndTime != nil && p.Schedule.Recurrence.EndTime.Before(p.Schedule.Recurrence.StartTime) {
			return errors.Newf(errors.TypeInvalidInput, ErrCodeInvalidPlannedMaintenancePayload, "end time cannot be before start time")
		}
	}
	if p.Scope != "" {
		if _, err := expr.Compile(p.Scope, expr.AllowUndefinedVariables(), expr.AsBool()); err != nil {
			err := errors.Newf(
				errors.TypeInvalidInput, ErrCodeInvalidPlannedMaintenancePayload,
				"invalid scope: %s", err.Error(),
			)
			return err.WithUrl(scopeDocUrl)
		}
	}
	return nil
}

type StorablePlannedMaintenanceRule struct {
	bun.BaseModel `bun:"table:planned_maintenance_rule"`
	types.Identifiable
	PlannedMaintenanceID valuer.UUID `bun:"planned_maintenance_id,type:text"`
	RuleID               valuer.UUID `bun:"rule_id,type:text"`
}

type PlannedMaintenanceWithRules struct {
	*StorablePlannedMaintenance `bun:",extend"`
	Rules                       []*StorablePlannedMaintenanceRule `bun:"rel:has-many,join:id=planned_maintenance_id"`
}

// HasScheduleRecurrenceBoundsMismatch reports whether a recurring maintenance
// has different start/end bounds in Schedule and Schedule.Recurrence.
//
// This is used to detect if there are any entries with recurrence that don't
// have the same timestamps stored at the schedule-level.
// UI payloads duplicated those values in both places, but direct API users may
// have stored bounds that are missing from, or different than, the schedule-level bounds.
// We need to observe these before we can safely drop Recurrence.StartTime and
// Recurrence.EndTime.
func (m *PlannedMaintenance) HasScheduleRecurrenceBoundsMismatch() bool {
	recurrence := m.Schedule.Recurrence
	if recurrence == nil {
		return false
	}

	return !recurrence.StartTime.Equal(m.Schedule.StartTime) ||
		(recurrence.EndTime == nil && !m.Schedule.EndTime.IsZero()) ||
		(recurrence.EndTime != nil && !recurrence.EndTime.Equal(m.Schedule.EndTime))
}

func (m *PlannedMaintenance) ShouldSkip(ruleID string, now time.Time, lset model.LabelSet) (bool, error) {
	// Check if the alert ID is in the maintenance window
	found := false
	if len(m.RuleIDs) > 0 {
		for _, alertID := range m.RuleIDs {
			if alertID == ruleID {
				found = true
				break
			}
		}
	}
	// If no alert ids, then skip all alerts
	if len(m.RuleIDs) == 0 {
		found = true
	}

	if !found {
		return false, nil
	}

	if !m.IsActive(now) {
		return false, nil
	}

	if m.Scope != "" {
		result, err := EvalScopeExpression(m.Scope, lset)
		if err != nil {
			return false, err
		}
		if !result {
			return false, nil
		}
	}
	return true, nil
}

// IsActive reports whether [now] falls inside the maintenance window's schedule.
func (m *PlannedMaintenance) IsActive(now time.Time) bool {
	// If alert is found, we check if it should be skipped based on the schedule
	loc, err := time.LoadLocation(m.Schedule.Timezone)
	if err != nil {
		return false
	}

	startTime := m.Schedule.StartTime
	endTime := m.Schedule.EndTime
	recurrence := m.Schedule.Recurrence

	// fixed schedule — only when no recurrence is configured.
	// When recurrence is set, the recurring check below handles everything;
	// falling through here would cause the window to match the absolute
	// StartTime–EndTime range instead of the daily/weekly/monthly pattern.
	if recurrence == nil && !startTime.IsZero() && !endTime.IsZero() {
		if now.Equal(startTime) || now.Equal(endTime) ||
			(now.After(startTime) && now.Before(endTime)) {
			return true
		}
	}

	// recurring schedule
	if recurrence != nil {
		// Make sure the recurrence has started
		if now.Before(recurrence.StartTime) {
			return false
		}

		// Check if recurrence has expired
		if recurrence.EndTime != nil {
			if !recurrence.EndTime.IsZero() && now.After(*recurrence.EndTime) {
				return false
			}
		}

		currentTime := now.In(loc)
		switch recurrence.RepeatType {
		case RepeatTypeDaily:
			return m.checkDaily(currentTime, recurrence, loc)
		case RepeatTypeWeekly:
			return m.checkWeekly(currentTime, recurrence, loc)
		case RepeatTypeMonthly:
			return m.checkMonthly(currentTime, recurrence, loc)
		}
	}

	return false
}

// checkDaily rebases the recurrence start to today (or yesterday if needed)
// and returns true if currentTime is within [candidate, candidate+Duration].
func (m *PlannedMaintenance) checkDaily(currentTime time.Time, rec *Recurrence, loc *time.Location) bool {
	candidate := time.Date(
		currentTime.Year(), currentTime.Month(), currentTime.Day(),
		rec.StartTime.Hour(), rec.StartTime.Minute(), 0, 0,
		loc,
	)
	if candidate.After(currentTime) {
		candidate = candidate.AddDate(0, 0, -1)
	}
	return currentTime.Sub(candidate) <= rec.Duration.Duration()
}

// checkWeekly finds the most recent allowed occurrence by rebasing the recurrence’s
// time-of-day onto the allowed weekday. It does this for each allowed day and returns true
// if the current time falls within the candidate window.
func (m *PlannedMaintenance) checkWeekly(currentTime time.Time, rec *Recurrence, loc *time.Location) bool {
	// If no days specified, treat as every day (like daily).
	if len(rec.RepeatOn) == 0 {
		return m.checkDaily(currentTime, rec, loc)
	}

	for _, day := range rec.RepeatOn {
		allowedDay, ok := RepeatOnAllMap[day]
		if !ok {
			continue // skip invalid days
		}
		// Compute the day difference: allowedDay - current weekday.
		delta := int(allowedDay) - int(currentTime.Weekday())
		// Build a candidate occurrence by rebasing today's date to the allowed weekday.
		candidate := time.Date(
			currentTime.Year(), currentTime.Month(), currentTime.Day(),
			rec.StartTime.Hour(), rec.StartTime.Minute(), 0, 0,
			loc,
		).AddDate(0, 0, delta)
		// If the candidate is in the future, subtract 7 days.
		if candidate.After(currentTime) {
			candidate = candidate.AddDate(0, 0, -7)
		}
		if currentTime.Sub(candidate) <= rec.Duration.Duration() {
			return true
		}
	}
	return false
}

// checkMonthly rebases the candidate occurrence using the recurrence's day-of-month.
// If the candidate for the current month is in the future, it uses the previous month.
func (m *PlannedMaintenance) checkMonthly(currentTime time.Time, rec *Recurrence, loc *time.Location) bool {
	refDay := rec.StartTime.Day()
	year, month, _ := currentTime.Date()
	lastDay := time.Date(year, month+1, 0, 0, 0, 0, 0, loc).Day()
	day := refDay
	if refDay > lastDay {
		day = lastDay
	}
	candidate := time.Date(year, month, day,
		rec.StartTime.Hour(), rec.StartTime.Minute(), rec.StartTime.Second(), rec.StartTime.Nanosecond(),
		loc,
	)
	if candidate.After(currentTime) {
		// Use previous month.
		candidate = candidate.AddDate(0, -1, 0)
		y, m, _ := candidate.Date()
		lastDayPrev := time.Date(y, m+1, 0, 0, 0, 0, 0, loc).Day()
		if refDay > lastDayPrev {
			candidate = time.Date(y, m, lastDayPrev,
				rec.StartTime.Hour(), rec.StartTime.Minute(), rec.StartTime.Second(), rec.StartTime.Nanosecond(),
				loc,
			)
		} else {
			candidate = time.Date(y, m, refDay,
				rec.StartTime.Hour(), rec.StartTime.Minute(), rec.StartTime.Second(), rec.StartTime.Nanosecond(),
				loc,
			)
		}
	}
	return currentTime.Sub(candidate) <= rec.Duration.Duration()
}

func (m *PlannedMaintenance) IsUpcoming() bool {
	loc, err := time.LoadLocation(m.Schedule.Timezone)
	if err != nil {
		return false
	}
	now := time.Now().In(loc)

	if !m.Schedule.StartTime.IsZero() && !m.Schedule.EndTime.IsZero() {
		return now.Before(m.Schedule.StartTime)
	}
	if m.Schedule.Recurrence != nil {
		return now.Before(m.Schedule.Recurrence.StartTime)
	}
	return false
}

func (m *PlannedMaintenance) IsRecurring() bool {
	return m.Schedule.Recurrence != nil
}

func (m *PlannedMaintenance) Validate() error {
	if m.Name == "" {
		return errors.Newf(errors.TypeInvalidInput, ErrCodeInvalidPlannedMaintenancePayload, "missing name in the payload")
	}
	if m.Schedule == nil {
		return errors.Newf(errors.TypeInvalidInput, ErrCodeInvalidPlannedMaintenancePayload, "missing schedule in the payload")
	}
	if m.Schedule.Timezone == "" {
		return errors.Newf(errors.TypeInvalidInput, ErrCodeInvalidPlannedMaintenancePayload, "missing timezone in the payload")
	}

	_, err := time.LoadLocation(m.Schedule.Timezone)
	if err != nil {
		return errors.Newf(errors.TypeInvalidInput, ErrCodeInvalidPlannedMaintenancePayload, "invalid timezone in the payload")
	}

	if !m.Schedule.StartTime.IsZero() && !m.Schedule.EndTime.IsZero() {
		if m.Schedule.StartTime.After(m.Schedule.EndTime) {
			return errors.Newf(errors.TypeInvalidInput, ErrCodeInvalidPlannedMaintenancePayload, "start time cannot be after end time")
		}
	}

	if m.Schedule.Recurrence != nil {
		if m.Schedule.Recurrence.RepeatType.IsZero() {
			return errors.Newf(errors.TypeInvalidInput, ErrCodeInvalidPlannedMaintenancePayload, "missing repeat type in the payload")
		}
		if m.Schedule.Recurrence.Duration.IsZero() {
			return errors.Newf(errors.TypeInvalidInput, ErrCodeInvalidPlannedMaintenancePayload, "missing duration in the payload")
		}
		if m.Schedule.Recurrence.EndTime != nil && m.Schedule.Recurrence.EndTime.Before(m.Schedule.Recurrence.StartTime) {
			return errors.Newf(errors.TypeInvalidInput, ErrCodeInvalidPlannedMaintenancePayload, "end time cannot be before start time")
		}
	}
	return nil
}

func (m PlannedMaintenance) MarshalJSON() ([]byte, error) {
	now := time.Now().In(time.FixedZone(m.Schedule.Timezone, 0))
	var status MaintenanceStatus
	if m.IsActive(now) {
		status = MaintenanceStatusActive
	} else if m.IsUpcoming() {
		status = MaintenanceStatusUpcoming
	} else {
		status = MaintenanceStatusExpired
	}
	var kind MaintenanceKind

	if !m.Schedule.StartTime.IsZero() && !m.Schedule.EndTime.IsZero() && m.Schedule.EndTime.After(m.Schedule.StartTime) {
		kind = MaintenanceKindFixed
	} else {
		kind = MaintenanceKindRecurring
	}

	return json.Marshal(struct {
		ID          valuer.UUID       `json:"id" db:"id"`
		Name        string            `json:"name" db:"name"`
		Description string            `json:"description" db:"description"`
		Schedule    *Schedule         `json:"schedule" db:"schedule"`
		AlertIds    []string          `json:"alertIds" db:"alert_ids"`
		Scope       string            `json:"scope,omitempty" db:"scope"`
		CreatedAt   time.Time         `json:"createdAt" db:"created_at"`
		CreatedBy   string            `json:"createdBy" db:"created_by"`
		UpdatedAt   time.Time         `json:"updatedAt" db:"updated_at"`
		UpdatedBy   string            `json:"updatedBy" db:"updated_by"`
		Status      MaintenanceStatus `json:"status"`
		Kind        MaintenanceKind   `json:"kind"`
	}{
		ID:          m.ID,
		Name:        m.Name,
		Description: m.Description,
		Schedule:    m.Schedule,
		AlertIds:    m.RuleIDs,
		Scope:       m.Scope,
		CreatedAt:   m.CreatedAt,
		CreatedBy:   m.CreatedBy,
		UpdatedAt:   m.UpdatedAt,
		UpdatedBy:   m.UpdatedBy,
		Status:      status,
		Kind:        kind,
	})
}

func (m *PlannedMaintenanceWithRules) ToPlannedMaintenance() *PlannedMaintenance {
	ruleIDs := []string{}
	if m.Rules != nil {
		for _, storableMaintenanceRule := range m.Rules {
			ruleIDs = append(ruleIDs, storableMaintenanceRule.RuleID.StringValue())
		}
	}

	return &PlannedMaintenance{
		ID:          m.ID,
		Name:        m.Name,
		Description: m.Description,
		Schedule:    m.Schedule,
		RuleIDs:     ruleIDs,
		Scope:       m.Scope,
		CreatedAt:   m.CreatedAt,
		UpdatedAt:   m.UpdatedAt,
		CreatedBy:   m.CreatedBy,
		UpdatedBy:   m.UpdatedBy,
	}
}

type ListPlannedMaintenanceParams struct {
	Active    *bool `query:"active"`
	Recurring *bool `query:"recurring"`
}

type MaintenanceStore interface {
	CreatePlannedMaintenance(context.Context, *PostablePlannedMaintenance) (*PlannedMaintenance, error)
	DeletePlannedMaintenance(context.Context, valuer.UUID) error
	GetPlannedMaintenanceByID(context.Context, valuer.UUID) (*PlannedMaintenance, error)
	UpdatePlannedMaintenance(context.Context, *PostablePlannedMaintenance, valuer.UUID) error
	ListPlannedMaintenance(context.Context, string) ([]*PlannedMaintenance, error)
}
