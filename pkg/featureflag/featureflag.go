package featureflag

import (
	"database/sql/driver"
	"fmt"

	"github.com/uptrace/bun"
)

// FeatureFlag is the interface that all feature flag providers must implement
type FeatureFlag interface {
	//pass context
	GetFeatures(orgId string) []Feature
}

// Feature is the struct that holds the feature flag data
type Feature struct {
	bun.BaseModel `bun:"table:feature_flag"` // This specifies the table name as "features"

	OrgId        string `bun:"org_id"`
	Name         Flag   `bun:"name"`
	Description  string `bun:"description"`
	Stage        Stage  `bun:"stage"`
	IsActive     bool   `bun:"is_active"`
	IsChanged    bool   `bun:"is_changed"`
	IsChangeable bool   `bun:"is_changeable"`

	RequiresRestart bool `bun:"requires_restart"`
}

// Add a method to Feature for comparison
func (f Feature) Equals(other Feature) bool {
	return f.Name == other.Name &&
		f.OrgId == other.OrgId &&
		f.Description == other.Description &&
		f.Stage == other.Stage &&
		f.IsActive == other.IsActive &&
		f.IsChangeable == other.IsChangeable &&
		f.RequiresRestart == other.RequiresRestart
}

// It represents the stage of the feature
type Stage struct {
	s string
}

func NewStage(s string) Stage {
	return Stage{s: s}
}

func (s Stage) String() string {
	return s.s
}

func (s *Stage) Scan(value interface{}) error {
	if value == nil {
		*s = Stage{}
		return nil
	}

	strValue, ok := value.(string)
	if !ok {
		return fmt.Errorf("expected string but got %T", value)
	}

	*s = NewStage(strValue)
	return nil
}

func (s Stage) Value() (driver.Value, error) {
	return s.String(), nil
}

var (
	StageAlpha = NewStage("alpha")
	StageBeta  = NewStage("beta")
	StageGA    = NewStage("GA")
)
