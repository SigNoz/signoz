package featureflag

type Flag struct {
	s string
}

func NewFlag(s string) Flag {
	return Flag{s: s}
}

func (f Flag) String() string {
	return f.s
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
