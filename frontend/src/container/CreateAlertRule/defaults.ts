import { ENTITY_VERSION_V4 } from 'constants/app';
import {
	initialQueryBuilderFormValuesMap,
	initialQueryPromQLData,
	PANEL_TYPES,
} from 'constants/queryBuilder';
import { AlertDetectionTypes } from 'container/FormAlertRules';
import { AlertTypes } from 'types/api/alerts/alertTypes';
import {
	AlertDef,
	defaultAlgorithm,
	defaultCompareOp,
	defaultEvalWindow,
	defaultMatchType,
	defaultSeasonality,
} from 'types/api/alerts/def';
import { EQueryType } from 'types/common/dashboard';

const defaultAlertDescription =
	'This alert is fired when the defined metric (current value: {{$value}}) crosses the threshold ({{$threshold}})';
const defaultAlertSummary =
	'The rule threshold is set to {{$threshold}}, and the observed metric value is {{$value}}';

const defaultAnnotations = {
	description: defaultAlertDescription,
	summary: defaultAlertSummary,
};

export const alertDefaults: AlertDef = {
	alertType: AlertTypes.METRICS_BASED_ALERT,
	version: ENTITY_VERSION_V4,
	condition: {
		compositeQuery: {
			builderQueries: {
				A: initialQueryBuilderFormValuesMap.metrics,
			},
			promQueries: { A: initialQueryPromQLData },
			chQueries: {
				A: {
					name: 'A',
					query: ``,
					legend: '',
					disabled: false,
				},
			},
			queryType: EQueryType.QUERY_BUILDER,
			panelType: PANEL_TYPES.TIME_SERIES,
			unit: undefined,
		},
		op: defaultCompareOp,
		matchType: defaultMatchType,
		algorithm: defaultAlgorithm,
		seasonality: defaultSeasonality,
	},
	labels: {
		severity: 'warning',
	},
	annotations: defaultAnnotations,
	evalWindow: defaultEvalWindow,
	alert: '',
};

export const anamolyAlertDefaults: AlertDef = {
	alertType: AlertTypes.METRICS_BASED_ALERT,
	version: ENTITY_VERSION_V4,
	ruleType: AlertDetectionTypes.ANOMALY_DETECTION_ALERT,
	condition: {
		compositeQuery: {
			builderQueries: {
				A: {
					...initialQueryBuilderFormValuesMap.metrics,
					functions: [
						{
							name: 'anomaly',
							args: [],
							namedArgs: { z_score_threshold: 3 },
						},
					],
				},
			},
			promQueries: { A: initialQueryPromQLData },
			chQueries: {
				A: {
					name: 'A',
					query: ``,
					legend: '',
					disabled: false,
				},
			},
			queryType: EQueryType.QUERY_BUILDER,
			panelType: PANEL_TYPES.TIME_SERIES,
			unit: undefined,
		},
		op: defaultCompareOp,
		matchType: defaultMatchType,
		algorithm: defaultAlgorithm,
		seasonality: defaultSeasonality,
		target: 3,
	},
	labels: {
		severity: 'warning',
	},
	annotations: defaultAnnotations,
	evalWindow: defaultEvalWindow,
	alert: '',
};

export const logAlertDefaults: AlertDef = {
	alertType: AlertTypes.LOGS_BASED_ALERT,
	version: ENTITY_VERSION_V4,
	condition: {
		compositeQuery: {
			builderQueries: {
				A: initialQueryBuilderFormValuesMap.logs,
			},
			promQueries: { A: initialQueryPromQLData },
			chQueries: {
				A: {
					name: 'A',
					query: `select \ntoStartOfInterval(fromUnixTimestamp64Nano(timestamp), INTERVAL 30 MINUTE) AS interval, \ntoFloat64(count()) as value \nFROM signoz_logs.distributed_logs_v2  \nWHERE timestamp BETWEEN {{.start_timestamp_nano}} AND {{.end_timestamp_nano}} \nAND ts_bucket_start BETWEEN {{.start_timestamp}} - 1800 AND {{.end_timestamp}} \nGROUP BY interval;\n\n-- Please check docs here https://signoz.io/docs/userguide/logs_clickhouse_queries/\n\n-- available variables:\n-- \t{{.start_timestamp_nano}}\n-- \t{{.end_timestamp_nano}}\n-- \t{{.start_timestamp}}\n-- \t{{.end_timestamp}}\n\n-- required columns (or alias):\n-- \tvalue\n-- \tinterval`,
					legend: '',
					disabled: false,
				},
			},
			queryType: EQueryType.QUERY_BUILDER,
			panelType: PANEL_TYPES.TIME_SERIES,
			unit: undefined,
		},
		op: defaultCompareOp,
		matchType: '4',
	},
	labels: {
		severity: 'warning',
	},
	annotations: defaultAnnotations,
	evalWindow: defaultEvalWindow,
	alert: '',
};

