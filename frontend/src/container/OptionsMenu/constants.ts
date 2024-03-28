import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';

import { OptionsQuery } from './types';

export const URL_OPTIONS = 'options';

export const defaultOptionsQuery: OptionsQuery = {
	selectColumns: [],
	maxLines: 2,
	format: 'list',
};

export const defaultTraceSelectedColumns = [
	{
		key: 'serviceName',
		dataType: DataTypes.String,
		type: 'tag',
		isColumn: true,
		isJSON: false,
		id: 'serviceName--string--tag--true',
	},
	{
		key: 'name',
		dataType: DataTypes.String,
		type: 'tag',
		isColumn: true,
		isJSON: false,
		id: 'name--string--tag--true',
	},
	{
		key: 'durationNano',
		dataType: DataTypes.Float64,
		type: 'tag',
		isColumn: true,
		isJSON: false,
		id: 'durationNano--float64--tag--true',
	},
	{
		key: 'httpMethod',
		dataType: DataTypes.String,
		type: 'tag',
		isColumn: true,
		isJSON: false,
		id: 'httpMethod--string--tag--true',
	},
	{
		key: 'responseStatusCode',
		dataType: DataTypes.String,
		type: 'tag',
		isColumn: true,
		isJSON: false,
		id: 'responseStatusCode--string--tag--true',
	},
];
