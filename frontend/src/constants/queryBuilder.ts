// ** Helpers
import { createIdFromObjectFields } from 'lib/createIdFromObjectFields';
import { createNewBuilderItemName } from 'lib/newQueryBuilder/createNewBuilderItemName';
import {
	AutocompleteType,
	BaseAutocompleteData,
	DataTypes,
	LocalDataType,
} from 'types/api/queryBuilder/queryAutocompleteResponse';
import {
	HavingForm,
	IBuilderFormula,
	IBuilderQuery,
	IClickHouseQuery,
	IPromQLQuery,
	Query,
	QueryState,
	TagFilter,
} from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';
import {
	BoolOperators,
	DataSource,
	LogsAggregatorOperator,
	MetricAggregateOperator,
	NumberOperators,
	QueryAdditionalFilter,
	QueryBuilderData,
	ReduceOperators,
	StringOperators,
	TracesAggregatorOperator,
} from 'types/common/queryBuilder';
import { SelectOption } from 'types/common/select';
import { v4 as uuid } from 'uuid';

import {
	logsAggregateOperatorOptions,
	metricAggregateOperatorOptions,
	metricsGaugeAggregateOperatorOptions,
	metricsGaugeSpaceAggregateOperatorOptions,
	metricsHistogramSpaceAggregateOperatorOptions,
	metricsSumAggregateOperatorOptions,
	metricsSumSpaceAggregateOperatorOptions,
	tracesAggregateOperatorOptions,
} from './queryBuilderOperators';

export const MAX_FORMULAS = 20;
export const MAX_QUERIES = 26;

export const idDivider = '--';
export const selectValueDivider = '__';

export const baseAutoCompleteIdKeysOrder: (keyof Omit<
	BaseAutocompleteData,
	'id' | 'isJSON' | 'isIndexed'
>)[] = ['key', 'dataType', 'type', 'isColumn'];

export const autocompleteType: Record<AutocompleteType, AutocompleteType> = {
	resource: 'resource',
	tag: 'tag',
	'': '',
};

export const formulasNames: string[] = Array.from(
	Array(MAX_FORMULAS),
	(_, i) => `F${i + 1}`,
);
const alpha: number[] = Array.from(Array(MAX_QUERIES), (_, i) => i + 65);
export const alphabet: string[] = alpha.map((str) => String.fromCharCode(str));

export enum QueryBuilderKeys {
	GET_AGGREGATE_ATTRIBUTE = 'GET_AGGREGATE_ATTRIBUTE',
	GET_AGGREGATE_KEYS = 'GET_AGGREGATE_KEYS',
	GET_ATTRIBUTE_SUGGESTIONS = 'GET_ATTRIBUTE_SUGGESTIONS',
}

export const mapOfOperators = {
	metrics: metricAggregateOperatorOptions,
	logs: logsAggregateOperatorOptions,
	traces: tracesAggregateOperatorOptions,
};

export const metricsOperatorsByType = {
	Sum: metricsSumAggregateOperatorOptions,
	Gauge: metricsGaugeAggregateOperatorOptions,
};

export const metricsSpaceAggregationOperatorsByType = {
	Sum: metricsSumSpaceAggregateOperatorOptions,
	Gauge: metricsGaugeSpaceAggregateOperatorOptions,
	Histogram: metricsHistogramSpaceAggregateOperatorOptions,
	ExponentialHistogram: metricsHistogramSpaceAggregateOperatorOptions,
};

export const mapOfQueryFilters: Record<DataSource, QueryAdditionalFilter[]> = {
	metrics: [
		// eslint-disable-next-line sonarjs/no-duplicate-string
		{ text: 'Aggregation interval', field: 'stepInterval' },
		{ text: 'Having', field: 'having' },
	],
	logs: [
		{ text: 'Order by', field: 'orderBy' },
		{ text: 'Limit', field: 'limit' },
		{ text: 'Having', field: 'having' },
		{ text: 'Aggregation interval', field: 'stepInterval' },
	],
	traces: [
		{ text: 'Order by', field: 'orderBy' },
		{ text: 'Limit', field: 'limit' },
		{ text: 'Having', field: 'having' },
		{ text: 'Aggregation interval', field: 'stepInterval' },
	],
};

const commonFormulaFilters: QueryAdditionalFilter[] = [
	{
		text: 'Having',
		field: 'having',
	},
	{ text: 'Order by', field: 'orderBy' },
	{ text: 'Limit', field: 'limit' },
];

export const mapOfFormulaToFilters: Record<
	DataSource,
	QueryAdditionalFilter[]
