import { QueryParams } from 'constants/query';
import { History, Location } from 'history';
import { Widgets } from 'types/api/dashboard/getAll';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { TagFilterItem } from 'types/api/queryBuilder/queryBuilderData';
import { v4 as uuidv4 } from 'uuid';

export function getValuesFromQueryParams(
	queryParams: QueryParams,
	urlQuery: URLSearchParams,
): string[] {
	const value = urlQuery.get(queryParams);
	return value ? value.split(',') : [];
}

export function setQueryParamsFromOptions(
	value: string[],
	urlQuery: URLSearchParams,
	history: History<unknown>,
	location: Location<unknown>,
	queryParams: QueryParams,
): void {
	urlQuery.set(queryParams, value.join(','));
	const generatedUrl = `${location.pathname}?${urlQuery.toString()}`;
	history.replace(generatedUrl);
}

export function getFiltersFromQueryParams(
	queryParams: QueryParams,
	urlQuery: URLSearchParams,
	key: string,
): TagFilterItem[] {
	const value = urlQuery.get(queryParams);
	const filters = value ? value.split(',') : [];
	return filters.map((value) => ({
		id: uuidv4(),
		key: {
			key,
			dataType: DataTypes.String,
			type: 'tag',
			isColumn: false,
			isJSON: false,
			id: `${key}--string--tag--false`,
		},
		op: '=',
		value: value.toString(),
	}));
}

export function applyCeleryFilterOnWidgetData(
	filters: TagFilterItem[],
	widgetData: Widgets,
): Widgets {
	console.log(filters, widgetData);
	return {
		...widgetData,
		query: {
			...widgetData.query,
			builder: {
				...widgetData.query.builder,
				queryData: widgetData.query.builder.queryData.map((queryItem, index) =>
					index === 0
						? {
								...queryItem,
								filters: {
									...queryItem.filters,
									items: [...queryItem.filters.items, ...filters],
								},
						  }
						: queryItem,
				),
			},
		},
	};
}
