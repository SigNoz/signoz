import { GRAPH_TYPES } from 'container/NewDashboard/ComponentsSlider';
import {
	IBuilderFormula,
	IBuilderQuery,
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
	RATE_SUM = 'rate_sum',
	RATE_AVG = 'rate_avg',
	RATE_MIN = 'rate_min',
	RATE_MAX = 'rate_max',
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
	RATE_SUM = 'rate_sum',
	RATE_AVG = 'rate_avg',
	RATE_MIN = 'rate_min',
	RATE_MAX = 'rate_max',
}

export type PanelTypeKeys =
	| 'TIME_SERIES'
	| 'VALUE'
	| 'TABLE'
	| 'LIST'
	| 'EMPTY_WIDGET';

export type ReduceOperators = 'last' | 'sum' | 'avg' | 'max' | 'min';

export type QueryBuilderData = {
	queryData: IBuilderQuery[];
	queryFormulas: IBuilderFormula[];
};

export const isQuery = (
	query: IBuilderFormula | IBuilderQuery,
): query is IBuilderQuery =>
	'dataSource' in query && 'aggregateOperator' in query;

export type QueryBuilderContextType = {
	queryBuilderData: QueryBuilderData;
	initialDataSource: DataSource | null;
	panelType: GRAPH_TYPES;
	resetQueryBuilderData: () => void;
	resetQueryBuilderInfo: () => void;
	handleSetQueryData: (index: number, queryData: IBuilderQuery) => void;
	handleSetFormulaData: (index: number, formulaData: IBuilderFormula) => void;
	handleSetPanelType: (newPanelType: GRAPH_TYPES) => void;
	initQueryBuilderData: (queryBuilderData: QueryBuilderData) => void;
	setupInitialDataSource: (newInitialDataSource: DataSource | null) => void;
	removeEntityByIndex: (type: keyof QueryBuilderData, index: number) => void;
	addNewQuery: () => void;
	addNewFormula: () => void;
};

export type QueryAdditionalFilter = {
	field: keyof IBuilderQuery;
	text: string;
};