export const traceAlertDefaults: AlertDef = {
	alertType: AlertTypes.TRACES_BASED_ALERT,
	version: ENTITY_VERSION_V4,
	condition: {
		compositeQuery: {
			builderQueries: {
				A: initialQueryBuilderFormValuesMap.traces,
			},
			promQueries: { A: initialQueryPromQLData },
			chQueries: {
				A: {
					name: 'A',
					query: `SELECT \n\ttoStartOfInterval(timestamp, INTERVAL 1 MINUTE) AS interval, \n\tresource_string_service$$name AS \`service.name\`, \n\ttoFloat64(avg(duration_nano)) AS value \nFROM signoz_traces.distributed_signoz_index_v3  \nWHERE resource_string_service$$name !='' \nAND timestamp BETWEEN {{.start_datetime}} AND {{.end_datetime}} \nAND ts_bucket_start BETWEEN {{.start_timestamp}} - 1800 AND {{.end_timestamp}} \nGROUP BY (\`service.name\`, interval);\n\n-- Please check docs here https://signoz.io/docs/userguide/writing-clickhouse-traces-query/\n\n-- available variables:\n-- \t{{.start_datetime}}\n-- \t{{.end_datetime}}\n-- \t{{.start_timestamp}}\n-- \t{{.end_timestamp}}\n\n-- required column alias:\n-- \tvalue\n-- \tinterval`,
					legend: '',
					disabled: false,
				},
			},
			queryType: EQueryType.QUERY_BUILDER,
			panelType: PANEL_TYPES.TIME_SERIES,
			unit: undefined,
		},
		op: defaultCompareOp,
		matchType: '4',
	},
	labels: {
		severity: 'warning',
	},
	annotations: defaultAnnotations,
	evalWindow: defaultEvalWindow,
	alert: '',
};

export const exceptionAlertDefaults: AlertDef = {
	alertType: AlertTypes.EXCEPTIONS_BASED_ALERT,
	version: ENTITY_VERSION_V4,
	condition: {
		compositeQuery: {
			builderQueries: {
				A: initialQueryBuilderFormValuesMap.traces,
			},
			promQueries: { A: initialQueryPromQLData },
			chQueries: {
				A: {
					name: 'A',
					query: `SELECT \n\tcount() as value,\n\ttoStartOfInterval(timestamp, toIntervalMinute(1)) AS interval,\n\tserviceName\nFROM signoz_traces.distributed_signoz_error_index_v2\nWHERE exceptionType !='OSError'\nAND timestamp BETWEEN {{.start_datetime}} AND {{.end_datetime}}\nGROUP BY serviceName, interval;\n\n-- available variables:\n-- \t{{.start_datetime}}\n-- \t{{.end_datetime}}\n\n-- required column alias:\n-- \tvalue\n-- \tinterval`,
					legend: '',
					disabled: false,
				},
			},
			queryType: EQueryType.CLICKHOUSE,
			panelType: PANEL_TYPES.TIME_SERIES,
			unit: undefined,
		},
		op: defaultCompareOp,
		matchType: '4',
	},
	labels: {
		severity: 'warning',
	},
	annotations: defaultAnnotations,
	evalWindow: defaultEvalWindow,
	alert: '',
};

export const ALERTS_VALUES_MAP: Record<AlertTypes, AlertDef> = {
	[AlertTypes.ANOMALY_BASED_ALERT]: anamolyAlertDefaults,
	[AlertTypes.METRICS_BASED_ALERT]: alertDefaults,
	[AlertTypes.LOGS_BASED_ALERT]: logAlertDefaults,
	[AlertTypes.TRACES_BASED_ALERT]: traceAlertDefaults,
	[AlertTypes.EXCEPTIONS_BASED_ALERT]: exceptionAlertDefaults,
};
