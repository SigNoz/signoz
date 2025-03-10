import { PANEL_TYPES } from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import { Format } from 'container/NewWidget/RightContainer/types';
import { OptionsQuery } from 'container/OptionsMenu/types';
import { Dispatch, SetStateAction } from 'react';
import {
	IBuilderFormula,
	IBuilderQuery,
	IClickHouseQuery,
	IPromQLQuery,
	Query,
	QueryState,
} from 'types/api/queryBuilder/queryBuilderData';
import { ViewProps } from 'types/api/saveViews/types';

import { EQueryType } from './dashboard';

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

export enum Temporality {
	Unspecified = 'Unspecified',
	Delta = 'Delta',
	Cumulative = 'Cumulative',
}

export enum MetricAggregateOperator {
	EMPTY = '', // used as time aggregator for histograms
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
	INCREASE = 'increase',
	LATEST = 'latest',
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

export enum QueryFunctionsTypes {
	ANOMALY = 'anomaly',
	CUTOFF_MIN = 'cutOffMin',
	CUTOFF_MAX = 'cutOffMax',
	CLAMP_MIN = 'clampMin',
	CLAMP_MAX = 'clampMax',
	ABSOLUTE = 'absolute',
	RUNNING_DIFF = 'runningDiff',
	LOG_2 = 'log2',
	LOG_10 = 'log10',
	CUMULATIVE_SUM = 'cumSum',
	EWMA_3 = 'ewma3',
	EWMA_5 = 'ewma5',
	EWMA_7 = 'ewma7',
	MEDIAN_3 = 'median3',
	MEDIAN_5 = 'median5',
	MEDIAN_7 = 'median7',
	TIME_SHIFT = 'timeShift',
}

export type PanelTypeKeys =
	| 'TIME_SERIES'
	| 'VALUE'
	| 'TABLE'
	| 'LIST'
	| 'TRACE'
	| 'EMPTY_WIDGET';

export type ReduceOperators = 'last' | 'sum' | 'avg' | 'max' | 'min';

export type QueryBuilderData = {
	queryData: IBuilderQuery[];
	queryFormulas: IBuilderFormula[];
};

export type QueryBuilderContextType = {
	currentQuery: Query;
	stagedQuery: Query | null;
	lastUsedQuery: number | null;
	setLastUsedQuery: Dispatch<SetStateAction<number | null>>;
	supersetQuery: Query;
	setSupersetQuery: Dispatch<SetStateAction<QueryState>>;
	initialDataSource: DataSource | null;
	panelType: PANEL_TYPES | null;
	isEnabledQuery: boolean;
	handleSetQueryData: (index: number, queryData: IBuilderQuery) => void;
	handleSetFormulaData: (index: number, formulaData: IBuilderFormula) => void;
	handleSetQueryItemData: (
		index: number,
		type: EQueryType.PROM | EQueryType.CLICKHOUSE,
		newQueryData: IPromQLQuery | IClickHouseQuery,
	) => void;
	handleSetConfig: (
		newPanelType: PANEL_TYPES,
		dataSource: DataSource | null,
	) => void;
	removeQueryBuilderEntityByIndex: (
		type: keyof QueryBuilderData,
		index: number,
	) => void;
	removeQueryTypeItemByIndex: (
		type: EQueryType.PROM | EQueryType.CLICKHOUSE,
		index: number,
	) => void;
	addNewBuilderQuery: () => void;
	addNewFormula: () => void;
	cloneQuery: (type: string, query: IBuilderQuery) => void;
	addNewQueryItem: (type: EQueryType.PROM | EQueryType.CLICKHOUSE) => void;
	redirectWithQueryBuilderData: (
		query: Query,
		searchParams?: Record<string, unknown>,
		redirectToUrl?: typeof ROUTES[keyof typeof ROUTES],
		shallStringify?: boolean,
	) => void;
	handleRunQuery: (shallUpdateStepInterval?: boolean) => void;
	resetQuery: (newCurrentQuery?: QueryState) => void;
	handleOnUnitsChange: (units: Format['id']) => void;
	updateAllQueriesOperators: (
		queryData: Query,
		panelType: PANEL_TYPES,
		dataSource: DataSource,
	) => Query;
	updateQueriesData: <T extends keyof QueryBuilderData>(
		query: Query,
		type: T,
		updateCallback: (
			item: QueryBuilderData[T][number],
			index: number,
		) => QueryBuilderData[T][number],
	) => Query;
	initQueryBuilderData: (query: Query, timeUpdated?: boolean) => void;
	isStagedQueryUpdated: (
		viewData: ViewProps[] | undefined,
		viewKey: string,
		options: OptionsQuery,
	) => boolean;
	isDefaultQuery: (props: IsDefaultQueryProps) => boolean;
};

export type QueryAdditionalFilter = {
	field: keyof IBuilderQuery;
	text: string;
};

export type IsDefaultQueryProps = {
	currentQuery: Query;
	sourcePage: DataSource;
};
