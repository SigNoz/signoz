package featureflag

import (
	"database/sql/driver"
	"fmt"
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
