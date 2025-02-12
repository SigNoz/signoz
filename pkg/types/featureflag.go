package types

import (
	"database/sql/driver"
	"fmt"

	"github.com/uptrace/bun"
)

type Flag struct {
	s string
}

func NewFlag(s string) Flag {
	return Flag{s: s}
}

func (f Flag) String() string {
	return f.s
}

// Implement the sql.Scanner interface
func (f *Flag) Scan(value interface{}) error {
	if value == nil {
		*f = Flag{}
		return nil
	}

	strValue, ok := value.(string)
	if !ok {
		return fmt.Errorf("expected string but got %T", value)
	}

	*f = NewFlag(strValue)
	return nil
}

// Implement the driver.Valuer interface
func (f Flag) Value() (driver.Value, error) {
	return f.String(), nil
}

// Flag variables
var (
	FeatureOSS                   = NewFlag("oss")
	FeatureDisableUpsell         = NewFlag("disableUpsell")
	FeatureCustomMetricsFunc     = NewFlag("customMetricsFunction")
	FeatureQueryBuilderPanels    = NewFlag("queryBuilderPanels")
	FeatureQueryBuilderAlerts    = NewFlag("queryBuilderAlerts")
	FeatureUseSpanMetrics        = NewFlag("useSpanMetrics")
	FeatureAlertChannelSlack     = NewFlag("alertChannelSlack")
	FeatureAlertChannelWebhook   = NewFlag("alertChannelWebhook")
	FeatureAlertChannelPagerduty = NewFlag("alertChannelPagerduty")
	FeatureAlertChannelOpsgenie  = NewFlag("alertChannelOpsgenie")
	FeatureAlertChannelEmail     = NewFlag("alertChannelEmail")
	FeatureAlertChannelMsTeams   = NewFlag("alertChannelMsTeams")
	FeatureAnomalyDetection      = NewFlag("anomalyDetection")
	FeatureSSO                   = NewFlag("sso")
	FeatureGateway               = NewFlag("gateway")
	FeaturePremiumSupport        = NewFlag("premiumSupport")
	FeatureHostsInfraMonitoring  = NewFlag("hostsInfraMonitoring")
	FeatureOnboarding            = NewFlag("onboarding")
	FeatureChatSupport           = NewFlag("chatSupport")
)

// Feature is the struct that holds the feature flag data
type Feature struct {
	bun.BaseModel `bun:"table:feature_flag"`

	OrgID        string `bun:"org_id"`
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
		f.OrgID == other.OrgID &&
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
