import { EAggregateOperator, EReduceOperator } from 'types/common/dashboard';

export const PromQLQueryTemplate = {
	query: '',
	legend: '',
	disabled: false,
};

export const ClickHouseQueryTemplate = {
	rawQuery: '',
	legend: '',
	disabled: false,
};

export const QueryBuilderQueryTemplate = {
	metricName: null,
	aggregateOperator: EAggregateOperator.NOOP,
	tagFilters: {
		op: 'AND',
		items: [],
	},
	legend: '',
	disabled: false,
	// Specific to TIME_SERIES type graph
	groupBy: [],
	// Specific to VALUE type graph
	reduceTo: EReduceOperator['Latest of values in timeframe'],
};

export const QueryBuilderFormulaTemplate = {
	expression: '',
	disabled: false,
};
