package model

import (
	basemodel "go.signoz.io/signoz/pkg/query-service/model"
)

const SSO = "SSO"
const Basic = "BASIC_PLAN"
const Pro = "PRO_PLAN"
const Enterprise = "ENTERPRISE_PLAN"
const DisableUpsell = "DISABLE_UPSELL"

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
		UsageLimit: 5,
		Route:      "",
	},
	basemodel.Feature{
		Name:       basemodel.QueryBuilderAlerts,
		Active:     true,
		Usage:      0,
		UsageLimit: 5,
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
}
