package model

import (
	basemodel "go.signoz.io/query-service/model"
)

const SSO = "SSO"
const Pro = "PRO_PLAN"
const Enterprise = "ENTERPRISE_PLAN"

var ProPlan = basemodel.FeatureSet{
	Pro: true,
	SSO: true,
}

var EnterprisePlan = basemodel.FeatureSet{
	Enterprise: true,
	SSO:        true,
}
