import {
	initialQueryBuilderFormValues,
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
import {
	DataSource,
	LogsAggregatorOperator,
	TracesAggregatorOperator,
} from 'types/common/queryBuilder';

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
	condition: {
		compositeQuery: {
			builderQueries: {
				A: {
					...initialQueryBuilderFormValues,
				},
			},
			promQueries: {},
			chQueries: {},
			queryType: EQueryType.QUERY_BUILDER,
			panelType: PANEL_TYPES.TIME_SERIES,
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
				A: {
					...initialQueryBuilderFormValues,
					aggregateOperator: LogsAggregatorOperator.COUNT,
					dataSource: DataSource.LOGS,
				},
			},
			promQueries: {},
			chQueries: {
				A: {
					name: 'A',
					query: `select \ntoStartOfInterval(fromUnixTimestamp64Nano(timestamp), INTERVAL 30 MINUTE) AS interval, \ntoFloat64(count()) as value \nFROM signoz_logs.distributed_logs  \nWHERE timestamp BETWEEN {{.start_timestamp_nano}} AND {{.end_timestamp_nano}}  \nGROUP BY interval;\n\n-- available variables:\n-- \t{{.start_timestamp_nano}}\n-- \t{{.end_timestamp_nano}}\n\n-- required columns (or alias):\n-- \tvalue\n-- \tinterval`,
					rawQuery: `select \ntoStartOfInterval(fromUnixTimestamp64Nano(timestamp), INTERVAL 30 MINUTE) AS interval, \ntoFloat64(count()) as value \nFROM signoz_logs.distributed_logs  \nWHERE timestamp BETWEEN {{.start_timestamp_nano}} AND {{.end_timestamp_nano}}  \nGROUP BY interval;\n\n-- available variables:\n-- \t{{.start_timestamp_nano}}\n-- \t{{.end_timestamp_nano}}\n\n-- required columns (or alias):\n-- \tvalue\n-- \tinterval`,
					legend: '',
					disabled: false,
				},
			},
			queryType: EQueryType.CLICKHOUSE,
			panelType: PANEL_TYPES.TIME_SERIES,
		},
		op: defaultCompareOp,
		matchType: '4',
	},
	labels: {
		severity: 'warning',
		details: `${window.location.protocol}//${window.location.host}/logs`,
	},
	annotations: defaultAnnotations,
	evalWindow: defaultEvalWindow,
};

export const traceAlertDefaults: AlertDef = {
	alertType: AlertTypes.TRACES_BASED_ALERT,
	condition: {
		compositeQuery: {
			builderQueries: {
				A: {
					...initialQueryBuilderFormValues,
					aggregateOperator: TracesAggregatorOperator.COUNT,
					dataSource: DataSource.TRACES,
				},
			},
			promQueries: {},
			chQueries: {
				A: {
					name: 'A',
					rawQuery: `SELECT \n\ttoStartOfInterval(timestamp, INTERVAL 1 MINUTE) AS interval, \n\ttagMap['peer.service'] AS op_name, \n\ttoFloat64(avg(durationNano)) AS value \nFROM signoz_traces.distributed_signoz_index_v2  \nWHERE tagMap['peer.service']!='' \nAND timestamp BETWEEN {{.start_datetime}} AND {{.end_datetime}} \nGROUP BY (op_name, interval);\n\n-- available variables:\n-- \t{{.start_datetime}}\n-- \t{{.end_datetime}}\n\n-- required column alias:\n-- \tvalue\n-- \tinterval`,
					query: `SELECT \n\ttoStartOfInterval(timestamp, INTERVAL 1 MINUTE) AS interval, \n\ttagMap['peer.service'] AS op_name, \n\ttoFloat64(avg(durationNano)) AS value \nFROM signoz_traces.distributed_signoz_index_v2  \nWHERE tagMap['peer.service']!='' \nAND timestamp BETWEEN {{.start_datetime}} AND {{.end_datetime}} \nGROUP BY (op_name, interval);\n\n-- available variables:\n-- \t{{.start_datetime}}\n-- \t{{.end_datetime}}\n\n-- required column alias:\n-- \tvalue\n-- \tinterval`,
					legend: '',
					disabled: false,
				},
			},
			queryType: EQueryType.CLICKHOUSE,
			panelType: PANEL_TYPES.TIME_SERIES,
		},
		op: defaultCompareOp,
		matchType: '4',
	},
	labels: {
		severity: 'warning',
		details: `${window.location.protocol}//${window.location.host}/traces`,
	},
	annotations: defaultAnnotations,
	evalWindow: defaultEvalWindow,
};

export const exceptionAlertDefaults: AlertDef = {
	alertType: AlertTypes.EXCEPTIONS_BASED_ALERT,
	condition: {
		compositeQuery: {
			builderQueries: {
				A: {
					...initialQueryBuilderFormValues,
					aggregateOperator: TracesAggregatorOperator.COUNT,
					dataSource: DataSource.TRACES,
				},
			},
			promQueries: {},
			chQueries: {
				A: {
					name: 'A',
					rawQuery: `SELECT \n\tcount() as value,\n\ttoStartOfInterval(timestamp, toIntervalMinute(1)) AS interval,\n\tserviceName\nFROM signoz_traces.distributed_signoz_error_index_v2\nWHERE exceptionType !='OSError'\nAND timestamp BETWEEN {{.start_datetime}} AND {{.end_datetime}}\nGROUP BY serviceName, interval;\n\n-- available variables:\n-- \t{{.start_datetime}}\n-- \t{{.end_datetime}}\n\n-- required column alias:\n-- \tvalue\n-- \tinterval`,
					query: `SELECT \n\tcount() as value,\n\ttoStartOfInterval(timestamp, toIntervalMinute(1)) AS interval,\n\tserviceName\nFROM signoz_traces.distributed_signoz_error_index_v2\nWHERE exceptionType !='OSError'\nAND timestamp BETWEEN {{.start_datetime}} AND {{.end_datetime}}\nGROUP BY serviceName, interval;\n\n-- available variables:\n-- \t{{.start_datetime}}\n-- \t{{.end_datetime}}\n\n-- required column alias:\n-- \tvalue\n-- \tinterval`,
					legend: '',
					disabled: false,
				},
			},
			queryType: EQueryType.CLICKHOUSE,
			panelType: PANEL_TYPES.TIME_SERIES,
		},
		op: defaultCompareOp,
		matchType: '4',
	},
	labels: {
		severity: 'warning',
		details: `${window.location.protocol}//${window.location.host}/exceptions`,
	},
	annotations: defaultAnnotations,
	evalWindow: defaultEvalWindow,
};
