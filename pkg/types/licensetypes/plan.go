package licensetypes

import "github.com/SigNoz/signoz/pkg/types/featuretypes"

const SSO = "SSO"
const Basic = "BASIC_PLAN"
const Enterprise = "ENTERPRISE_PLAN"

var (
	PlanNameEnterprise = "ENTERPRISE"
	PlanNameBasic      = "BASIC"
)

var (
	MapOldPlanKeyToNewPlanName map[string]string = map[string]string{PlanNameBasic: Basic, PlanNameEnterprise: Enterprise}
)

var (
	LicenseStatusInvalid = "INVALID"
)

const Onboarding = "ONBOARDING"
const ChatSupport = "CHAT_SUPPORT"
const Gateway = "GATEWAY"
const PremiumSupport = "PREMIUM_SUPPORT"

var BasicPlan = featuretypes.FeatureSet{
	&featuretypes.GettableFeature{
		Name:       SSO,
		Active:     false,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
	&featuretypes.GettableFeature{
		Name:       featuretypes.UseSpanMetrics,
		Active:     false,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
	&featuretypes.GettableFeature{
		Name:       Gateway,
		Active:     false,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
	&featuretypes.GettableFeature{
		Name:       PremiumSupport,
		Active:     false,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
	&featuretypes.GettableFeature{
		Name:       featuretypes.AnomalyDetection,
		Active:     false,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
	&featuretypes.GettableFeature{
		Name:       featuretypes.TraceFunnels,
		Active:     false,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
}

var EnterprisePlan = featuretypes.FeatureSet{
	&featuretypes.GettableFeature{
		Name:       SSO,
		Active:     true,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
	&featuretypes.GettableFeature{
		Name:       featuretypes.UseSpanMetrics,
		Active:     false,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
	&featuretypes.GettableFeature{
		Name:       Onboarding,
		Active:     true,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
	&featuretypes.GettableFeature{
		Name:       ChatSupport,
		Active:     true,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
	&featuretypes.GettableFeature{
		Name:       Gateway,
		Active:     true,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
	&featuretypes.GettableFeature{
		Name:       PremiumSupport,
		Active:     true,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
	&featuretypes.GettableFeature{
		Name:       featuretypes.AnomalyDetection,
		Active:     true,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
	&featuretypes.GettableFeature{
		Name:       featuretypes.TraceFunnels,
		Active:     false,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
}

var DefaultFeatureSet = featuretypes.FeatureSet{
	&featuretypes.GettableFeature{
		Name:       featuretypes.UseSpanMetrics,
		Active:     false,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
}
