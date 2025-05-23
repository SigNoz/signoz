package ruletypes

import (
	"database/sql/driver"
	"encoding/json"
	"time"
)

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
