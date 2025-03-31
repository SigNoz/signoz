package rules

import (
	"database/sql/driver"
	"encoding/json"
	"slices"
	"strings"
	"time"

	"github.com/pkg/errors"
	"go.uber.org/zap"
)

var (
	ErrMissingName       = errors.New("missing name")
	ErrMissingSchedule   = errors.New("missing schedule")
	ErrMissingTimezone   = errors.New("missing timezone")
	ErrMissingRepeatType = errors.New("missing repeat type")
	ErrMissingDuration   = errors.New("missing duration")
)

type PlannedMaintenance struct {
	Id          int64     `json:"id" db:"id"`
	Name        string    `json:"name" db:"name"`
	Description string    `json:"description" db:"description"`
	Schedule    *Schedule `json:"schedule" db:"schedule"`
	AlertIds    *AlertIds `json:"alertIds" db:"alert_ids"`
	CreatedAt   time.Time `json:"createdAt" db:"created_at"`
	CreatedBy   string    `json:"createdBy" db:"created_by"`
	UpdatedAt   time.Time `json:"updatedAt" db:"updated_at"`
	UpdatedBy   string    `json:"updatedBy" db:"updated_by"`
	Status      string    `json:"status"`
	Kind        string    `json:"kind"`
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

type Schedule struct {
	Timezone   string      `json:"timezone"`
	StartTime  time.Time   `json:"startTime,omitempty"`
	EndTime    time.Time   `json:"endTime,omitempty"`
	Recurrence *Recurrence `json:"recurrence"`
}

func (s *Schedule) Scan(src interface{}) error {
	if data, ok := src.([]byte); ok {
		return json.Unmarshal(data, s)
	}
	return nil
}

func (s *Schedule) Value() (driver.Value, error) {
	return json.Marshal(s)
}

type RepeatType string

const (
	RepeatTypeDaily   RepeatType = "daily"
	RepeatTypeWeekly  RepeatType = "weekly"
	RepeatTypeMonthly RepeatType = "monthly"
)

type RepeatOn string

const (
	RepeatOnSunday    RepeatOn = "sunday"
	RepeatOnMonday    RepeatOn = "monday"
	RepeatOnTuesday   RepeatOn = "tuesday"
	RepeatOnWednesday RepeatOn = "wednesday"
	RepeatOnThursday  RepeatOn = "thursday"
	RepeatOnFriday    RepeatOn = "friday"
	RepeatOnSaturday  RepeatOn = "saturday"
)

type Recurrence struct {
	StartTime  time.Time  `json:"startTime"`
	EndTime    *time.Time `json:"endTime,omitempty"`
	Duration   Duration   `json:"duration"`
	RepeatType RepeatType `json:"repeatType"`
	RepeatOn   []RepeatOn `json:"repeatOn"`
}

func (r *Recurrence) Scan(src interface{}) error {
	if data, ok := src.([]byte); ok {
		return json.Unmarshal(data, r)
	}
	return nil
}

func (r *Recurrence) Value() (driver.Value, error) {
	return json.Marshal(r)
}

func (s Schedule) MarshalJSON() ([]byte, error) {
	loc, err := time.LoadLocation(s.Timezone)
	if err != nil {
		return nil, err
	}

	var startTime, endTime time.Time
	if !s.StartTime.IsZero() {
		startTime = time.Date(s.StartTime.Year(), s.StartTime.Month(), s.StartTime.Day(), s.StartTime.Hour(), s.StartTime.Minute(), s.StartTime.Second(), s.StartTime.Nanosecond(), loc)
	}
	if !s.EndTime.IsZero() {
		endTime = time.Date(s.EndTime.Year(), s.EndTime.Month(), s.EndTime.Day(), s.EndTime.Hour(), s.EndTime.Minute(), s.EndTime.Second(), s.EndTime.Nanosecond(), loc)
	}

	var recurrence *Recurrence
	if s.Recurrence != nil {
		recStartTime := time.Date(s.Recurrence.StartTime.Year(), s.Recurrence.StartTime.Month(), s.Recurrence.StartTime.Day(), s.Recurrence.StartTime.Hour(), s.Recurrence.StartTime.Minute(), s.Recurrence.StartTime.Second(), s.Recurrence.StartTime.Nanosecond(), loc)
		var recEndTime *time.Time
		if s.Recurrence.EndTime != nil {
			end := time.Date(s.Recurrence.EndTime.Year(), s.Recurrence.EndTime.Month(), s.Recurrence.EndTime.Day(), s.Recurrence.EndTime.Hour(), s.Recurrence.EndTime.Minute(), s.Recurrence.EndTime.Second(), s.Recurrence.EndTime.Nanosecond(), loc)
			recEndTime = &end
		}
		recurrence = &Recurrence{
			StartTime:  recStartTime,
			EndTime:    recEndTime,
			Duration:   s.Recurrence.Duration,
			RepeatType: s.Recurrence.RepeatType,
			RepeatOn:   s.Recurrence.RepeatOn,
		}
	}

	return json.Marshal(&struct {
		Timezone   string      `json:"timezone"`
		StartTime  string      `json:"startTime"`
		EndTime    string      `json:"endTime"`
		Recurrence *Recurrence `json:"recurrence,omitempty"`
	}{
		Timezone:   s.Timezone,
		StartTime:  startTime.Format(time.RFC3339),
		EndTime:    endTime.Format(time.RFC3339),
		Recurrence: recurrence,
	})
}

func (s *Schedule) UnmarshalJSON(data []byte) error {
	aux := &struct {
		Timezone   string      `json:"timezone"`
		StartTime  string      `json:"startTime"`
		EndTime    string      `json:"endTime"`
		Recurrence *Recurrence `json:"recurrence,omitempty"`
	}{}
	if err := json.Unmarshal(data, aux); err != nil {
		return err
	}

	loc, err := time.LoadLocation(aux.Timezone)
	if err != nil {
		return err
	}

	var startTime time.Time
	if aux.StartTime != "" {
		startTime, err = time.Parse(time.RFC3339, aux.StartTime)
		if err != nil {
			return err
		}
		s.StartTime = time.Date(startTime.Year(), startTime.Month(), startTime.Day(), startTime.Hour(), startTime.Minute(), startTime.Second(), startTime.Nanosecond(), loc)
	}

	var endTime time.Time
	if aux.EndTime != "" {
		endTime, err = time.Parse(time.RFC3339, aux.EndTime)
		if err != nil {
			return err
		}
		s.EndTime = time.Date(endTime.Year(), endTime.Month(), endTime.Day(), endTime.Hour(), endTime.Minute(), endTime.Second(), endTime.Nanosecond(), loc)
	}

	s.Timezone = aux.Timezone

	if aux.Recurrence != nil {
		recStartTime, err := time.Parse(time.RFC3339, aux.Recurrence.StartTime.Format(time.RFC3339))
		if err != nil {
			return err
		}

		var recEndTime *time.Time
		if aux.Recurrence.EndTime != nil {
			end, err := time.Parse(time.RFC3339, aux.Recurrence.EndTime.Format(time.RFC3339))
			if err != nil {
				return err
			}
			endConverted := time.Date(end.Year(), end.Month(), end.Day(), end.Hour(), end.Minute(), end.Second(), end.Nanosecond(), loc)
			recEndTime = &endConverted
		}

		s.Recurrence = &Recurrence{
			StartTime:  time.Date(recStartTime.Year(), recStartTime.Month(), recStartTime.Day(), recStartTime.Hour(), recStartTime.Minute(), recStartTime.Second(), recStartTime.Nanosecond(), loc),
			EndTime:    recEndTime,
			Duration:   aux.Recurrence.Duration,
			RepeatType: aux.Recurrence.RepeatType,
			RepeatOn:   aux.Recurrence.RepeatOn,
		}
	}
	return nil
}

func (m *PlannedMaintenance) shouldSkip(ruleID string, now time.Time) bool {
	// Check if the alert ID is in the maintenance window
	found := false
	if m.AlertIds != nil {
		for _, alertID := range *m.AlertIds {
			if alertID == ruleID {
				found = true
				break
			}
		}
	}

	// If no alert ids, then skip all alerts
	if m.AlertIds == nil || len(*m.AlertIds) == 0 {
		found = true
	}

	if !found {
		return false
	}

	zap.L().Debug("alert found in maintenance", zap.String("alert", ruleID), zap.String("maintenance", m.Name))

	// If alert is found, we check if it should be skipped based on the schedule
	loc, err := time.LoadLocation(m.Schedule.Timezone)
	if err != nil {
		zap.L().Error("Error loading location", zap.String("timezone", m.Schedule.Timezone), zap.Error(err))
		return false
	}

	currentTime := now.In(loc)

	// fixed schedule
	if !m.Schedule.StartTime.IsZero() && !m.Schedule.EndTime.IsZero() {
		zap.L().Debug("checking fixed schedule",
			zap.String("rule", ruleID),
			zap.String("maintenance", m.Name),
			zap.Time("currentTime", currentTime),
			zap.Time("startTime", m.Schedule.StartTime),
			zap.Time("endTime", m.Schedule.EndTime))

		if currentTime.Equal(m.Schedule.StartTime) ||
			currentTime.Equal(m.Schedule.EndTime) ||
			(currentTime.After(m.Schedule.StartTime) && currentTime.Before(m.Schedule.EndTime)) {
			return true
		}
	}

	// recurring schedule
	if m.Schedule.Recurrence != nil {
		start := m.Schedule.Recurrence.StartTime
		duration := time.Duration(m.Schedule.Recurrence.Duration)
		end := start.Add(duration)

		zap.L().Debug("checking recurring schedule base info",
			zap.String("rule", ruleID),
			zap.String("maintenance", m.Name),
			zap.Time("startTime", start),
			zap.Duration("duration", duration))

		// Make sure the recurrence has started
		if currentTime.Before(start.In(loc)) {
			zap.L().Debug("current time is before recurrence start time",
				zap.String("rule", ruleID),
				zap.String("maintenance", m.Name))
			return false
		}

		// Check if recurrence has expired
		if m.Schedule.Recurrence.EndTime != nil {
			endTime := *m.Schedule.Recurrence.EndTime
			if !endTime.IsZero() && currentTime.After(endTime.In(loc)) {
				zap.L().Debug("current time is after recurrence end time",
					zap.String("rule", ruleID),
					zap.String("maintenance", m.Name))
				return false
			}
		}

		switch m.Schedule.Recurrence.RepeatType {
		case RepeatTypeDaily:
			// Create start time for current day
			startTime := time.Date(currentTime.Year(), currentTime.Month(), currentTime.Day(),
				start.Hour(), start.Minute(), 0, 0, loc)

			// Create end time, handling cases that cross midnight
			endHour, endMinute := end.Hour(), end.Minute()
			var endTime time.Time

			// If duration is 24 hours or more, or if end time hour is earlier than start time hour,
			// we're crossing midnight
			crossesMidnight := duration >= 24*time.Hour || (end.Hour() < start.Hour() ||
				(end.Hour() == start.Hour() && end.Minute() < start.Minute()))

			if crossesMidnight {
				// Set end time to the next day
				endTime = time.Date(currentTime.Year(), currentTime.Month(), currentTime.Day()+1,
					endHour, endMinute, 0, 0, loc)
			} else {
				endTime = time.Date(currentTime.Year(), currentTime.Month(), currentTime.Day(),
					endHour, endMinute, 0, 0, loc)
			}

			zap.L().Debug("checking daily schedule",
				zap.String("rule", ruleID),
				zap.String("maintenance", m.Name),
				zap.Time("currentTime", currentTime),
				zap.Time("startTime", startTime),
				zap.Time("endTime", endTime),
				zap.Bool("crossesMidnight", crossesMidnight))

			if currentTime.Equal(startTime) || currentTime.Equal(endTime) ||
				(currentTime.After(startTime) && currentTime.Before(endTime)) {
				return true
			}

			// Check previous day if we crossed midnight and current time is before the end time today
			if crossesMidnight && currentTime.Hour() < endHour ||
				(currentTime.Hour() == endHour && currentTime.Minute() < endMinute) {

				yesterdayStart := startTime.AddDate(0, 0, -1)
				zap.L().Debug("checking previous day for daily schedule",
					zap.Time("yesterdayStart", yesterdayStart))

				if currentTime.After(yesterdayStart) {
					return true
				}
			}

		case RepeatTypeWeekly:
			// Get weekday as string for comparison
			currentWeekday := RepeatOn(strings.ToLower(currentTime.Weekday().String()))

			// Create today's start time
			startTime := time.Date(currentTime.Year(), currentTime.Month(), currentTime.Day(),
				start.Hour(), start.Minute(), 0, 0, loc)

			// Create end time, handling cases that cross midnight
			endHour, endMinute := end.Hour(), end.Minute()
			var endTime time.Time

			// Check if window crosses midnight
			crossesMidnight := duration >= 24*time.Hour || (end.Hour() < start.Hour() ||
				(end.Hour() == start.Hour() && end.Minute() < start.Minute()))

			if crossesMidnight {
				// Set end time to the next day
				endTime = time.Date(currentTime.Year(), currentTime.Month(), currentTime.Day()+1,
					endHour, endMinute, 0, 0, loc)
			} else {
				endTime = time.Date(currentTime.Year(), currentTime.Month(), currentTime.Day(),
					endHour, endMinute, 0, 0, loc)
			}

			zap.L().Debug("checking weekly schedule",
				zap.String("rule", ruleID),
				zap.String("maintenance", m.Name),
				zap.Time("currentTime", currentTime),
				zap.Time("startTime", startTime),
				zap.Time("endTime", endTime),
				zap.String("currentWeekday", string(currentWeekday)),
				zap.Bool("crossesMidnight", crossesMidnight))

			// Check if today is a maintenance day
			todayMaintenance := len(m.Schedule.Recurrence.RepeatOn) == 0 ||
				slices.Contains(m.Schedule.Recurrence.RepeatOn, currentWeekday)

			if todayMaintenance {
				if currentTime.Equal(startTime) || currentTime.Equal(endTime) ||
					(currentTime.After(startTime) && currentTime.Before(endTime)) {
					return true
				}
			}

			// If crosses midnight, check if yesterday was a maintenance day
			if crossesMidnight && (currentTime.Hour() < endHour ||
				(currentTime.Hour() == endHour && currentTime.Minute() < endMinute)) {

				yesterdayTime := currentTime.AddDate(0, 0, -1)
				yesterdayWeekday := RepeatOn(strings.ToLower(yesterdayTime.Weekday().String()))
				yesterdayMaintenance := len(m.Schedule.Recurrence.RepeatOn) == 0 ||
					slices.Contains(m.Schedule.Recurrence.RepeatOn, yesterdayWeekday)

				if yesterdayMaintenance {
					yesterdayStart := time.Date(yesterdayTime.Year(), yesterdayTime.Month(),
						yesterdayTime.Day(), start.Hour(), start.Minute(), 0, 0, loc)

					zap.L().Debug("checking previous day for weekly schedule",
						zap.Time("yesterdayStart", yesterdayStart),
						zap.String("yesterdayWeekday", string(yesterdayWeekday)))

					if currentTime.After(yesterdayStart) {
						return true
					}
				}
			}

		case RepeatTypeMonthly:
			// Create this month's start time on the specified day
			monthStartDay := start.Day()

			// Adjust for month length if needed
			// Get number of days in current month
			currentYear, currentMonth, _ := currentTime.Date()
			lastDay := time.Date(currentYear, currentMonth+1, 0, 0, 0, 0, 0, loc).Day()

			if monthStartDay > lastDay {
				monthStartDay = lastDay
			}

			startTime := time.Date(currentTime.Year(), currentTime.Month(), monthStartDay,
				start.Hour(), start.Minute(), 0, 0, loc)

			// Check if window crosses to next day/month
			durationDays := int(duration.Hours() / 24)
			remainingHours := duration.Hours() - float64(durationDays*24)

			endTime := startTime.AddDate(0, 0, durationDays)
			endTime = endTime.Add(time.Duration(remainingHours * float64(time.Hour)))

			zap.L().Debug("checking monthly schedule",
				zap.String("rule", ruleID),
				zap.String("maintenance", m.Name),
				zap.Time("currentTime", currentTime),
				zap.Time("startTime", startTime),
				zap.Time("endTime", endTime),
				zap.Int("durationDays", durationDays))

			if currentTime.Equal(startTime) || currentTime.Equal(endTime) ||
				(currentTime.After(startTime) && currentTime.Before(endTime)) {
				return true
			}

			// If crosses to previous month, check previous month's window
			if durationDays > 0 {
				// Check if we're in the early days of the month and might be in previous month's window
				if currentTime.Day() <= durationDays {
					prevMonth := currentTime.AddDate(0, -1, 0)
					prevYear, prevMonthVal, _ := prevMonth.Date()

					// Get last day of previous month
					lastDayPrevMonth := time.Date(prevYear, prevMonthVal+1, 0, 0, 0, 0, 0, loc).Day()
					prevMonthStartDay := start.Day()

					if prevMonthStartDay > lastDayPrevMonth {
						prevMonthStartDay = lastDayPrevMonth
					}

					prevMonthStart := time.Date(prevYear, prevMonthVal, prevMonthStartDay,
						start.Hour(), start.Minute(), 0, 0, loc)
					prevMonthEnd := prevMonthStart.AddDate(0, 0, durationDays)
					prevMonthEnd = prevMonthEnd.Add(time.Duration(remainingHours * float64(time.Hour)))

					zap.L().Debug("checking previous month for monthly schedule",
						zap.Time("prevMonthStart", prevMonthStart),
						zap.Time("prevMonthEnd", prevMonthEnd))

					if currentTime.After(prevMonthStart) && currentTime.Before(prevMonthEnd) {
						return true
					}
				}
			}
		}
	}

	return false
}

func (m *PlannedMaintenance) IsActive(now time.Time) bool {
	ruleID := "maintenance"
	if m.AlertIds != nil && len(*m.AlertIds) > 0 {
		ruleID = (*m.AlertIds)[0]
	}
	return m.shouldSkip(ruleID, now)
}

func (m *PlannedMaintenance) IsUpcoming() bool {
	now := time.Now().In(time.FixedZone(m.Schedule.Timezone, 0))
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

func (m PlannedMaintenance) MarshalJSON() ([]byte, error) {
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
		Id          int64     `json:"id" db:"id"`
		Name        string    `json:"name" db:"name"`
		Description string    `json:"description" db:"description"`
		Schedule    *Schedule `json:"schedule" db:"schedule"`
		AlertIds    *AlertIds `json:"alertIds" db:"alert_ids"`
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
