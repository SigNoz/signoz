export const REACT_QUERY_KEY = {
	GET_ALL_LICENCES: 'GET_ALL_LICENCES',
	GET_QUERY_RANGE: 'GET_QUERY_RANGE',
	GET_ALL_DASHBOARDS: 'GET_ALL_DASHBOARDS',
	GET_TRIGGERED_ALERTS: 'GET_TRIGGERED_ALERTS',
	DASHBOARD_BY_ID: 'DASHBOARD_BY_ID',
	GET_BILLING_USAGE: 'GET_BILLING_USAGE',
	GET_FEATURES_FLAGS: 'GET_FEATURES_FLAGS',
	DELETE_DASHBOARD: 'DELETE_DASHBOARD',
	LOGS_PIPELINE_PREVIEW: 'LOGS_PIPELINE_PREVIEW',
	ALERT_RULE_DETAILS: 'ALERT_RULE_DETAILS',
	ALERT_RULE_STATS: 'ALERT_RULE_STATS',
	ALERT_RULE_TOP_CONTRIBUTORS: 'ALERT_RULE_TOP_CONTRIBUTORS',
	ALERT_RULE_TIMELINE_TABLE: 'ALERT_RULE_TIMELINE_TABLE',
	ALERT_RULE_TIMELINE_GRAPH: 'ALERT_RULE_TIMELINE_GRAPH',
	GET_CONSUMER_LAG_DETAILS: 'GET_CONSUMER_LAG_DETAILS',
	TOGGLE_ALERT_STATE: 'TOGGLE_ALERT_STATE',
	GET_ALL_ALLERTS: 'GET_ALL_ALLERTS',
	REMOVE_ALERT_RULE: 'REMOVE_ALERT_RULE',
	DUPLICATE_ALERT_RULE: 'DUPLICATE_ALERT_RULE',
	GET_HOST_LIST: 'GET_HOST_LIST',
	UPDATE_ALERT_RULE: 'UPDATE_ALERT_RULE',
	GET_ACTIVE_LICENSE_V3: 'GET_ACTIVE_LICENSE_V3',
	GET_TRACE_V2_WATERFALL: 'GET_TRACE_V2_WATERFALL',
	GET_TRACE_V2_FLAMEGRAPH: 'GET_TRACE_V2_FLAMEGRAPH',
	GET_POD_LIST: 'GET_POD_LIST',
	GET_NODE_LIST: 'GET_NODE_LIST',
	GET_DEPLOYMENT_LIST: 'GET_DEPLOYMENT_LIST',
	GET_CLUSTER_LIST: 'GET_CLUSTER_LIST',
	GET_NAMESPACE_LIST: 'GET_NAMESPACE_LIST',
	GET_STATEFULSET_LIST: 'GET_STATEFULSET_LIST',
	GET_JOB_LIST: 'GET_JOB_LIST',
	GET_DAEMONSET_LIST: 'GET_DAEMONSET_LIST,',
	GET_VOLUME_LIST: 'GET_VOLUME_LIST',

	// AWS Integration Query Keys
	AWS_ACCOUNTS: 'AWS_ACCOUNTS',
	AWS_SERVICES: 'AWS_SERVICES',
	AWS_SERVICE_DETAILS: 'AWS_SERVICE_DETAILS',
	AWS_ACCOUNT_STATUS: 'AWS_ACCOUNT_STATUS',
	AWS_UPDATE_ACCOUNT_CONFIG: 'AWS_UPDATE_ACCOUNT_CONFIG',
	AWS_UPDATE_SERVICE_CONFIG: 'AWS_UPDATE_SERVICE_CONFIG',
	AWS_GENERATE_CONNECTION_URL: 'AWS_GENERATE_CONNECTION_URL',
	AWS_GET_CONNECTION_PARAMS: 'AWS_GET_CONNECTION_PARAMS',
	GET_ATTRIBUTE_VALUES: 'GET_ATTRIBUTE_VALUES',

	// Metrics Explorer Query Keys
	GET_METRICS_LIST: 'GET_METRICS_LIST',
	GET_METRICS_TREE_MAP: 'GET_METRICS_TREE_MAP',
	GET_METRICS_LIST_FILTER_KEYS: 'GET_METRICS_LIST_FILTER_KEYS',
	GET_METRICS_LIST_FILTER_VALUES: 'GET_METRICS_LIST_FILTER_VALUES',
	GET_METRIC_DETAILS: 'GET_METRIC_DETAILS',
	GET_RELATED_METRICS: 'GET_RELATED_METRICS',

	// Traces Funnels Query Keys
	GET_DOMAINS_LIST: 'GET_DOMAINS_LIST',
	GET_ENDPOINTS_LIST_BY_DOMAIN: 'GET_ENDPOINTS_LIST_BY_DOMAIN',
	GET_NESTED_ENDPOINTS_LIST: 'GET_NESTED_ENDPOINTS_LIST',
	GET_ENDPOINT_METRICS_DATA: 'GET_ENDPOINT_METRICS_DATA',
	GET_ENDPOINT_STATUS_CODE_DATA: 'GET_ENDPOINT_STATUS_CODE_DATA',
	GET_ENDPOINT_RATE_OVER_TIME_DATA: 'GET_ENDPOINT_RATE_OVER_TIME_DATA',
	GET_ENDPOINT_LATENCY_OVER_TIME_DATA: 'GET_ENDPOINT_LATENCY_OVER_TIME_DATA',
	GET_ENDPOINT_DROPDOWN_DATA: 'GET_ENDPOINT_DROPDOWN_DATA',
	GET_ENDPOINT_DEPENDENT_SERVICES_DATA: 'GET_ENDPOINT_DEPENDENT_SERVICES_DATA',
	GET_ENDPOINT_STATUS_CODE_BAR_CHARTS_DATA:
		'GET_ENDPOINT_STATUS_CODE_BAR_CHARTS_DATA',
	GET_ENDPOINT_STATUS_CODE_LATENCY_BAR_CHARTS_DATA:
		'GET_ENDPOINT_STATUS_CODE_LATENCY_BAR_CHARTS_DATA',
	GET_FUNNELS_LIST: 'GET_FUNNELS_LIST',
	GET_FUNNEL_DETAILS: 'GET_FUNNEL_DETAILS',
	UPDATE_FUNNEL_STEPS: 'UPDATE_FUNNEL_STEPS',
	VALIDATE_FUNNEL_STEPS: 'VALIDATE_FUNNEL_STEPS',
	UPDATE_FUNNEL_STEP_DETAILS: 'UPDATE_FUNNEL_STEP_DETAILS',
	GET_FUNNEL_OVERVIEW: 'GET_FUNNEL_OVERVIEW',
} as const;
