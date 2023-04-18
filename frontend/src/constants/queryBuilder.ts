// ** TODO: use it for creating formula names
// import { createNewFormulaName } from 'lib/newQueryBuilder/createNewFormulaName';
// ** Helpers
import { createNewQueryName } from 'lib/newQueryBuilder/createNewQueryName';
import { LocalDataType } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { IBuilderQueryForm } from 'types/api/queryBuilder/queryBuilderData';
import {
	BoolOperators,
	DataSource,
	LogsAggregatorOperator,
	MetricAggregateOperator,
	NumberOperators,
	StringOperators,
	TracesAggregatorOperator,
} from 'types/common/queryBuilder';

export enum QueryBuilderKeys {
	GET_AGGREGATE_ATTRIBUTE = 'GET_AGGREGATE_ATTRIBUTE',
	GET_AGGREGATE_KEYS = 'GET_AGGREGATE_KEYS',
}

export const mapOfOperators: Record<DataSource, string[]> = {
	metrics: Object.values(MetricAggregateOperator),
	logs: Object.values(LogsAggregatorOperator),
	traces: Object.values(TracesAggregatorOperator),
};

export const mapOfFilters: Record<DataSource, string[]> = {
	// eslint-disable-next-line sonarjs/no-duplicate-string
	metrics: ['Having', 'Aggregation interval'],
	logs: ['Limit', 'Having', 'Order by', 'Aggregation interval'],
	traces: ['Limit', 'Having', 'Order by', 'Aggregation interval'],
};

export const initialAggregateAttribute: IBuilderQueryForm['aggregateAttribute'] = {
	dataType: null,
	key: '',
	isColumn: null,
	type: null,
};

export const initialQueryBuilderFormValues: IBuilderQueryForm = {
	dataSource: DataSource.METRICS,
	queryName: createNewQueryName([]),
	aggregateOperator: Object.values(MetricAggregateOperator)[0],
	aggregateAttribute: initialAggregateAttribute,
	tagFilters: { items: [], op: 'AND' },
	expression: '',
	disabled: false,
	having: [],
	stepInterval: 30,
	limit: 10,
	orderBy: [],
	groupBy: [],
	legend: '',
	reduceTo: '',
};

export const operatorsByTypes: Record<LocalDataType, string[]> = {
	string: Object.values(StringOperators),
	number: Object.values(NumberOperators),
	bool: Object.values(BoolOperators),
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
	EQUALS: '=',
	NOT_EQUALS: '!=',
	EXISTS: 'EXISTS',
	NOT_EXISTS: 'NOT_EXISTS',
	CONTAINS: 'CONTAINS',
	NOT_CONTAINS: 'NOT_CONTAINS',
	GTE: '>=',
	GT: '>',
	LTE: '<=',
	LT: '<',
};

export const QUERY_BUILDER_OPERATORS_BY_TYPES = {
	string: [
		OPERATORS.EQUALS,
		OPERATORS.NOT_EQUALS,
		OPERATORS.IN,
		OPERATORS.NIN,
		OPERATORS.LIKE,
		OPERATORS.NLIKE,
		OPERATORS.CONTAINS,
		OPERATORS.NOT_CONTAINS,
		OPERATORS.EXISTS,
		OPERATORS.NOT_EXISTS,
	],
	number: [
		OPERATORS.EQUALS,
		OPERATORS.NOT_EQUALS,
		OPERATORS.IN,
		OPERATORS.NIN,
		OPERATORS.EXISTS,
		OPERATORS.NOT_EXISTS,
		OPERATORS.GTE,
		OPERATORS.GT,
		OPERATORS.LTE,
		OPERATORS.LT,
	],
	boolean: [
		OPERATORS.EQUALS,
		OPERATORS.NOT_EQUALS,
		OPERATORS.EXISTS,
		OPERATORS.NOT_EXISTS,
	],
	universal: [
		OPERATORS.EQUALS,
		OPERATORS.NOT_EQUALS,
		OPERATORS.IN,
		OPERATORS.NIN,
		OPERATORS.EXISTS,
		OPERATORS.NOT_EXISTS,
		OPERATORS.LIKE,
		OPERATORS.NLIKE,
		OPERATORS.GTE,
		OPERATORS.GT,
		OPERATORS.LTE,
		OPERATORS.LT,
		OPERATORS.CONTAINS,
		OPERATORS.NOT_CONTAINS,
	],
};
