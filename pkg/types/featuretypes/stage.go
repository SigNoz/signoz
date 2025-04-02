package featuretypes

import (
	"database/sql/driver"
	"fmt"
	"reflect"
)

var (
	// Is the feature experimental?
	StageExperimental = Stage{s: "experimental"}

	// Does the feature work but is not ready for production?
	StagePreview = Stage{s: "preview"}

	// Is the feature stable and ready for production?
	StageStable = Stage{s: "stable"}

	// Is the feature deprecated and will be removed in the future?
	StageDeprecated = Stage{s: "deprecated"}
)

type Stage struct {
	s string
}

func NewStage(s string) (Stage, error) {
	switch s {
	case "experimental":
		return StageExperimental, nil
	case "preview":
		return StagePreview, nil
	case "stable":
		return StageStable, nil
	case "deprecated":
		return StageDeprecated, nil
	default:
		return Stage{}, fmt.Errorf("invalid stage: %s", s)
	}
}

func (s Stage) String() string {
	return s.s
}

func (s *Stage) Scan(value any) error {
	if value == nil {
		return fmt.Errorf("stage: (nil)")
	}

	strValue, ok := value.(string)
	if !ok {
		return fmt.Errorf("stage: (non-string \"%s\")", reflect.TypeOf(value).String())
	}

	stage, err := NewStage(strValue)
	if err != nil {
		return err
	}

	*s = stage
	return nil
}

func (s Stage) Value() (driver.Value, error) {
	return s.String(), nil
}
