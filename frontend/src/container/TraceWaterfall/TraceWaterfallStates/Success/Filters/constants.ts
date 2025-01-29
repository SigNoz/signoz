import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

export const BASE_FILTER_QUERY: IBuilderQuery = {
	queryName: 'A',
	dataSource: DataSource.TRACES,
	aggregateOperator: 'noop',
	aggregateAttribute: {
		id: '------false',
		dataType: DataTypes.EMPTY,
		key: '',
		isColumn: false,
		type: '',
		isJSON: false,
	},
	timeAggregation: 'rate',
	spaceAggregation: 'sum',
	functions: [],
	filters: {
		items: [],
		op: 'AND',
	},
	expression: 'A',
	disabled: false,
	stepInterval: 60,
	having: [],
	limit: 200,
	orderBy: [
		{
			columnName: 'timestamp',
			order: 'desc',
		},
	],
	groupBy: [],
	legend: '',
	reduceTo: 'avg',
	offset: 0,
	selectColumns: [],
};
