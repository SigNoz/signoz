import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';

import { FontSize, OptionsQuery } from './types';

export const URL_OPTIONS = 'options';

export const defaultOptionsQuery: OptionsQuery = {
	selectColumns: [],
	maxLines: 2,
	format: 'raw',
	fontSize: FontSize.SMALL,
};

export const defaultLogsSelectedColumns = [
	{
		key: 'timestamp',
		dataType: DataTypes.String,
		type: 'tag',
		isColumn: true,
		isJSON: false,
		id: 'timestamp--string--tag--true',
		isIndexed: false,
	},
	{
		key: 'body',
		dataType: DataTypes.String,
		type: 'tag',
		isColumn: true,
		isJSON: false,
		id: 'body--string--tag--true',
		isIndexed: false,
	},
];

export const defaultTraceSelectedColumns = [
	{
		key: 'serviceName',
		dataType: DataTypes.String,
		type: 'tag',
		isColumn: true,
		isJSON: false,
		id: 'serviceName--string--tag--true',
		isIndexed: false,
	},
	{
		key: 'name',
		dataType: DataTypes.String,
		type: 'tag',
		isColumn: true,
		isJSON: false,
		id: 'name--string--tag--true',
		isIndexed: false,
	},
	{
		key: 'durationNano',
		dataType: DataTypes.Float64,
		type: 'tag',
		isColumn: true,
		isJSON: false,
		id: 'durationNano--float64--tag--true',
		isIndexed: false,
	},
	{
		key: 'httpMethod',
		dataType: DataTypes.String,
		type: 'tag',
		isColumn: true,
		isJSON: false,
		id: 'httpMethod--string--tag--true',
		isIndexed: false,
	},
	{
		key: 'responseStatusCode',
		dataType: DataTypes.String,
		type: 'tag',
		isColumn: true,
		isJSON: false,
		id: 'responseStatusCode--string--tag--true',
		isIndexed: false,
	},
];
