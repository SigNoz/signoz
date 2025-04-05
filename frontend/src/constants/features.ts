// keep this consistent with backend constants.go
export enum FeatureKeys {
	SSO = 'SSO',
	ENTERPRISE_PLAN = 'ENTERPRISE_PLAN',
	BASIC_PLAN = 'BASIC_PLAN',
	ALERT_CHANNEL_SLACK = 'ALERT_CHANNEL_SLACK',
	ALERT_CHANNEL_WEBHOOK = 'ALERT_CHANNEL_WEBHOOK',
	ALERT_CHANNEL_PAGERDUTY = 'ALERT_CHANNEL_PAGERDUTY',
	ALERT_CHANNEL_OPSGENIE = 'ALERT_CHANNEL_OPSGENIE',
	ALERT_CHANNEL_MSTEAMS = 'ALERT_CHANNEL_MSTEAMS',
	CUSTOM_METRICS_FUNCTION = 'CUSTOM_METRICS_FUNCTION',
	QUERY_BUILDER_PANELS = 'QUERY_BUILDER_PANELS',
	QUERY_BUILDER_ALERTS = 'QUERY_BUILDER_ALERTS',
	DISABLE_UPSELL = 'DISABLE_UPSELL',
	USE_SPAN_METRICS = 'USE_SPAN_METRICS',
	OSS = 'OSS',
	ONBOARDING = 'ONBOARDING',
	CHAT_SUPPORT = 'CHAT_SUPPORT',
	GATEWAY = 'GATEWAY',
	PREMIUM_SUPPORT = 'PREMIUM_SUPPORT',
	QUERY_BUILDER_SEARCH_V2 = 'QUERY_BUILDER_SEARCH_V2',
	ANOMALY_DETECTION = 'ANOMALY_DETECTION',
	AWS_INTEGRATION = 'AWS_INTEGRATION',
	ONBOARDING_V3 = 'ONBOARDING_V3',
	THIRD_PARTY_API = 'THIRD_PARTY_API',
	TRACE_FUNNELS = 'TRACE_FUNNELS',
}
