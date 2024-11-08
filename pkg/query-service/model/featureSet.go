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
const DisableUpsell = "DISABLE_UPSELL"
const OSS = "OSS"
const QueryBuilderPanels = "QUERY_BUILDER_PANELS"
const QueryBuilderAlerts = "QUERY_BUILDER_ALERTS"
const UseSpanMetrics = "USE_SPAN_METRICS"
const AlertChannelSlack = "ALERT_CHANNEL_SLACK"
const AlertChannelWebhook = "ALERT_CHANNEL_WEBHOOK"
const AlertChannelPagerduty = "ALERT_CHANNEL_PAGERDUTY"
const AlertChannelMsTeams = "ALERT_CHANNEL_MSTEAMS"
const AlertChannelOpsgenie = "ALERT_CHANNEL_OPSGENIE"
const AlertChannelEmail = "ALERT_CHANNEL_EMAIL"
const AnomalyDetection = "ANOMALY_DETECTION"
const HostsInfraMonitoring = "HOSTS_INFRA_MONITORING"

var BasicPlan = FeatureSet{
	Feature{
		Name:       OSS,
		Active:     true,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
	Feature{
		Name:       DisableUpsell,
		Active:     false,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
	Feature{
		Name:       SmartTraceDetail,
		Active:     false,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
	Feature{
		Name:       CustomMetricsFunction,
		Active:     false,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
	Feature{
		Name:       QueryBuilderPanels,
		Active:     true,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
	Feature{
		Name:       QueryBuilderAlerts,
		Active:     true,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
	Feature{
		Name:       UseSpanMetrics,
		Active:     false,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
	Feature{
		Name:       AlertChannelSlack,
		Active:     true,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
	Feature{
		Name:       AlertChannelWebhook,
		Active:     true,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
	Feature{
		Name:       AlertChannelPagerduty,
		Active:     true,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
	Feature{
		Name:       AlertChannelOpsgenie,
		Active:     true,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
	Feature{
		Name:       AlertChannelEmail,
		Active:     true,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
	Feature{
		Name:       AlertChannelMsTeams,
		Active:     false,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
	Feature{
		Name:       AnomalyDetection,
		Active:     false,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
}
