import {
	IBuilderFormula,
	IBuilderQueryForm,
} from 'types/api/queryBuilder/queryBuilderData';

export enum DataSource {
	METRICS = 'metrics',
	TRACES = 'traces',
	LOGS = 'logs',
}

export enum StringOperators {
	NOOP = 'noop',
	COUNT = 'count',
	COUNT_DISTINCT = 'count_distinct',
}

export enum NumberOperators {
	SUM = 'sum',
	AVG = 'avg',
	MAX = 'max',
	MIN = 'min',
	P05 = 'p05',
	P10 = 'p10',
	P20 = 'p20',
	P25 = 'p25',
	P50 = 'p50',
	P75 = 'p75',
	P90 = 'p90',
	P95 = 'p95',
	P99 = 'p99',
	RATE = 'rate',
	SUM_RATE = 'sum_rate',
	AVG_RATE = 'avg_rate',
	MAX_RATE = 'max_rate',
	MIN_RATE = 'min_rate',
	RATE_SUM = 'rate_sum',
	RATE_AVG = 'rate_avg',
	RATE_MIN = 'rate_min',
	RATE_MAX = 'rate_max',
	HIST_QUANTILE_50 = 'hist_quantile_50',
	HIST_QUANTILE_75 = 'hist_quantile_75',
	HIST_QUANTILE_90 = 'hist_quantile_90',
	HIST_QUANTILE_95 = 'hist_quantile_95',
	HIST_QUANTILE_99 = 'hist_quantile_99',
}

// TODO: add boolean operators from backend
export enum BoolOperators {
	NOOP = 'noop',
	COUNT = 'count',
	COUNT_DISTINCT = 'count_distinct',
}

export enum MetricAggregateOperator {
	NOOP = 'noop',
	COUNT = 'count',
	COUNT_DISTINCT = 'count_distinct',
	SUM = 'sum',
	AVG = 'avg',
	MAX = 'max',
	MIN = 'min',
	P05 = 'p05',
	P10 = 'p10',
	P20 = 'p20',
	P25 = 'p25',
	P50 = 'p50',
	P75 = 'p75',
	P90 = 'p90',
	P95 = 'p95',
	P99 = 'p99',
	RATE = 'rate',
	SUM_RATE = 'sum_rate',
	AVG_RATE = 'avg_rate',
	MAX_RATE = 'max_rate',
	MIN_RATE = 'min_rate',
	RATE_SUM = 'rate_sum',
	RATE_AVG = 'rate_avg',
	RATE_MIN = 'rate_min',
	RATE_MAX = 'rate_max',
	HIST_QUANTILE_50 = 'hist_quantile_50',
	HIST_QUANTILE_75 = 'hist_quantile_75',
	HIST_QUANTILE_90 = 'hist_quantile_90',
	HIST_QUANTILE_95 = 'hist_quantile_95',
	HIST_QUANTILE_99 = 'hist_quantile_99',
}

export enum TracesAggregatorOperator {
	NOOP = 'noop',
	COUNT = 'count',
	COUNT_DISTINCT = 'count_distinct',
	SUM = 'sum',
	AVG = 'avg',
	MAX = 'max',
	MIN = 'min',
	P05 = 'p05',
	P10 = 'p10',
	P20 = 'p20',
	P25 = 'p25',
	P50 = 'p50',
	P75 = 'p75',
	P90 = 'p90',
	P95 = 'p95',
	P99 = 'p99',
	RATE = 'rate',
}

export enum LogsAggregatorOperator {
	NOOP = 'noop',
	COUNT = 'count',
	COUNT_DISTINCT = 'count_distinct',
	SUM = 'sum',
	AVG = 'avg',
	MAX = 'max',
	MIN = 'min',
	P05 = 'p05',
	P10 = 'p10',
	P20 = 'p20',
	P25 = 'p25',
	P50 = 'p50',
	P75 = 'p75',
	P90 = 'p90',
	P95 = 'p95',
	P99 = 'p99',
	RATE = 'rate',
}

export enum EReduceOperator {
	LATEST_OF_VALUES_IN_TIMEFRAME = 'Latest of values in timeframe',
	'SUM_OF_VALUES_IN_TIMEFRAME' = 'Sum of values in timeframe',
	'AVERAGE_OF_VALUES_IN_TIMEFRAME' = 'Average of values in timeframe',
	'MAX_OF_VALUES_IN_TIMEFRAME' = 'Max of values in timeframe',
	'MIN_OF_VALUES_IN_TIMEFRAME' = 'Min of values in timeframe',
}

export type QueryBuilderData = {
	queryData: IBuilderQueryForm[];
	queryFormulas: IBuilderFormula[];
};

// ** TODO: temporary types for context, fix it during development
export type QueryBuilderContextType = {
	queryBuilderData: QueryBuilderData;
	initialDataSource: DataSource | null;
	resetQueryBuilderData: () => void;
	handleSetQueryData: (index: number, queryData: IBuilderQueryForm) => void;
	handleSetFormulaData: (index: number, formulaData: IBuilderFormula) => void;
	initQueryBuilderData: (queryBuilderData: QueryBuilderData) => void;
	setupInitialDataSource: (newInitialDataSource: DataSource | null) => void;
	removeEntityByIndex: (type: keyof QueryBuilderData, index: number) => void;
	addNewQuery: () => void;
	addNewFormula: () => void;
};
