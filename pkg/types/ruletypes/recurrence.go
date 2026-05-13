package ruletypes

import (
	"database/sql/driver"
	"encoding/json"
	"reflect"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type RepeatType struct {
	valuer.String
}

var (
	RepeatTypeDaily   = RepeatType{valuer.NewString("daily")}
	RepeatTypeWeekly  = RepeatType{valuer.NewString("weekly")}
	RepeatTypeMonthly = RepeatType{valuer.NewString("monthly")}
)

// Enum implements jsonschema.Enum; returns the acceptable values for RepeatType.
func (RepeatType) Enum() []any {
	return []any{
		RepeatTypeDaily,
		RepeatTypeWeekly,
		RepeatTypeMonthly,
	}
}

type RepeatOn struct {
	valuer.String
}

var (
	RepeatOnSunday    = RepeatOn{valuer.NewString("sunday")}
	RepeatOnMonday    = RepeatOn{valuer.NewString("monday")}
	RepeatOnTuesday   = RepeatOn{valuer.NewString("tuesday")}
	RepeatOnWednesday = RepeatOn{valuer.NewString("wednesday")}
	RepeatOnThursday  = RepeatOn{valuer.NewString("thursday")}
	RepeatOnFriday    = RepeatOn{valuer.NewString("friday")}
	RepeatOnSaturday  = RepeatOn{valuer.NewString("saturday")}
)

// Enum implements jsonschema.Enum; returns the acceptable values for RepeatOn.
func (RepeatOn) Enum() []any {
	return []any{
		RepeatOnSunday,
		RepeatOnMonday,
		RepeatOnTuesday,
		RepeatOnWednesday,
		RepeatOnThursday,
		RepeatOnFriday,
		RepeatOnSaturday,
	}
}

var RepeatOnAllMap = map[RepeatOn]time.Weekday{
	RepeatOnSunday:    time.Sunday,
	RepeatOnMonday:    time.Monday,
	RepeatOnTuesday:   time.Tuesday,
	RepeatOnWednesday: time.Wednesday,
	RepeatOnThursday:  time.Thursday,
	RepeatOnFriday:    time.Friday,
	RepeatOnSaturday:  time.Saturday,
}

type Recurrence struct {
	Duration   valuer.TextDuration `json:"duration" required:"true"`
	RepeatType RepeatType          `json:"repeatType" required:"true"`
	RepeatOn   []RepeatOn          `json:"repeatOn"`
}

func (r *Recurrence) Scan(src interface{}) error {
	switch data := src.(type) {
	case []byte:
		return json.Unmarshal(data, r)
	case string:
		return json.Unmarshal([]byte(data), r)
	case nil:
		return nil
	default:
		return errors.Newf(errors.TypeInternal, errors.CodeInternal, "recurrence: (unsupported \"%s\")", reflect.TypeOf(data).String())
	}
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

	return json.Marshal(&struct {
		Timezone   string      `json:"timezone"`
		StartTime  time.Time   `json:"startTime"`
		EndTime    time.Time   `json:"endTime,omitzero"`
		Recurrence *Recurrence `json:"recurrence,omitempty"`
	}{
		Timezone:   s.Timezone,
		StartTime:  startTime,
		EndTime:    endTime,
		Recurrence: s.Recurrence,
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
		// TODO: if endTime.IsZero() then we should not set the endTime
		s.EndTime = time.Date(endTime.Year(), endTime.Month(), endTime.Day(), endTime.Hour(), endTime.Minute(), endTime.Second(), endTime.Nanosecond(), loc)
	}

	s.Timezone = aux.Timezone
	s.Recurrence = aux.Recurrence
	return nil
}
