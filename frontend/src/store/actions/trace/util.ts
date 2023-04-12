import { AllTraceFilterEnum } from 'container/Trace/Filters';
import history from 'lib/history';
import { PayloadProps as GetFilterPayload } from 'types/api/trace/getFilters';
import { TraceFilterEnum, TraceReducer } from 'types/reducer/trace';

export * from './parseFilter';
export interface ParsedUrl<T> {
	currentValue: T;
	urlValue: T;
}

export function isTraceFilterEnum(
	value: TraceFilterEnum | string,
): value is TraceFilterEnum {
	return !!AllTraceFilterEnum.find((enums) => enums === value);
}

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
	const updatedUserSelectedFilter = Object.fromEntries(userSelectedFilter);

	updatedUserSelectedFilter.httpUrl = [];

	history.replace(
		`${history.location.pathname}?selected=${JSON.stringify(
			Object.fromEntries(selectedFilter),
		)}&filterToFetchData=${JSON.stringify(
			filterToFetchData,
		)}&selectedTags=${JSON.stringify(
			selectedTags,
		)}&isFilterExclude=${JSON.stringify(
			Object.fromEntries(isFilterExclude),
		)}&userSelectedFilter=${JSON.stringify(
			updatedUserSelectedFilter,
		)}&spanAggregateCurrentPage=${spanAggregateCurrentPage}&spanAggregateOrder=${spanAggregateOrder}&spanAggregateCurrentPageSize=${spanAggregateCurrentPageSize}&spanAggregateOrderParam=${spanAggregateOrderParam}`,
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
