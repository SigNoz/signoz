package alertmanagertypes

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