> = {
	metrics: commonFormulaFilters,
	logs: commonFormulaFilters,
	traces: commonFormulaFilters,
};

export const REDUCE_TO_VALUES: SelectOption<ReduceOperators, string>[] = [
	{ value: 'last', label: 'Latest of values in timeframe' },
	{ value: 'sum', label: 'Sum of values in timeframe' },
	{ value: 'avg', label: 'Average of values in timeframe' },
	{ value: 'max', label: 'Max of values in timeframe' },
	{ value: 'min', label: 'Min of values in timeframe' },
];

export const initialHavingValues: HavingForm = {
	columnName: '',
	op: '',
	value: [],
};

export const initialAutocompleteData: BaseAutocompleteData = {
	id: createIdFromObjectFields(
		{ dataType: null, key: '', isColumn: null, type: null },
		baseAutoCompleteIdKeysOrder,
	),
	dataType: DataTypes.EMPTY,
	key: '',
	isColumn: false,
	type: '',
	isJSON: false,
};

export const initialFilters: TagFilter = {
	items: [],
	op: 'AND',
};

export const initialQueryBuilderFormValues: IBuilderQuery = {
	dataSource: DataSource.METRICS,
	queryName: createNewBuilderItemName({ existNames: [], sourceNames: alphabet }),
	aggregateOperator: MetricAggregateOperator.COUNT,
	aggregateAttribute: initialAutocompleteData,
	timeAggregation: MetricAggregateOperator.RATE,
	spaceAggregation: MetricAggregateOperator.SUM,
	functions: [],
	filters: { items: [], op: 'AND' },
	expression: createNewBuilderItemName({
		existNames: [],
		sourceNames: alphabet,
	}),
	disabled: false,
	stepInterval: 60,
	having: [],
	limit: null,
	orderBy: [],
	groupBy: [],
	legend: '',
	reduceTo: 'avg',
};

const initialQueryBuilderFormLogsValues: IBuilderQuery = {
	...initialQueryBuilderFormValues,
	aggregateOperator: LogsAggregatorOperator.COUNT,
	dataSource: DataSource.LOGS,
};

const initialQueryBuilderFormTracesValues: IBuilderQuery = {
	...initialQueryBuilderFormValues,
	aggregateOperator: TracesAggregatorOperator.COUNT,
	dataSource: DataSource.TRACES,
};

export const initialQueryBuilderFormValuesMap: Record<
	DataSource,
	IBuilderQuery
> = {
	metrics: initialQueryBuilderFormValues,
	logs: initialQueryBuilderFormLogsValues,
	traces: initialQueryBuilderFormTracesValues,
};

export const initialFormulaBuilderFormValues: IBuilderFormula = {
	queryName: createNewBuilderItemName({
		existNames: [],
		sourceNames: formulasNames,
	}),
	expression: '',
	disabled: false,
	legend: '',
};

export const initialQueryPromQLData: IPromQLQuery = {
	name: createNewBuilderItemName({ existNames: [], sourceNames: alphabet }),
	query: '',
	legend: '',
	disabled: false,
};

export const initialClickHouseData: IClickHouseQuery = {
	name: createNewBuilderItemName({ existNames: [], sourceNames: alphabet }),
	legend: '',
	disabled: false,
	query: '',
};

export const initialQueryBuilderData: QueryBuilderData = {
	queryData: [initialQueryBuilderFormValues],
	queryFormulas: [],
};

export const initialSingleQueryMap: Record<
	EQueryType.PROM | EQueryType.CLICKHOUSE,
	IClickHouseQuery | IPromQLQuery
> = { clickhouse_sql: initialClickHouseData, promql: initialQueryPromQLData };

export const initialQueryState: QueryState = {
	id: uuid(),
	builder: initialQueryBuilderData,
	clickhouse_sql: [initialClickHouseData],
	promql: [initialQueryPromQLData],
};

const initialQueryWithType: Query = {
	...initialQueryState,
	queryType: EQueryType.QUERY_BUILDER,
};

const initialQueryLogsWithType: Query = {
	...initialQueryWithType,
	builder: {
		...initialQueryWithType.builder,
		queryData: [initialQueryBuilderFormValuesMap.logs],
	},
};
const initialQueryTracesWithType: Query = {
	...initialQueryWithType,
	builder: {
		...initialQueryWithType.builder,
		queryData: [initialQueryBuilderFormValuesMap.traces],
	},
};

