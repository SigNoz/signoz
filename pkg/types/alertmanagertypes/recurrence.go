package alertmanagertypes

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

// Recurrence describes the repeat pattern of a planned maintenance.
// The window bounds (start/end) live on the enclosing Schedule.
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
