package base

import (
	"go.signoz.io/signoz/pkg/featureflag"
)

var defaultFeatures = []featureflag.Feature{
	{
		Name:         featureflag.FeatureOSS,
		IsActive:     true,
		IsChangeable: false,
	},
	{
		Name:         featureflag.FeatureDisableUpsell,
		IsActive:     false,
		IsChangeable: false,
	},
	{
		Name:         featureflag.FeatureCustomMetricsFunc,
		IsActive:     false,
		IsChangeable: false,
	},
	{
		Name:         featureflag.FeatureQueryBuilderPanels,
		IsActive:     true,
		IsChangeable: false,
	},
	{
		Name:         featureflag.FeatureQueryBuilderAlerts,
		IsActive:     true,
		IsChangeable: false,
	},
	{
		Name:         featureflag.FeatureUseSpanMetrics,
		IsActive:     false,
		IsChangeable: false,
	},
	{
		Name:         featureflag.FeatureAlertChannelSlack,
		IsActive:     true,
		IsChangeable: false,
	},
	{
		Name:         featureflag.FeatureAlertChannelWebhook,
		IsActive:     true,
		IsChangeable: false,
	},
	{
		Name:         featureflag.FeatureAlertChannelPagerduty,
		IsActive:     true,
		IsChangeable: false,
	},
	{
		Name:         featureflag.FeatureAlertChannelOpsgenie,
		IsActive:     true,
		IsChangeable: false,
	},
	{
		Name:         featureflag.FeatureAlertChannelEmail,
		IsActive:     true,
		IsChangeable: false,
	},
	{
		Name:         featureflag.FeatureAlertChannelMsTeams,
		IsActive:     false,
		IsChangeable: false,
	},
	{
		Name:         featureflag.FeatureAnomalyDetection,
		IsActive:     false,
		IsChangeable: false,
	},
}
