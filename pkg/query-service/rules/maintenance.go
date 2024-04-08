package rules

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"slices"
	"strings"
	"time"

	"go.uber.org/zap"
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
	StartTime  *time.Time  `json:"startTime"`
	EndTime    *time.Time  `json:"endTime"`
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
	EndTime    *time.Time `json:"endTime"`
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

func (m *PlannedMaintenance) shouldSkip(ruleID string) bool {

	found := false
	for _, alertID := range *m.AlertIds {
		if alertID == ruleID {
			found = true
			break
		}
	}
	// If no alert ids, then skip all alerts
	if len(*m.AlertIds) == 0 {
		found = true
	}

	if found {

		zap.L().Info("alert found in maintenance", zap.String("alert", ruleID), zap.Any("maintenance", m.Name))

		// If alert is found, we check if it should be skipped based on the schedule
		// If it should be skipped, we return true
		// If it should not be skipped, we return false

		// fixed schedule
		if m.Schedule.StartTime != nil && m.Schedule.EndTime != nil {
			// if the current time in the timezone is between the start and end time
			loc, err := time.LoadLocation(m.Schedule.Timezone)
			if err != nil {
				zap.L().Error("Error loading location", zap.String("timezone", m.Schedule.Timezone), zap.Error(err))
				return false
			}
			currentTime := time.Now().In(loc)
			zap.L().Info("checking fixed schedule", zap.Any("rule", ruleID), zap.String("maintenance", m.Name), zap.Time("currentTime", currentTime), zap.Time("startTime", *m.Schedule.StartTime), zap.Time("endTime", *m.Schedule.EndTime))
			if currentTime.After(*m.Schedule.StartTime) && currentTime.Before(*m.Schedule.EndTime) {
				return true
			}
		}

		// recurring schedule
		if m.Schedule.Recurrence != nil {
			start := m.Schedule.Recurrence.StartTime
			end := m.Schedule.Recurrence.EndTime
			// if the current time in the timezone is between the start and end time
			loc, err := time.LoadLocation(m.Schedule.Timezone)
			if err != nil {
				zap.L().Error("Error loading location", zap.String("timezone", m.Schedule.Timezone), zap.Error(err))
				return false
			}
			currentTime := time.Now().In(loc)

			zap.L().Info("checking recurring schedule", zap.Any("rule", ruleID), zap.String("maintenance", m.Name), zap.Time("currentTime", currentTime), zap.Time("startTime", start), zap.Time("endTime", *end))

			fmt.Println(start.In(loc), currentTime)
			// make sure the start time is not after the current time
			if currentTime.Before(start.In(loc)) {
				zap.L().Info("current time is before start time", zap.Any("rule", ruleID), zap.String("maintenance", m.Name), zap.Time("currentTime", currentTime), zap.Time("startTime", start.In(loc)))
				return false
			}

			switch m.Schedule.Recurrence.RepeatType {
			case RepeatTypeDaily:
				// take the hours and minutes from the start time and add them to the current time
				startTime := time.Date(currentTime.Year(), currentTime.Month(), currentTime.Day(), start.Hour(), start.Minute(), 0, 0, loc)
				endTime := time.Date(currentTime.Year(), currentTime.Month(), currentTime.Day(), end.Hour(), end.Minute(), 0, 0, loc)
				zap.L().Info("checking daily schedule", zap.Any("rule", ruleID), zap.String("maintenance", m.Name), zap.Time("currentTime", currentTime), zap.Time("startTime", startTime), zap.Time("endTime", endTime))

				if currentTime.After(startTime) && currentTime.Before(endTime) {
					return true
				}
			case RepeatTypeWeekly:
				// if the current time in the timezone is between the start and end time on the RepeatOn day
				startTime := time.Date(currentTime.Year(), currentTime.Month(), currentTime.Day(), start.Hour(), start.Minute(), 0, 0, loc)
				endTime := time.Date(currentTime.Year(), currentTime.Month(), currentTime.Day(), end.Hour(), end.Minute(), 0, 0, loc)
				zap.L().Info("checking weekly schedule", zap.Any("rule", ruleID), zap.String("maintenance", m.Name), zap.Time("currentTime", currentTime), zap.Time("startTime", startTime), zap.Time("endTime", endTime))
				if currentTime.After(startTime) && currentTime.Before(endTime) && slices.Contains(m.Schedule.Recurrence.RepeatOn, RepeatOn(strings.ToLower(currentTime.Weekday().String()))) {
					return true
				}
			case RepeatTypeMonthly:
				// if the current time in the timezone is between the start and end time on the day of the current month
				startTime := time.Date(currentTime.Year(), currentTime.Month(), start.Day(), start.Hour(), start.Minute(), 0, 0, loc)
				endTime := time.Date(currentTime.Year(), currentTime.Month(), end.Day(), end.Hour(), end.Minute(), 0, 0, loc)
				zap.L().Info("checking monthly schedule", zap.Any("rule", ruleID), zap.String("maintenance", m.Name), zap.Time("currentTime", currentTime), zap.Time("startTime", startTime), zap.Time("endTime", endTime))
				if currentTime.After(startTime) && currentTime.Before(endTime) && currentTime.Day() == start.Day() {
					return true
				}
			}
		}
	}
	// If alert is not found, we return false
	return false
}
