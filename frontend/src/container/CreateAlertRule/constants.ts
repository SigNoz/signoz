import { AlertTypes } from 'types/api/alerts/alertTypes';

// since we don't have a card in alert creation for anomaly based alert

export const ALERT_TYPE_URL_MAP: Record<
	AlertTypes,
	{ selection: string; creation: string }
> = {
	[AlertTypes.METRICS_BASED_ALERT]: {
		selection:
			'https://signoz.io/docs/alerts-management/metrics-based-alerts/?utm_source=product&utm_medium=alert-source-selection-page#examples',
		creation:
			'https://signoz.io/docs/alerts-management/metrics-based-alerts/?utm_source=product&utm_medium=alert-creation-page',
	},
	[AlertTypes.LOGS_BASED_ALERT]: {
		selection:
			'https://signoz.io/docs/alerts-management/log-based-alerts/?utm_source=product&utm_medium=alert-source-selection-page#examples',
		creation:
			'https://signoz.io/docs/alerts-management/log-based-alerts/?utm_source=product&utm_medium=alert-creation-page',
	},
	[AlertTypes.TRACES_BASED_ALERT]: {
		selection:
			'https://signoz.io/docs/alerts-management/trace-based-alerts/?utm_source=product&utm_medium=alert-source-selection-page#examples',
		creation:
			'https://signoz.io/docs/alerts-management/trace-based-alerts/?utm_source=product&utm_medium=alert-creation-page',
	},
	[AlertTypes.EXCEPTIONS_BASED_ALERT]: {
		selection:
			'https://signoz.io/docs/alerts-management/exceptions-based-alerts/?utm_source=product&utm_medium=alert-source-selection-page#examples',
		creation:
			'https://signoz.io/docs/alerts-management/exceptions-based-alerts/?utm_source=product&utm_medium=alert-creation-page',
	},
	[AlertTypes.ANOMALY_BASED_ALERT]: {
		selection:
			'https://signoz.io/docs/alerts-management/anomaly-based-alerts/?utm_source=product&utm_medium=alert-source-selection-page#examples',
		creation:
			'https://signoz.io/docs/alerts-management/anomaly-based-alerts/?utm_source=product&utm_medium=alert-creation-page',
	},
};

export const ALERT_TYPE_TO_TITLE: Record<AlertTypes, string> = {
	[AlertTypes.METRICS_BASED_ALERT]: 'metric_based_alert',
	[AlertTypes.LOGS_BASED_ALERT]: 'log_based_alert',
	[AlertTypes.TRACES_BASED_ALERT]: 'traces_based_alert',
	[AlertTypes.EXCEPTIONS_BASED_ALERT]: 'exceptions_based_alert',
	[AlertTypes.ANOMALY_BASED_ALERT]: 'anomaly_based_alert',
};
