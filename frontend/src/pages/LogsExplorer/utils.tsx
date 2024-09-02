import {
	FiltersType,
	IQuickFiltersConfig,
} from 'components/QuickFilters/QuickFilters';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

export const prepareQueryWithDefaultTimestamp = (query: Query): Query => ({
	...query,
	builder: {
		...query.builder,
		queryData: query.builder.queryData?.map((item) => ({
			...item,
			orderBy: [{ columnName: 'timestamp', order: 'desc' }],
		})),
	},
});

// eslint-disable-next-line @typescript-eslint/naming-convention
export enum SELECTED_VIEWS {
	SEARCH = 'search',
	QUERY_BUILDER = 'query-builder',
	CLICKHOUSE = 'clickhouse',
}

export const LogsQuickFiltersConfig: IQuickFiltersConfig[] = [
	{
		type: FiltersType.CHECKBOX,
		attributeKey: {
			key: 'service.name',
			id: 'service.name--string--resource--true',
			dataType: DataTypes.String,
			type: 'resource',
			isColumn: true,
			isJSON: false,
		},
		defaultOpen: true,
	},
	// {
	// 	type: FiltersType.CHECKBOX,
	// 	attributeKey: {
	// 		key: 'host.name',
	// 		dataType: DataTypes.String,
	// 		type: 'resource',
	// 		isColumn: true,
	// 		isJSON: false,
	// 	},
	// 	defaultOpen: false,
	// },
	// {
	// 	type: FiltersType.CHECKBOX,
	// 	attributeKey: {
	// 		key: 'service.instance.id',
	// 		dataType: DataTypes.String,
	// 		type: 'resource',
	// 		isColumn: true,
	// 		isJSON: false,
	// 	},
	// 	defaultOpen: false,
	// },
];