export const initialQueriesMap: Record<DataSource, Query> = {
	metrics: initialQueryWithType,
	logs: initialQueryLogsWithType,
	traces: initialQueryTracesWithType,
};

export const operatorsByTypes: Record<LocalDataType, string[]> = {
	string: Object.values(StringOperators),
	number: Object.values(NumberOperators),
	bool: Object.values(BoolOperators),
};

// eslint-disable-next-line @typescript-eslint/naming-convention
export enum PANEL_TYPES {
	TIME_SERIES = 'graph',
	VALUE = 'value',
	TABLE = 'table',
	LIST = 'list',
	TRACE = 'trace',
	BAR = 'bar',
	PIE = 'pie',
	HISTOGRAM = 'histogram',
	EMPTY_WIDGET = 'EMPTY_WIDGET',
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export enum PANEL_GROUP_TYPES {
	ROW = 'row',
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export enum ATTRIBUTE_TYPES {
	SUM = 'Sum',
	GAUGE = 'Gauge',
	HISTOGRAM = 'Histogram',
	EXPONENTIAL_HISTOGRAM = 'ExponentialHistogram',
}

export type IQueryBuilderState = 'search';

export const QUERY_BUILDER_SEARCH_VALUES = {
	MULTIPLY: 'MULTIPLY_VALUE',
	SINGLE: 'SINGLE_VALUE',
	NON: 'NON_VALUE',
	NOT_VALID: 'NOT_VALID',
};

export const OPERATORS = {
	IN: 'IN',
	NIN: 'NOT_IN',
	LIKE: 'LIKE',
	NLIKE: 'NOT_LIKE',
	REGEX: 'REGEX',
	NREGEX: 'NOT_REGEX',
	'=': '=',
	'!=': '!=',
	EXISTS: 'EXISTS',
	NOT_EXISTS: 'NOT_EXISTS',
	CONTAINS: 'CONTAINS',
	NOT_CONTAINS: 'NOT_CONTAINS',
	'>=': '>=',
	'>': '>',
	'<=': '<=',
	'<': '<',
	HAS: 'HAS',
	NHAS: 'NHAS',
};

export const QUERY_BUILDER_OPERATORS_BY_TYPES = {
	string: [
		OPERATORS['='],
		OPERATORS['!='],
		OPERATORS.IN,
		OPERATORS.NIN,
		OPERATORS.LIKE,
		OPERATORS.NLIKE,
		OPERATORS.CONTAINS,
		OPERATORS.NOT_CONTAINS,
		OPERATORS.EXISTS,
		OPERATORS.NOT_EXISTS,
		OPERATORS.REGEX,
		OPERATORS.NREGEX,
	],
	int64: [
		OPERATORS['='],
		OPERATORS['!='],
		OPERATORS.IN,
		OPERATORS.NIN,
		OPERATORS.EXISTS,
		OPERATORS.NOT_EXISTS,
		OPERATORS['>='],
		OPERATORS['>'],
		OPERATORS['<='],
		OPERATORS['<'],
	],
	float64: [
		OPERATORS['='],
		OPERATORS['!='],
		OPERATORS.IN,
		OPERATORS.NIN,
		OPERATORS.EXISTS,
		OPERATORS.NOT_EXISTS,
		OPERATORS['>='],
		OPERATORS['>'],
		OPERATORS['<='],
		OPERATORS['<'],
	],
	bool: [
		OPERATORS['='],
		OPERATORS['!='],
		OPERATORS.EXISTS,
		OPERATORS.NOT_EXISTS,
	],
	universal: [
		OPERATORS['='],
		OPERATORS['!='],
		OPERATORS.IN,
		OPERATORS.NIN,
		OPERATORS.EXISTS,
		OPERATORS.NOT_EXISTS,
		OPERATORS.LIKE,
		OPERATORS.NLIKE,
		OPERATORS['>='],
		OPERATORS['>'],
		OPERATORS['<='],
		OPERATORS['<'],
		OPERATORS.CONTAINS,
		OPERATORS.NOT_CONTAINS,
	],
};

export const HAVING_OPERATORS: string[] = [
	OPERATORS['='],
	OPERATORS['!='],
	OPERATORS.IN,
	OPERATORS.NIN,
	OPERATORS['>='],
	OPERATORS['>'],
	OPERATORS['<='],
	OPERATORS['<'],
];

export enum PanelDisplay {
	TIME_SERIES = 'Time Series',
	VALUE = 'Number',
	TABLE = 'Table',
	LIST = 'List',
	BAR = 'Bar',
	PIE = 'Pie',
	HISTOGRAM = 'Histogram',
}
