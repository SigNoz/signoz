import { AlertTypes } from 'types/api/alerts/alertTypes';
import {
	AlertDef,
	defaultCompareOp,
	defaultEvalWindow,
	defaultMatchType,
} from 'types/api/alerts/def';

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
					query: `SELECT 1 AS value, now() AS interval \nFROM system.one\n\n-- reserved variables:\n-- \t{{.start_datetime}}\n-- \t{{.end_datetime}}\n-- \t{{.start_unix_ts}}\n-- \t{{.end_unix_ts}}\n-- required columns (or alias):\n-- \tvalue\n-- \tinterval`,
					rawQuery: `SELECT 1 AS value, now() AS interval \nFROM system.one\n\n-- reserved variables:\n-- \t{{.start_datetime}}\n-- \t{{.end_datetime}}\n-- \t{{.start_unix_ts}}\n-- \t{{.end_unix_ts}}\n-- required columns (or alias):\n-- \tvalue\n-- \tinterval`,
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
					rawQuery: `SELECT \n\tcount() as value,\n\ttoStartOfInterval(timestamp, toIntervalMinute(1)) AS interval,\n\tserviceName\nFROM signoz_traces.signoz_error_index_v2\nWHERE exceptionType !='OSError'\nAND timestamp BETWEEN {{.start_datetime}} AND {{.end_datetime}}\nGROUP BY serviceName, interval;\n\n-- reserved variables:\n-- \t{{.start_datetime}}\n-- \t{{.end_datetime}}\n-- \t{{.start_unix_ts}}\n-- \t{{.end_unix_ts}}\n-- required column alias:\n-- \tvalue\n-- \tinterval`,
					query: `SELECT \n\tcount() as value,\n\ttoStartOfInterval(timestamp, toIntervalMinute(1)) AS interval,\n\tserviceName\nFROM signoz_traces.signoz_error_index_v2\nWHERE exceptionType !='OSError'\nAND timestamp BETWEEN {{.start_datetime}} AND {{.end_datetime}}\nGROUP BY serviceName, interval;\n\n-- reserved variables:\n-- \t{{.start_datetime}}\n-- \t{{.end_datetime}}\n-- \t{{.start_unix_ts}}\n-- \t{{.end_unix_ts}}\n-- required column alias:\n-- \tvalue\n-- \tinterval`,
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
