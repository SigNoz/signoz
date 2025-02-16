package model

import (
	"go.signoz.io/signoz/pkg/query-service/constants"
	basemodel "go.signoz.io/signoz/pkg/query-service/model"
)

const SSO = "SSO"
const Basic = "BASIC_PLAN"
const Pro = "PRO_PLAN"
const Enterprise = "ENTERPRISE_PLAN"

var (
	PlanNameEnterprise = "ENTERPRISE"
	PlanNameTeams      = "TEAMS"
	PlanNameBasic      = "BASIC"
)

var (
	MapOldPlanKeyToNewPlanName map[string]string = map[string]string{PlanNameBasic: Basic, PlanNameTeams: Pro, PlanNameEnterprise: Enterprise}
)

var (
	LicenseStatusInvalid = "INVALID"
)

const DisableUpsell = "DISABLE_UPSELL"
const Onboarding = "ONBOARDING"
const ChatSupport = "CHAT_SUPPORT"
const Gateway = "GATEWAY"
const PremiumSupport = "PREMIUM_SUPPORT"

var BasicPlan = basemodel.FeatureSet{
	basemodel.Feature{
		Name:       SSO,
		Active:     false,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
	basemodel.Feature{
		Name:       basemodel.OSS,
		Active:     false,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
	basemodel.Feature{
		Name:       DisableUpsell,
		Active:     false,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
	basemodel.Feature{
		Name:       basemodel.SmartTraceDetail,
		Active:     false,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
	basemodel.Feature{
		Name:       basemodel.CustomMetricsFunction,
		Active:     false,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
	basemodel.Feature{
		Name:       basemodel.QueryBuilderPanels,
		Active:     true,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
	basemodel.Feature{
		Name:       basemodel.QueryBuilderAlerts,
		Active:     true,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
	basemodel.Feature{
		Name:       basemodel.AlertChannelSlack,
		Active:     true,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
	basemodel.Feature{
		Name:       basemodel.AlertChannelWebhook,
		Active:     true,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
	basemodel.Feature{
		Name:       basemodel.AlertChannelPagerduty,
		Active:     true,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
	basemodel.Feature{
		Name:       basemodel.AlertChannelOpsgenie,
		Active:     true,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
	basemodel.Feature{
		Name:       basemodel.AlertChannelEmail,
		Active:     true,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
	basemodel.Feature{
		Name:       basemodel.AlertChannelMsTeams,
		Active:     false,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
	basemodel.Feature{
		Name:       basemodel.UseSpanMetrics,
		Active:     false,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
	basemodel.Feature{
		Name:       Gateway,
		Active:     false,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
	basemodel.Feature{
		Name:       PremiumSupport,
		Active:     false,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
	basemodel.Feature{
		Name:       basemodel.AnomalyDetection,
		Active:     false,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
	basemodel.Feature{
		Name:       basemodel.HostsInfraMonitoring,
		Active:     constants.EnableHostsInfraMonitoring(),
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
}

var ProPlan = basemodel.FeatureSet{
	basemodel.Feature{
		Name:       SSO,
		Active:     true,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
	basemodel.Feature{
		Name:       basemodel.OSS,
		Active:     false,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
	basemodel.Feature{
		Name:       basemodel.SmartTraceDetail,
		Active:     true,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
	basemodel.Feature{
		Name:       basemodel.CustomMetricsFunction,
		Active:     true,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
	basemodel.Feature{
		Name:       basemodel.QueryBuilderPanels,
		Active:     true,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
	basemodel.Feature{
		Name:       basemodel.QueryBuilderAlerts,
		Active:     true,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
	basemodel.Feature{
		Name:       basemodel.AlertChannelSlack,
		Active:     true,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
	basemodel.Feature{
		Name:       basemodel.AlertChannelWebhook,
		Active:     true,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
	basemodel.Feature{
		Name:       basemodel.AlertChannelPagerduty,
		Active:     true,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
	basemodel.Feature{
		Name:       basemodel.AlertChannelOpsgenie,
		Active:     true,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
	basemodel.Feature{
		Name:       basemodel.AlertChannelEmail,
		Active:     true,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
	basemodel.Feature{
		Name:       basemodel.AlertChannelMsTeams,
		Active:     true,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
	basemodel.Feature{
		Name:       basemodel.UseSpanMetrics,
		Active:     false,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
	basemodel.Feature{
		Name:       Gateway,
		Active:     true,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
	basemodel.Feature{
		Name:       PremiumSupport,
		Active:     true,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
	basemodel.Feature{
		Name:       basemodel.AnomalyDetection,
		Active:     true,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
	basemodel.Feature{
		Name:       basemodel.HostsInfraMonitoring,
		Active:     constants.EnableHostsInfraMonitoring(),
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
}

var EnterprisePlan = basemodel.FeatureSet{
	basemodel.Feature{
		Name:       SSO,
		Active:     true,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
	basemodel.Feature{
		Name:       basemodel.OSS,
		Active:     false,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
	basemodel.Feature{
		Name:       basemodel.SmartTraceDetail,
		Active:     true,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
	basemodel.Feature{
		Name:       basemodel.CustomMetricsFunction,
		Active:     true,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
	basemodel.Feature{
		Name:       basemodel.QueryBuilderPanels,
		Active:     true,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
	basemodel.Feature{
		Name:       basemodel.QueryBuilderAlerts,
		Active:     true,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
	basemodel.Feature{
		Name:       basemodel.AlertChannelSlack,
		Active:     true,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
	basemodel.Feature{
		Name:       basemodel.AlertChannelWebhook,
		Active:     true,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
	basemodel.Feature{
		Name:       basemodel.AlertChannelPagerduty,
		Active:     true,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
	basemodel.Feature{
		Name:       basemodel.AlertChannelOpsgenie,
		Active:     true,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
	basemodel.Feature{
		Name:       basemodel.AlertChannelEmail,
		Active:     true,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
	basemodel.Feature{
		Name:       basemodel.AlertChannelMsTeams,
		Active:     true,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
	basemodel.Feature{
		Name:       basemodel.UseSpanMetrics,
		Active:     false,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
	basemodel.Feature{
		Name:       Onboarding,
		Active:     true,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
	basemodel.Feature{
		Name:       ChatSupport,
		Active:     true,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
	basemodel.Feature{
		Name:       Gateway,
		Active:     true,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
	basemodel.Feature{
		Name:       PremiumSupport,
		Active:     true,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
	basemodel.Feature{
		Name:       basemodel.AnomalyDetection,
		Active:     true,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
	basemodel.Feature{
		Name:       basemodel.HostsInfraMonitoring,
		Active:     constants.EnableHostsInfraMonitoring(),
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
}
