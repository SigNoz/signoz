// keep this consistent with backend plan.go
export enum FeatureKeys {
	SSO = 'sso',
	USE_SPAN_METRICS = 'use_span_metrics',
	ONBOARDING = 'onboarding',
	CHAT_SUPPORT = 'chat_support',
	GATEWAY = 'gateway',
	PREMIUM_SUPPORT = 'premium_support',
	ANOMALY_DETECTION = 'anomaly_detection',
	DOT_METRICS_ENABLED = 'dot_metrics_enabled',
	USE_JSON_BODY = 'use_json_body',
	USE_FINE_GRAINED_AUTHZ = 'use_fine_grained_authz',
	USE_DASHBOARD_V2 = 'use_dashboard_v2',
	ENABLE_AI_OBSERVABILITY = 'enable_ai_observability',
	ENABLE_METRICS_REDUCTION = 'enable_metrics_reduction',
}
