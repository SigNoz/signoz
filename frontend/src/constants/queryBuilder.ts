// ** Helpers
import { GRAPH_TYPES } from 'container/NewDashboard/ComponentsSlider';
import { createNewBuilderItemName } from 'lib/newQueryBuilder/createNewBuilderItemName';
import { LocalDataType } from 'types/api/queryBuilder/queryAutocompleteResponse';
import {
	HavingForm,
	IBuilderFormula,
	IBuilderQuery,
} from 'types/api/queryBuilder/queryBuilderData';
import {
	BoolOperators,
	DataSource,
	MetricAggregateOperator,
	NumberOperators,
	PanelTypeKeys,
	QueryAdditionalFilter,
	ReduceOperators,
	StringOperators,
} from 'types/common/queryBuilder';
import { SelectOption } from 'types/common/select';
import { v4 as uuid } from 'uuid';

import {
	logsAggregateOperatorOptions,
	metricAggregateOperatorOptions,
	tracesAggregateOperatorOptions,
} from './queryBuilderOperators';

export const MAX_FORMULAS = 20;
export const MAX_QUERIES = 26;

export const selectValueDivider = '--';

export const formulasNames: string[] = Array.from(
	Array(MAX_FORMULAS),
	(_, i) => `F${i + 1}`,
);
const alpha: number[] = Array.from(Array(MAX_QUERIES), (_, i) => i + 65);
export const alphabet: string[] = alpha.map((str) => String.fromCharCode(str));

export enum QueryBuilderKeys {
	GET_AGGREGATE_ATTRIBUTE = 'GET_AGGREGATE_ATTRIBUTE',
	GET_AGGREGATE_KEYS = 'GET_AGGREGATE_KEYS',
	GET_ATTRIBUTE_KEY = 'GET_ATTRIBUTE_KEY',
}

export const mapOfOperators = {
	metrics: metricAggregateOperatorOptions,
	logs: logsAggregateOperatorOptions,
	traces: tracesAggregateOperatorOptions,
};

export const mapOfFilters: Record<DataSource, QueryAdditionalFilter[]> = {
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

export const initialAggregateAttribute: IBuilderQuery['aggregateAttribute'] = {
	id: uuid(),
	dataType: null,
	key: '',
	isColumn: null,
	type: null,
};

export const initialQueryBuilderFormValues: IBuilderQuery = {
	dataSource: DataSource.METRICS,
	queryName: createNewBuilderItemName({ existNames: [], sourceNames: alphabet }),
	aggregateOperator: MetricAggregateOperator.NOOP,
	aggregateAttribute: initialAggregateAttribute,
	filters: { items: [], op: 'AND' },
	expression: createNewBuilderItemName({
		existNames: [],
		sourceNames: alphabet,
	}),
	disabled: false,
	having: [],
	stepInterval: 30,
	limit: null,
	orderBy: [],
	groupBy: [],
	legend: '',
	reduceTo: 'sum',
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

export const operatorsByTypes: Record<LocalDataType, string[]> = {
	string: Object.values(StringOperators),
	number: Object.values(NumberOperators),
	bool: Object.values(BoolOperators),
};

export const PANEL_TYPES: Record<PanelTypeKeys, GRAPH_TYPES> = {
	TIME_SERIES: 'graph',
	VALUE: 'value',
	TABLE: 'table',
	LIST: 'list',
	EMPTY_WIDGET: 'EMPTY_WIDGET',
};

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
