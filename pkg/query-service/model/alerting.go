package model

import (
	"database/sql/driver"
	"encoding/json"

	"github.com/pkg/errors"
)

// AlertState denotes the state of an active alert.
type AlertState int

const (
	StateInactive AlertState = iota
	StatePending
	StateFiring
	StateNoData
	StateDisabled
)

func (s AlertState) String() string {
	switch s {
	case StateInactive:
		return "inactive"
	case StatePending:
		return "pending"
	case StateFiring:
		return "firing"
	case StateNoData:
		return "nodata"
	case StateDisabled:
		return "disabled"
	}
	panic(errors.Errorf("unknown alert state: %d", s))
}

func (s AlertState) MarshalJSON() ([]byte, error) {
	return json.Marshal(s.String())
}

func (s *AlertState) UnmarshalJSON(b []byte) error {
	var v interface{}
	if err := json.Unmarshal(b, &v); err != nil {
		return err
	}
	switch value := v.(type) {
	case string:
		switch value {
		case "inactive":
			*s = StateInactive
		case "pending":
			*s = StatePending
		case "firing":
			*s = StateFiring
		case "nodata":
			*s = StateNoData
		case "disabled":
			*s = StateDisabled
		default:
			return errors.New("invalid alert state")
		}
		return nil
	default:
		return errors.New("invalid alert state")
	}
}

func (s *AlertState) Scan(value interface{}) error {
	v, ok := value.(string)
	if !ok {
		return errors.New("invalid alert state")
	}
	switch v {
	case "inactive":
		*s = StateInactive
	case "pending":
		*s = StatePending
	case "firing":
		*s = StateFiring
	case "nodata":
		*s = StateNoData
	case "disabled":
		*s = StateDisabled
	}
	return nil
}

func (s *AlertState) Value() (driver.Value, error) {
	return s.String(), nil
}
