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
	aggregateOperator: null,
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
