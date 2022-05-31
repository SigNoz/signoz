export const PromQLQueryTemplate = {
	query: '',
	legend: '',
	disabled: false,
};

export const ClickHouseQueryTemplate = {
	rawQuery: '',
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
	disabled: false,
};
