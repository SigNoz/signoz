package ruletypes

import (
	"database/sql/driver"
	"encoding/json"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
)

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

var RepeatOnAllMap = map[RepeatOn]time.Weekday{
	RepeatOnSunday:    time.Sunday,
	RepeatOnMonday:    time.Monday,
	RepeatOnTuesday:   time.Tuesday,
	RepeatOnWednesday: time.Wednesday,
	RepeatOnThursday:  time.Thursday,
	RepeatOnFriday:    time.Friday,
	RepeatOnSaturday:  time.Saturday,
}

type Duration time.Duration

func (d Duration) MarshalJSON() ([]byte, error) {
	return json.Marshal(time.Duration(d).String())
}

func (d *Duration) UnmarshalJSON(b []byte) error {
	var v interface{}
	if err := json.Unmarshal(b, &v); err != nil {
		return err
	}
	switch value := v.(type) {
	case float64:
		*d = Duration(time.Duration(value))
		return nil
	case string:
		tmp, err := time.ParseDuration(value)
		if err != nil {
			return err
		}
		*d = Duration(tmp)

		return nil
	default:
		return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "invalid duration")
	}
}

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
