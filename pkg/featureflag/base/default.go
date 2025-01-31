package base

import (
	"go.signoz.io/signoz/pkg/featureflag"
)

var defaultFeatures = []featureflag.Feature{
	{
		Name:     featureflag.FeatureOSS,
		IsActive: true,
	},
	{
		Name:     featureflag.FeatureDisableUpsell,
		IsActive: false,
	},
	{
		Name:     featureflag.FeatureCustomMetricsFunc,
		IsActive: false,
	},
	{
		Name:     featureflag.FeatureQueryBuilderPanels,
		IsActive: true,
	},
	{
		Name:     featureflag.FeatureQueryBuilderAlerts,
		IsActive: true,
	},
	{
		Name:     featureflag.FeatureUseSpanMetrics,
		IsActive: false,
	},
	{
		Name:     featureflag.FeatureAlertChannelSlack,
		IsActive: true,
	},
	{
		Name:     featureflag.FeatureAlertChannelWebhook,
		IsActive: true,
	},
	{
		Name:     featureflag.FeatureAlertChannelPagerduty,
		IsActive: true,
	},
	{
		Name:     featureflag.FeatureAlertChannelOpsgenie,
		IsActive: true,
	},
	{
		Name:     featureflag.FeatureAlertChannelEmail,
		IsActive: true,
	},
	{
		Name:     featureflag.FeatureAlertChannelMsTeams,
		IsActive: false,
	},
	{
		Name:     featureflag.FeatureAnomalyDetection,
		IsActive: false,
	},
}
