package model

type FeatureSet []Feature
type Feature struct {
	Name       string `db:"name" json:"name"`
	Active     bool   `db:"active" json:"active"`
	Usage      int64  `db:"usage" json:"usage"`
	UsageLimit int64  `db:"usage_limit" json:"usage_limit"`
	Route      string `db:"route" json:"route"`
}

const SmartTraceDetail = "SMART_TRACE_DETAIL"
const CustomMetricsFunction = "CUSTOM_METRICS_FUNCTION"
const OSS = "OSS"
const QueryBuilderPanels = "QUERY_BUILDER_PANELS"
const QueryBuilderAlerts = "QUERY_BUILDER_ALERTS"