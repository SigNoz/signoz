package zeus

import "go.signoz.io/signoz/pkg/featureflag"

var basePlanFeatures = []featureflag.Feature{
	{
		Name:     featureflag.FeatureSSO,
		IsActive: false,
	},
	{
		Name:     featureflag.FeatureOSS,
		IsActive: false,
	},
	{
		Name:     featureflag.FeatureUseSpanMetrics,
		IsActive: true,
	},
	{
		Name:     featureflag.FeatureGateway,
		IsActive: false,
	},
	{
		Name:     featureflag.FeaturePremiumSupport,
		IsActive: false,
	},
	{
		Name:     featureflag.FeatureHostsInfraMonitoring,
		IsActive: false,
	},
}

var proPlanFeatures = []featureflag.Feature{
	{
		Name:     featureflag.FeatureSSO,
		IsActive: false,
	},
	{
		Name:     featureflag.FeatureCustomMetricsFunc,
		IsActive: true,
	},
	{
		Name:     featureflag.FeatureAlertChannelMsTeams,
		IsActive: true,
	},
	{
		Name:     featureflag.FeatureGateway,
		IsActive: true,
	},
	{
		Name:     featureflag.FeaturePremiumSupport,
		IsActive: true,
	},
	{
		Name:     featureflag.FeatureAnomalyDetection,
		IsActive: true,
	},
	{
		Name:     featureflag.FeatureHostsInfraMonitoring,
		IsActive: true,
	},
}

var enterprisePlanFeatures = []featureflag.Feature{
	{
		Name:     featureflag.FeatureOnboarding,
		IsActive: true,
	},
	{
		Name:     featureflag.FeatureChatSupport,
		IsActive: true,
	},
}
