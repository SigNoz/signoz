import {
	LogsAggregatorOperator,
	MetricAggregateOperator,
	TracesAggregatorOperator,
} from 'types/common/queryBuilder';
import { SelectOption } from 'types/common/select';

export const metricAggregateOperatorOptions: SelectOption<string, string>[] = [
	{
		value: MetricAggregateOperator.NOOP,
		label: 'NOOP',
	},
	{
		value: MetricAggregateOperator.COUNT,
		label: 'Count',
	},
	{
		value: MetricAggregateOperator.COUNT_DISTINCT,
		// eslint-disable-next-line sonarjs/no-duplicate-string
		label: 'Count Distinct',
	},
	{
		value: MetricAggregateOperator.SUM,
		label: 'Sum',
	},
	{
		value: MetricAggregateOperator.AVG,
		label: 'Avg',
	},
	{
		value: MetricAggregateOperator.MAX,
		label: 'Max',
	},
	{
		value: MetricAggregateOperator.MIN,
		label: 'Min',
	},
	{
		value: MetricAggregateOperator.P05,
		label: 'P05',
	},
	{
		value: MetricAggregateOperator.P10,
		label: 'P10',
	},
	{
		value: MetricAggregateOperator.P20,
		label: 'P20',
	},
	{
		value: MetricAggregateOperator.P25,
		label: 'P25',
	},
	{
		value: MetricAggregateOperator.P50,
		label: 'P50',
	},
	{
		value: MetricAggregateOperator.P75,
		label: 'P75',
	},
	{
		value: MetricAggregateOperator.P90,
		label: 'P90',
	},
	{
		value: MetricAggregateOperator.P95,
		label: 'P95',
	},
	{
		value: MetricAggregateOperator.P99,
		label: 'P99',
	},
	{
		value: MetricAggregateOperator.RATE,
		label: 'Rate',
	},
	{
		value: MetricAggregateOperator.SUM_RATE,
		label: 'Sum_rate',
	},
	{
		value: MetricAggregateOperator.AVG_RATE,
		label: 'Avg_rate',
	},
	{
		value: MetricAggregateOperator.MAX_RATE,
		label: 'Max_rate',
	},
	{
		value: MetricAggregateOperator.MIN_RATE,
		label: 'Min_rate',
	},
	{
		value: MetricAggregateOperator.RATE_SUM,
		label: 'Rate_sum',
	},
	{
		value: MetricAggregateOperator.RATE_AVG,
		label: 'Rate_avg',
	},
	{
		value: MetricAggregateOperator.RATE_MIN,
		label: 'Rate_min',
	},
	{
		value: MetricAggregateOperator.RATE_MAX,
		label: 'Rate_max',
	},
	{
		value: MetricAggregateOperator.HIST_QUANTILE_50,
		label: 'Hist_quantile_50',
	},
	{
		value: MetricAggregateOperator.HIST_QUANTILE_75,
		label: 'Hist_quantile_75',
	},
	{
		value: MetricAggregateOperator.HIST_QUANTILE_90,
		label: 'Hist_quantile_90',
	},
	{
		value: MetricAggregateOperator.HIST_QUANTILE_95,
		label: 'Hist_quantile_95',
	},
	{
		value: MetricAggregateOperator.HIST_QUANTILE_99,
		label: 'Hist_quantile_99',
	},
];

export const tracesAggregateOperatorOptions: SelectOption<string, string>[] = [
	{
		value: TracesAggregatorOperator.NOOP,
		label: 'NOOP',
	},
	{
		value: TracesAggregatorOperator.COUNT,
		label: 'Count',
	},
	{
		value: TracesAggregatorOperator.COUNT_DISTINCT,
		label: 'Count Distinct',
	},
	{
		value: TracesAggregatorOperator.SUM,
		label: 'Sum',
	},
	{
		value: TracesAggregatorOperator.AVG,
		label: 'Avg',
	},
	{
		value: TracesAggregatorOperator.MAX,
		label: 'Max',
	},
	{
		value: TracesAggregatorOperator.MIN,
		label: 'Min',
	},
	{
		value: TracesAggregatorOperator.P05,
		label: 'P05',
	},
	{
		value: TracesAggregatorOperator.P10,
		label: 'P10',
	},
	{
		value: TracesAggregatorOperator.P20,
		label: 'P20',
	},
	{
		value: TracesAggregatorOperator.P25,
		label: 'P25',
	},
	{
		value: TracesAggregatorOperator.P50,
		label: 'P50',
	},
	{
		value: TracesAggregatorOperator.P75,
		label: 'P75',
	},
	{
		value: TracesAggregatorOperator.P90,
		label: 'P90',
	},
	{
		value: TracesAggregatorOperator.P95,
		label: 'P95',
	},
	{
		value: TracesAggregatorOperator.P99,
		label: 'P99',
	},
	{
		value: TracesAggregatorOperator.RATE,
		label: 'Rate',
	},
	{
		value: TracesAggregatorOperator.RATE_SUM,
		label: 'Rate_sum',
	},
	{
		value: TracesAggregatorOperator.RATE_AVG,
		label: 'Rate_avg',
	},
	{
		value: TracesAggregatorOperator.RATE_MIN,
		label: 'Rate_min',
	},
	{
		value: TracesAggregatorOperator.RATE_MAX,
		label: 'Rate_max',
	},
];

