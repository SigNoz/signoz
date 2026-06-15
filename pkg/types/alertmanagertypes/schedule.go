package alertmanagertypes

import (
	"database/sql/driver"
	"encoding/json"
	"reflect"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
)

type Schedule struct {
	Timezone   string      `json:"timezone" required:"true"`
	StartTime  time.Time   `json:"startTime" required:"true"`
	EndTime    time.Time   `json:"endTime,omitzero"`
	Recurrence *Recurrence `json:"recurrence"`
}

func (s *Schedule) Scan(src interface{}) error {
	switch data := src.(type) {
	case []byte:
		return json.Unmarshal(data, s)
	case string:
		return json.Unmarshal([]byte(data), s)
	case nil:
		return nil
	default:
		return errors.Newf(errors.TypeInternal, errors.CodeInternal, "schedule: (unsupported \"%s\")", reflect.TypeOf(data).String())
	}
}

func (s *Schedule) Value() (driver.Value, error) {
	return json.Marshal(s)
}

func (s Schedule) MarshalJSON() ([]byte, error) {
	loc, err := time.LoadLocation(s.Timezone)
	if err != nil {
		return nil, err
	}

	// Marshal times in the selected timezone.
	// This ensures that recurring events are handled correctly when DST is involved.
	startTime := s.StartTime.In(loc)
	var endTime time.Time
	if !s.EndTime.IsZero() {
		endTime = s.EndTime.In(loc)
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

	if aux.Timezone == "" {
		return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "missing timezone")
	}

	loc, err := time.LoadLocation(aux.Timezone)
	if err != nil {
		return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, `invalid timezone "%s"`, aux.Timezone)
	}

	startTime, err := time.Parse(time.RFC3339, aux.StartTime)
	if err != nil {
		return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, `invalid start time "%s"`, aux.StartTime)
	}
	startTime = startTime.In(loc)

	var endTime time.Time
	if aux.EndTime != "" {
		endTime, err = time.Parse(time.RFC3339, aux.EndTime)
		if err != nil {
			return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, `invalid end time "%s"`, aux.EndTime)
		}
		if !endTime.IsZero() {
			endTime = endTime.In(loc)
		}
	}

	s.Timezone = aux.Timezone
	s.StartTime = startTime
	s.EndTime = endTime
	s.Recurrence = aux.Recurrence
	return nil
}
