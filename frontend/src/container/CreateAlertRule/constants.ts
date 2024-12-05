import { AlertTypes } from 'types/api/alerts/alertTypes';

export const ALERT_TYPE_URL_MAP: Record<
	AlertTypes,
	{ selection: string; creation: string }
> = {
	[AlertTypes.METRICS_BASED_ALERT]: {
		selection:
			'https://signoz.io/docs/alerts-management/metrics-based-alerts/?utm_source=product&utm_medium=alert-source-selection-page#examples',
		creation:
			'https://signoz.io/docs/alerts-management/metrics-based-alerts/?utm_source=product&utm_medium=alert-creation-page#examples',
	},
	[AlertTypes.LOGS_BASED_ALERT]: {
		selection:
			'https://signoz.io/docs/alerts-management/log-based-alerts/?utm_source=product&utm_medium=alert-source-selection-page#examples',
		creation:
			'https://signoz.io/docs/alerts-management/log-based-alerts/?utm_source=product&utm_medium=alert-creation-page#examples',
	},
	[AlertTypes.TRACES_BASED_ALERT]: {
		selection:
			'https://signoz.io/docs/alerts-management/trace-based-alerts/?utm_source=product&utm_medium=alert-source-selection-page#examples',
		creation:
			'https://signoz.io/docs/alerts-management/trace-based-alerts/?utm_source=product&utm_medium=alert-creation-page#examples',
	},
	[AlertTypes.EXCEPTIONS_BASED_ALERT]: {
		selection:
			'https://signoz.io/docs/alerts-management/exceptions-based-alerts/?utm_source=product&utm_medium=alert-source-selection-page#examples',
		creation:
			'https://signoz.io/docs/alerts-management/exceptions-based-alerts/?utm_source=product&utm_medium=alert-creation-page#examples',
	},
};

export const ALERT_TYPE_TO_TITLE: Record<AlertTypes, string> = {
	[AlertTypes.METRICS_BASED_ALERT]: 'metric_based_alert',
	[AlertTypes.LOGS_BASED_ALERT]: 'log_based_alert',
	[AlertTypes.TRACES_BASED_ALERT]: 'traces_based_alert',
	[AlertTypes.EXCEPTIONS_BASED_ALERT]: 'exceptions_based_alert',
};
