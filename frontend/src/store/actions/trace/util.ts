import createQueryParams from 'lib/createQueryParams';
import history from 'lib/history';
import { PayloadProps as GetFilterPayload } from 'types/api/trace/getFilters';
import { TraceFilterEnum, TraceReducer } from 'types/reducer/trace';

import { isTraceFilterEnum } from './shared';

export const updateURL = (
	selectedFilter: TraceReducer['selectedFilter'],
	filterToFetchData: TraceReducer['filterToFetchData'],
	spanAggregateCurrentPage: TraceReducer['spansAggregate']['currentPage'],
	selectedTags: TraceReducer['selectedTags'],
	isFilterExclude: TraceReducer['isFilterExclude'],
	userSelectedFilter: TraceReducer['userSelectedFilter'],
	spanAggregateOrder: TraceReducer['spansAggregate']['order'],
	spanAggregateCurrentPageSize: TraceReducer['spansAggregate']['pageSize'],
	spanAggregateOrderParam: TraceReducer['spansAggregate']['orderParam'],
): void => {
	const search = new URLSearchParams(window.location.search);
	const preResult: { key: string; value: string }[] = [];

	const keyToSkip = [
		'selected',
		'filterToFetchData',
		'selectedTags',
		'filter',
		'isFilterExclude',
		'userSelectedFilter',
		'spanAggregateCurrentPage',
		'spanAggregateOrder',
		'spanAggregateCurrentPageSize',
		'spanAggregateOrderParam',
	];

	search.forEach((value, key) => {
		if (!keyToSkip.includes(key)) {
			preResult.push({
				key,
				value,
			});
		}
	});

	const preResultParams = preResult.reduce((acc, item) => {
		acc[item.key] = item.value;
		return acc;
	}, {} as Record<string, string>);

	const queryParams = {
		selected: JSON.stringify(Object.fromEntries(selectedFilter)),
		filterToFetchData: JSON.stringify(filterToFetchData),
		spanAggregateCurrentPage,
		spanAggregateOrder,
		spanAggregateCurrentPageSize,
		spanAggregateOrderParam,
		selectedTags: JSON.stringify(selectedTags),
		...preResultParams,
		isFilterExclude: JSON.stringify(Object.fromEntries(isFilterExclude)),
		userSelectedFilter: JSON.stringify(Object.fromEntries(userSelectedFilter)),
	};
	history.replace(
		`${window.location.pathname}?${createQueryParams(queryParams)}`,
	);
};

export const getFilter = (data: GetFilterPayload): TraceReducer['filter'] => {
	const filter = new Map<TraceFilterEnum, Record<string, string>>();

	Object.keys(data).forEach((key) => {
		const value = data[key];
		if (isTraceFilterEnum(key)) {
			filter.set(key, value);
		}
	});

	return filter;
};

export const stripTimestampsFromQuery = (query: string): string =>
	query
		.replace(/(\?|&)startTime=\d+/, '')
		.replace(/&endTime=\d+/, '')
		.replace(/[?&]relativeTime=[^&]+/g, '');

// Re-export parse filter helpers so callers can import them from './util'
export * from './parseFilter';
