package ruletypes

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"time"

	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
	"go.uber.org/zap"
)

var (
	ErrMissingName       = errors.New("missing name")
	ErrMissingSchedule   = errors.New("missing schedule")
	ErrMissingTimezone   = errors.New("missing timezone")
	ErrMissingRepeatType = errors.New("missing repeat type")
	ErrMissingDuration   = errors.New("missing duration")
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
	AlertIds    *AlertIds `json:"alertIds"`
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

type AlertIds []string

func (a *AlertIds) Scan(src interface{}) error {
	if data, ok := src.([]byte); ok {
		return json.Unmarshal(data, a)
	}
	return nil
}

func (a *AlertIds) Value() (driver.Value, error) {
	return json.Marshal(a)
}

func (m *GettablePlannedMaintenance) shouldSkip(ruleID string, now time.Time) bool {
	// Check if the alert ID is in the maintenance window
	found := false
	if m.AlertIds != nil {
		for _, alertID := range m.AlertIds {
			if alertID == ruleID {
				found = true
				break
			}
		}
	}

	// If no alert ids, then skip all alerts
	if m.AlertIds == nil || len(m.AlertIds) == 0 {
		found = true
	}

	if !found {
		return false
	}

	zap.L().Info("alert found in maintenance", zap.String("alert", ruleID), zap.String("maintenance", m.Name))

	// If alert is found, we check if it should be skipped based on the schedule
	loc, err := time.LoadLocation(m.Schedule.Timezone)
	if err != nil {
		zap.L().Error("Error loading location", zap.String("timezone", m.Schedule.Timezone), zap.Error(err))
		return false
	}

	currentTime := now.In(loc)

	// fixed schedule
	if !m.Schedule.StartTime.IsZero() && !m.Schedule.EndTime.IsZero() {
		zap.L().Info("checking fixed schedule",
			zap.String("rule", ruleID),
			zap.String("maintenance", m.Name),
			zap.Time("currentTime", currentTime),
			zap.Time("startTime", m.Schedule.StartTime),
			zap.Time("endTime", m.Schedule.EndTime))

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
		duration := time.Duration(m.Schedule.Recurrence.Duration)

		zap.L().Info("checking recurring schedule base info",
			zap.String("rule", ruleID),
			zap.String("maintenance", m.Name),
			zap.Time("startTime", start),
			zap.Duration("duration", duration))

		// Make sure the recurrence has started
		if currentTime.Before(start.In(loc)) {
			zap.L().Info("current time is before recurrence start time",
				zap.String("rule", ruleID),
				zap.String("maintenance", m.Name))
			return false
		}

		// Check if recurrence has expired
		if m.Schedule.Recurrence.EndTime != nil {
			endTime := *m.Schedule.Recurrence.EndTime
			if !endTime.IsZero() && currentTime.After(endTime.In(loc)) {
				zap.L().Info("current time is after recurrence end time",
					zap.String("rule", ruleID),
					zap.String("maintenance", m.Name))
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
	if m.AlertIds != nil && len(m.AlertIds) > 0 {
		ruleID = (m.AlertIds)[0]
	}
	return m.shouldSkip(ruleID, now)
}

func (m *GettablePlannedMaintenance) IsUpcoming() bool {
	loc, err := time.LoadLocation(m.Schedule.Timezone)
	if err != nil {
		// handle error appropriately, for example log and return false or fallback to UTC
		zap.L().Error("Error loading timezone", zap.String("timezone", m.Schedule.Timezone), zap.Error(err))
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
		return ErrMissingName
	}
	if m.Schedule == nil {
		return ErrMissingSchedule
	}
	if m.Schedule.Timezone == "" {
		return ErrMissingTimezone
	}

	_, err := time.LoadLocation(m.Schedule.Timezone)
	if err != nil {
		return errors.New("invalid timezone")
	}

	if !m.Schedule.StartTime.IsZero() && !m.Schedule.EndTime.IsZero() {
		if m.Schedule.StartTime.After(m.Schedule.EndTime) {
			return errors.New("start time cannot be after end time")
		}
	}

	if m.Schedule.Recurrence != nil {
		if m.Schedule.Recurrence.RepeatType == "" {
			return ErrMissingRepeatType
		}
		if m.Schedule.Recurrence.Duration == 0 {
			return ErrMissingDuration
		}
		if m.Schedule.Recurrence.EndTime != nil && m.Schedule.Recurrence.EndTime.Before(m.Schedule.Recurrence.StartTime) {
			return errors.New("end time cannot be before start time")
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
		AlertIds:    m.AlertIds,
		CreatedAt:   m.CreatedAt,
		CreatedBy:   m.CreatedBy,
		UpdatedAt:   m.UpdatedAt,
		UpdatedBy:   m.UpdatedBy,
		Status:      status,
		Kind:        kind,
	})
}
