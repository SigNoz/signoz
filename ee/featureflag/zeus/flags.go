package zeus

import "go.signoz.io/signoz/pkg/featureflag"

var basePlanFeatures = []featureflag.Feature{
	{
		Name:         featureflag.FeatureSSO,
		IsActive:     false,
		IsChangeable: false,
	},
	{
		Name:         featureflag.FeatureOSS,
		IsActive:     false,
		IsChangeable: false,
	},
	{
		Name:         featureflag.FeatureUseSpanMetrics,
		IsActive:     true,
		IsChangeable: false,
	},
	{
		Name:         featureflag.FeatureGateway,
		IsActive:     false,
		IsChangeable: false,
	},
	{
		Name:         featureflag.FeaturePremiumSupport,
		IsActive:     false,
		IsChangeable: false,
	},
	{
		Name:         featureflag.FeatureHostsInfraMonitoring,
		IsActive:     false,
		IsChangeable: false,
	},
}

var proPlanFeatures = []featureflag.Feature{
	{
		Name:         featureflag.FeatureSSO,
		IsActive:     true,
		IsChangeable: false,
	},
	{
		Name:         featureflag.FeatureCustomMetricsFunc,
		IsActive:     true,
		IsChangeable: false,
	},
	{
		Name:         featureflag.FeatureAlertChannelMsTeams,
		IsActive:     true,
		IsChangeable: false,
	},
	{
		Name:         featureflag.FeatureGateway,
		IsActive:     true,
		IsChangeable: false,
	},
	{
		Name:         featureflag.FeaturePremiumSupport,
		IsActive:     true,
		IsChangeable: false,
	},
	{
		Name:         featureflag.FeatureAnomalyDetection,
		IsActive:     true,
		IsChangeable: false,
	},
	{
		Name:         featureflag.FeatureHostsInfraMonitoring,
		IsActive:     true,
		IsChangeable: false,
	},
}

var enterprisePlanFeatures = []featureflag.Feature{
	{
		Name:         featureflag.FeatureOnboarding,
		IsActive:     true,
		IsChangeable: false,
	},
	{
		Name:         featureflag.FeatureChatSupport,
		IsActive:     true,
		IsChangeable: false,
	},
}
