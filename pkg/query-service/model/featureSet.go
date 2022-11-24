package model

type FeatureSet map[string]bool

const Basic = "BASIC_PLAN"
const SmartTraceDetail = "SMART_TRACE_DETAIL"
const CustomMetricsFunction = "CUSTOM_METRICS_FUNCTION"

var BasicPlan = FeatureSet{
	Basic: true,
}
