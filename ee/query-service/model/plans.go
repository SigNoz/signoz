package model

import (
	basemodel "github.com/SigNoz/signoz/pkg/query-service/model"
)

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

var BasicPlan = basemodel.FeatureSet{
	basemodel.Feature{
		Name:       SSO,
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
		Name:       basemodel.TraceFunnels,
		Active:     false,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
	basemodel.Feature{
		Name:       basemodel.ThirdPartyApi,
		Active:     true,
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
		Name:       basemodel.TraceFunnels,
		Active:     false,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
	basemodel.Feature{
		Name:       basemodel.ThirdPartyApi,
		Active:     true,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
}
