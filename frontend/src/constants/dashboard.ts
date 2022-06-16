import { EAggregateOperator } from 'types/common/dashboard';

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
	groupBy: [],
	legend: '',
	disabled: false,
};

export const QueryBuilderFormulaTemplate = {
	expression: '',
	disabled: false,
};
