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
	Basic:         true,
	SSO:           false,
	DisableUpsell: false,
}

var ProPlan = basemodel.FeatureSet{
	Pro:                             true,
	SSO:                             true,
	basemodel.SmartTraceDetail:      true,
	basemodel.CustomMetricsFunction: true,
}

var EnterprisePlan = basemodel.FeatureSet{
	Enterprise:                      true,
	SSO:                             true,
	basemodel.SmartTraceDetail:      true,
	basemodel.CustomMetricsFunction: true,
}
