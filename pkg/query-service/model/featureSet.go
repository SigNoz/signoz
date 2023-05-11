package model

type FeatureSet map[string]bool

const Basic = "BASIC_PLAN"
const SmartTraceDetail = "SMART_TRACE_DETAIL"
const CustomMetricsFunction = "CUSTOM_METRICS_FUNCTION"
const AlertChannelSlack = "ALERT_CHANNEL_SLACK"
const AlertChannelWebhook = "ALERT_CHANNEL_WEBHOOK"
const AlertChannelPagerduty = "ALERT_CHANNEL_PAGERDUTY"
const AlertChannelMsTeams = "ALERT_CHANNEL_MSTEAMS"

var BasicPlan = FeatureSet{
	Basic:                 true,
	AlertChannelSlack:     true,
	AlertChannelWebhook:   true,
	AlertChannelPagerduty: true,
	AlertChannelMsTeams:   false,
}