export const logsAggregateOperatorOptions: SelectOption<string, string>[] = [
	{
		value: LogsAggregatorOperator.NOOP,
		label: 'NOOP',
	},
	{
		value: LogsAggregatorOperator.COUNT,
		label: 'Count',
	},
	{
		value: LogsAggregatorOperator.COUNT_DISTINCT,
		label: 'Count Distinct',
	},
	{
		value: LogsAggregatorOperator.SUM,
		label: 'Sum',
	},
	{
		value: LogsAggregatorOperator.AVG,
		label: 'Avg',
	},
	{
		value: LogsAggregatorOperator.MAX,
		label: 'Max',
	},
	{
		value: LogsAggregatorOperator.MIN,
		label: 'Min',
	},
	{
		value: LogsAggregatorOperator.P05,
		label: 'P05',
	},
	{
		value: LogsAggregatorOperator.P10,
		label: 'P10',
	},
	{
		value: LogsAggregatorOperator.P20,
		label: 'P20',
	},
	{
		value: LogsAggregatorOperator.P25,
		label: 'P25',
	},
	{
		value: LogsAggregatorOperator.P50,
		label: 'P50',
	},
	{
		value: LogsAggregatorOperator.P75,
		label: 'P75',
	},
	{
		value: LogsAggregatorOperator.P90,
		label: 'P90',
	},
	{
		value: LogsAggregatorOperator.P95,
		label: 'P95',
	},
	{
		value: LogsAggregatorOperator.P99,
		label: 'P99',
	},
	{
		value: LogsAggregatorOperator.RATE,
		label: 'Rate',
	},
	{
		value: LogsAggregatorOperator.RATE_SUM,
		label: 'Rate_sum',
	},
	{
		value: LogsAggregatorOperator.RATE_AVG,
		label: 'Rate_avg',
	},
	{
		value: LogsAggregatorOperator.RATE_MIN,
		label: 'Rate_min',
	},
	{
		value: LogsAggregatorOperator.RATE_MAX,
		label: 'Rate_max',
	},
];

export const metricsSumAggregateOperatorOptions: SelectOption<
	string,
	string
>[] = [
	{
		value: MetricAggregateOperator.RATE,
		label: 'Rate',
	},
	{
		value: MetricAggregateOperator.INCREASE,
		label: 'Increase',
	},
];

export const metricsGaugeAggregateOperatorOptions: SelectOption<
	string,
	string
>[] = [
	{
		value: MetricAggregateOperator.LATEST,
		label: 'Latest',
	},
	{
		value: MetricAggregateOperator.SUM,
		label: 'Sum',
	},
	{
		value: MetricAggregateOperator.AVG,
		label: 'Avg',
	},
	{
		value: MetricAggregateOperator.MIN,
		label: 'Min',
	},
	{
		value: MetricAggregateOperator.MAX,
		label: 'Max',
	},
	{
		value: MetricAggregateOperator.COUNT,
		label: 'Count',
	},
	{
		value: MetricAggregateOperator.COUNT_DISTINCT,
		label: 'Count Distinct',
	},
];

export const metricsSumSpaceAggregateOperatorOptions: SelectOption<
	string,
	string
>[] = [
	{
		value: MetricAggregateOperator.SUM,
		label: 'Sum',
	},
	{
		value: MetricAggregateOperator.AVG,
		label: 'Avg',
	},
	{
		value: MetricAggregateOperator.MIN,
		label: 'Min',
	},
	{
		value: MetricAggregateOperator.MAX,
		label: 'Max',
	},
];

export const metricsGaugeSpaceAggregateOperatorOptions: SelectOption<
	string,
	string
>[] = [
	{
		value: MetricAggregateOperator.SUM,
		label: 'Sum',
	},
	{
		value: MetricAggregateOperator.AVG,
		label: 'Avg',
	},
	{
		value: MetricAggregateOperator.MIN,
		label: 'Min',
	},
	{
		value: MetricAggregateOperator.MAX,
		label: 'Max',
	},
];

export const metricsHistogramSpaceAggregateOperatorOptions: SelectOption<
	string,
	string
>[] = [
	{
		value: MetricAggregateOperator.P50,
		label: 'P50',
	},
	{
		value: MetricAggregateOperator.P75,
		label: 'P75',
	},
	{
		value: MetricAggregateOperator.P90,
		label: 'P90',
	},
	{
		value: MetricAggregateOperator.P95,
		label: 'P95',
	},
	{
		value: MetricAggregateOperator.P99,
		label: 'P99',
	},
];

export const metricsEmptyTimeAggregateOperatorOptions: SelectOption<
	string,
	string
>[] = [];
