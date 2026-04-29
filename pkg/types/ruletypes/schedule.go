package ruletypes

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
