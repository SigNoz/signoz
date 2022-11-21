import { AlertDef } from 'types/api/alerts/def';

import { AlertTypes } from './alertTypes';
import { defaultCompareOp, defaultEvalWindow, defaultMatchType } from './def';

export interface Props {
	data: AlertDef;
}

export interface PayloadProps {
	status: string;
	data: string;
}

export const alertDefaults: AlertDef = {
	alertType: AlertTypes.METRICS_BASED_ALERT,
	condition: {
		compositeMetricQuery: {
			builderQueries: {
				A: {
					queryName: 'A',
					name: 'A',
					formulaOnly: false,
					metricName: '',
					tagFilters: {
						op: 'AND',
						items: [],
					},
					groupBy: [],
					aggregateOperator: 1,
					expression: 'A',
					disabled: false,
					toggleDisable: false,
					toggleDelete: false,
				},
			},
			promQueries: {},
			chQueries: {},
			queryType: 1,
		},
		op: defaultCompareOp,
		matchType: defaultMatchType,
	},
	labels: {
		severity: 'warning',
	},
	annotations: {
		description: 'A new alert',
	},
	evalWindow: defaultEvalWindow,
};

export const logAlertDefaults: AlertDef = {
	alertType: AlertTypes.LOGS_BASED_ALERT,
	condition: {
		compositeMetricQuery: {
			builderQueries: {
				A: {
					queryName: 'A',
					name: 'A',
					formulaOnly: false,
					metricName: '',
					tagFilters: {
						op: 'AND',
						items: [],
					},
					groupBy: [],
					aggregateOperator: 1,
					expression: 'A',
					disabled: false,
					toggleDisable: false,
					toggleDelete: false,
				},
			},
			promQueries: {},
			chQueries: {
				A: {
					name: 'A',
					query: `SELECT toDateTime(intDiv(timestamp_ms, \n\t1000)), \n\tvalue \nFROM signoz_metrics.samples_v2 \nWHERE metric_name = 'signoz_calls_total' \nLIMIT 10`,
					rawQuery: `SELECT toDateTime(intDiv(timestamp_ms, \n\t1000)), \n\tvalue \nFROM signoz_metrics.samples_v2 \nWHERE metric_name = 'signoz_calls_total' \nLIMIT 10`,
					legend: '',
					disabled: false,
				},
			},
			queryType: 2,
		},
		op: defaultCompareOp,
		matchType: '4',
	},
	labels: {
		severity: 'warning',
		details: `${window.location.protocol}//${window.location.host}/logs`,
	},
	annotations: {
		description: 'A new log-based alert',
	},
	evalWindow: defaultEvalWindow,
};

export const traceAlertDefaults: AlertDef = {
	alertType: AlertTypes.TRACES_BASED_ALERT,
	condition: {
		compositeMetricQuery: {
			builderQueries: {
				A: {
					queryName: 'A',
					name: 'A',
					formulaOnly: false,
					metricName: '',
					tagFilters: {
						op: 'AND',
						items: [],
					},
					groupBy: [],
					aggregateOperator: 1,
					expression: 'A',
					disabled: false,
					toggleDisable: false,
					toggleDelete: false,
				},
			},
			promQueries: {},
			chQueries: {
				A: {
					name: 'A',
					rawQuery: `SELECT toDateTime(intDiv(timestamp_ms, \n\t1000)), \n\tvalue \nFROM signoz_metrics.samples_v2 \nWHERE metric_name = 'signoz_calls_total' \nLIMIT 10`,
					query: `SELECT toDateTime(intDiv(timestamp_ms, \n\t1000)), \n\tvalue \nFROM signoz_metrics.samples_v2 \nWHERE metric_name = 'signoz_calls_total' \nLIMIT 10`,
					legend: '',
					disabled: false,
				},
			},
			queryType: 2,
		},
		op: defaultCompareOp,
		matchType: '4',
	},
	labels: {
		severity: 'warning',
		details: `${window.location.protocol}//${window.location.host}/traces`,
	},
	annotations: {
		description: 'A new trace-based alert',
	},
	evalWindow: defaultEvalWindow,
};
