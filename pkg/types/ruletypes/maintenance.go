package ruletypes

import (
	"context"
	"encoding/json"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
)

var (
	ErrCodeInvalidPlannedMaintenancePayload = errors.MustNewCode("invalid_planned_maintenance_payload")
)

type StorablePlannedMaintenance struct {
	bun.BaseModel `bun:"table:planned_maintenance"`
	types.Identifiable
	types.TimeAuditable
	types.UserAuditable
	Name        string    `bun:"name,type:text,notnull"`
	Description string    `bun:"description,type:text"`
	Schedule    *Schedule `bun:"schedule,type:text,notnull"`
	OrgID       string    `bun:"org_id,type:text"`
}

type GettablePlannedMaintenance struct {
	Id          string    `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Schedule    *Schedule `json:"schedule"`
	RuleIDs     []string  `json:"alertIds"`
	CreatedAt   time.Time `json:"createdAt"`
	CreatedBy   string    `json:"createdBy"`
	UpdatedAt   time.Time `json:"updatedAt"`
	UpdatedBy   string    `json:"updatedBy"`
	Status      string    `json:"status"`
	Kind        string    `json:"kind"`
}

type StorablePlannedMaintenanceRule struct {
	bun.BaseModel `bun:"table:planned_maintenance_rule"`
	types.Identifiable
	PlannedMaintenanceID valuer.UUID `bun:"planned_maintenance_id,type:text"`
	RuleID               valuer.UUID `bun:"rule_id,type:text"`
}

type GettablePlannedMaintenanceRule struct {
	*StorablePlannedMaintenance `bun:",extend"`
	Rules                       []*StorablePlannedMaintenanceRule `bun:"rel:has-many,join:id=planned_maintenance_id"`
}

func (m *GettablePlannedMaintenance) ShouldSkip(ruleID string, now time.Time) bool {
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
		return false
	}

	// If alert is found, we check if it should be skipped based on the schedule
	loc, err := time.LoadLocation(m.Schedule.Timezone)
	if err != nil {
		return false
	}

	currentTime := now.In(loc)

	// fixed schedule
	if !m.Schedule.StartTime.IsZero() && !m.Schedule.EndTime.IsZero() {
		startTime := m.Schedule.StartTime.In(loc)
		endTime := m.Schedule.EndTime.In(loc)
		if currentTime.Equal(startTime) || currentTime.Equal(endTime) ||
			(currentTime.After(startTime) && currentTime.Before(endTime)) {
			return true
		}
	}

	// recurring schedule
	if m.Schedule.Recurrence != nil {
		start := m.Schedule.Recurrence.StartTime

		// Make sure the recurrence has started
		if currentTime.Before(start.In(loc)) {
			return false
		}

		// Check if recurrence has expired
		if m.Schedule.Recurrence.EndTime != nil {
			endTime := *m.Schedule.Recurrence.EndTime
			if !endTime.IsZero() && currentTime.After(endTime.In(loc)) {
				return false
			}
		}

		switch m.Schedule.Recurrence.RepeatType {
		case RepeatTypeDaily:
			return m.checkDaily(currentTime, m.Schedule.Recurrence, loc)
		case RepeatTypeWeekly:
			return m.checkWeekly(currentTime, m.Schedule.Recurrence, loc)
		case RepeatTypeMonthly:
			return m.checkMonthly(currentTime, m.Schedule.Recurrence, loc)
		}
	}

	return false
}

// checkDaily rebases the recurrence start to today (or yesterday if needed)
// and returns true if currentTime is within [candidate, candidate+Duration].
func (m *GettablePlannedMaintenance) checkDaily(currentTime time.Time, rec *Recurrence, loc *time.Location) bool {
	candidate := time.Date(
		currentTime.Year(), currentTime.Month(), currentTime.Day(),
		rec.StartTime.Hour(), rec.StartTime.Minute(), 0, 0,
		loc,
	)
	if candidate.After(currentTime) {
		candidate = candidate.AddDate(0, 0, -1)
	}
	return currentTime.Sub(candidate) <= time.Duration(rec.Duration)
}

// checkWeekly finds the most recent allowed occurrence by rebasing the recurrence’s
// time-of-day onto the allowed weekday. It does this for each allowed day and returns true
// if the current time falls within the candidate window.
func (m *GettablePlannedMaintenance) checkWeekly(currentTime time.Time, rec *Recurrence, loc *time.Location) bool {
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
		if currentTime.Sub(candidate) <= time.Duration(rec.Duration) {
			return true
		}
	}
	return false
}

// checkMonthly rebases the candidate occurrence using the recurrence's day-of-month.
// If the candidate for the current month is in the future, it uses the previous month.
func (m *GettablePlannedMaintenance) checkMonthly(currentTime time.Time, rec *Recurrence, loc *time.Location) bool {
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
	return currentTime.Sub(candidate) <= time.Duration(rec.Duration)
}

func (m *GettablePlannedMaintenance) IsActive(now time.Time) bool {
	ruleID := "maintenance"
	if len(m.RuleIDs) > 0 {
		ruleID = (m.RuleIDs)[0]
	}
	return m.ShouldSkip(ruleID, now)
}

func (m *GettablePlannedMaintenance) IsUpcoming() bool {
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

func (m *GettablePlannedMaintenance) IsRecurring() bool {
	return m.Schedule.Recurrence != nil
}

func (m *GettablePlannedMaintenance) Validate() error {
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
		if m.Schedule.Recurrence.RepeatType == "" {
			return errors.Newf(errors.TypeInvalidInput, ErrCodeInvalidPlannedMaintenancePayload, "missing repeat type in the payload")
		}
		if m.Schedule.Recurrence.Duration == 0 {
			return errors.Newf(errors.TypeInvalidInput, ErrCodeInvalidPlannedMaintenancePayload, "missing duration in the payload")
		}
		if m.Schedule.Recurrence.EndTime != nil && m.Schedule.Recurrence.EndTime.Before(m.Schedule.Recurrence.StartTime) {
			return errors.Newf(errors.TypeInvalidInput, ErrCodeInvalidPlannedMaintenancePayload, "end time cannot be before start time")
		}
	}
	return nil
}

func (m GettablePlannedMaintenance) MarshalJSON() ([]byte, error) {
	now := time.Now().In(time.FixedZone(m.Schedule.Timezone, 0))
	var status string
	if m.IsActive(now) {
		status = "active"
	} else if m.IsUpcoming() {
		status = "upcoming"
	} else {
		status = "expired"
	}
	var kind string

	if !m.Schedule.StartTime.IsZero() && !m.Schedule.EndTime.IsZero() && m.Schedule.EndTime.After(m.Schedule.StartTime) {
		kind = "fixed"
	} else {
		kind = "recurring"
	}

	return json.Marshal(struct {
		Id          string    `json:"id" db:"id"`
		Name        string    `json:"name" db:"name"`
		Description string    `json:"description" db:"description"`
		Schedule    *Schedule `json:"schedule" db:"schedule"`
		AlertIds    []string  `json:"alertIds" db:"alert_ids"`
		CreatedAt   time.Time `json:"createdAt" db:"created_at"`
		CreatedBy   string    `json:"createdBy" db:"created_by"`
		UpdatedAt   time.Time `json:"updatedAt" db:"updated_at"`
		UpdatedBy   string    `json:"updatedBy" db:"updated_by"`
		Status      string    `json:"status"`
		Kind        string    `json:"kind"`
	}{
		Id:          m.Id,
		Name:        m.Name,
		Description: m.Description,
		Schedule:    m.Schedule,
		AlertIds:    m.RuleIDs,
		CreatedAt:   m.CreatedAt,
		CreatedBy:   m.CreatedBy,
		UpdatedAt:   m.UpdatedAt,
		UpdatedBy:   m.UpdatedBy,
		Status:      status,
		Kind:        kind,
	})
}

func (m *GettablePlannedMaintenanceRule) ConvertGettableMaintenanceRuleToGettableMaintenance() *GettablePlannedMaintenance {
	ruleIDs := []string{}
	if m.Rules != nil {
		for _, storableMaintenanceRule := range m.Rules {
			ruleIDs = append(ruleIDs, storableMaintenanceRule.RuleID.StringValue())
		}
	}

	return &GettablePlannedMaintenance{
		Id:          m.ID.StringValue(),
		Name:        m.Name,
		Description: m.Description,
		Schedule:    m.Schedule,
		RuleIDs:     ruleIDs,
		CreatedAt:   m.CreatedAt,
		UpdatedAt:   m.UpdatedAt,
		CreatedBy:   m.CreatedBy,
		UpdatedBy:   m.UpdatedBy,
	}
}

type MaintenanceStore interface {
	CreatePlannedMaintenance(context.Context, GettablePlannedMaintenance) (valuer.UUID, error)
	DeletePlannedMaintenance(context.Context, valuer.UUID) error
	GetPlannedMaintenanceByID(context.Context, valuer.UUID) (*GettablePlannedMaintenance, error)
	EditPlannedMaintenance(context.Context, GettablePlannedMaintenance, valuer.UUID) error
	GetAllPlannedMaintenance(context.Context, string) ([]*GettablePlannedMaintenance, error)
}
