import { ENTITY_VERSION_V4 } from 'constants/app';
import {
	initialQueryBuilderFormValuesMap,
	initialQueryPromQLData,
	PANEL_TYPES,
} from 'constants/queryBuilder';
import { AlertTypes } from 'types/api/alerts/alertTypes';
import {
	AlertDef,
	defaultCompareOp,
	defaultEvalWindow,
	defaultMatchType,
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
	},
	labels: {
		severity: 'warning',
	},
	annotations: defaultAnnotations,
	evalWindow: defaultEvalWindow,
};

export const logAlertDefaults: AlertDef = {
	alertType: AlertTypes.LOGS_BASED_ALERT,
	condition: {
		compositeQuery: {
			builderQueries: {
				A: initialQueryBuilderFormValuesMap.logs,
			},
			promQueries: { A: initialQueryPromQLData },
			chQueries: {
				A: {
					name: 'A',
					query: `select \ntoStartOfInterval(fromUnixTimestamp64Nano(timestamp), INTERVAL 30 MINUTE) AS interval, \ntoFloat64(count()) as value \nFROM signoz_logs.distributed_logs_v2  \nWHERE timestamp BETWEEN {{.start_timestamp_nano}} AND {{.end_timestamp_nano}}  \nGROUP BY interval;\n\n-- available variables:\n-- \t{{.start_timestamp_nano}}\n-- \t{{.end_timestamp_nano}}\n\n-- required columns (or alias):\n-- \tvalue\n-- \tinterval`,
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
};

export const traceAlertDefaults: AlertDef = {
	alertType: AlertTypes.TRACES_BASED_ALERT,
	condition: {
		compositeQuery: {
			builderQueries: {
				A: initialQueryBuilderFormValuesMap.traces,
			},
			promQueries: { A: initialQueryPromQLData },
			chQueries: {
				A: {
					name: 'A',
					query: `SELECT \n\ttoStartOfInterval(timestamp, INTERVAL 1 MINUTE) AS interval, \n\tstringTagMap['peer.service'] AS op_name, \n\ttoFloat64(avg(durationNano)) AS value \nFROM signoz_traces.distributed_signoz_index_v2  \nWHERE stringTagMap['peer.service']!='' \nAND timestamp BETWEEN {{.start_datetime}} AND {{.end_datetime}} \nGROUP BY (op_name, interval);\n\n-- available variables:\n-- \t{{.start_datetime}}\n-- \t{{.end_datetime}}\n\n-- required column alias:\n-- \tvalue\n-- \tinterval`,
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
};

export const exceptionAlertDefaults: AlertDef = {
	alertType: AlertTypes.EXCEPTIONS_BASED_ALERT,
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
};

export const ALERTS_VALUES_MAP: Record<AlertTypes, AlertDef> = {
	[AlertTypes.METRICS_BASED_ALERT]: alertDefaults,
	[AlertTypes.LOGS_BASED_ALERT]: logAlertDefaults,
	[AlertTypes.TRACES_BASED_ALERT]: traceAlertDefaults,
	[AlertTypes.EXCEPTIONS_BASED_ALERT]: exceptionAlertDefaults,
};
