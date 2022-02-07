import { TraceFilterEnum, TraceReducer } from 'types/reducer/trace';
import history from 'lib/history';
import { AllTraceFilterEnum } from 'container/Trace/Filters';
import { PayloadProps as GetFilterPayload } from 'types/api/trace/getFilters';
export * from './parseFilter';
export interface ParsedUrl<T> {
	currentValue: T;
	urlValue: T;
}

export function isTraceFilterEnum(
	value: TraceFilterEnum | string,
): value is TraceFilterEnum {
	if (AllTraceFilterEnum.find((enums) => enums === value)) {
		return true;
	}
	return false;
}

export const updateURL = (
	selectedFilter: TraceReducer['selectedFilter'],
	filterToFetchData: TraceReducer['filterToFetchData'],
	current: TraceReducer['spansAggregate']['total'],
	selectedTags: TraceReducer['selectedTags'],
	filter: TraceReducer['filter'],
	isFilterExclude: TraceReducer['isFilterExclude'],
	userSelectedFilter: TraceReducer['userSelectedFilter'],
) => {
	const search = new URLSearchParams(location.search);
	const preResult: { key: string; value: string }[] = [];

	const keyToSkip = [
		'selected',
		'filterToFetchData',
		'current',
		'selectedTags',
		'filter',
		'isFilterExclude',
		'userSelectedFilter',
	];

	search.forEach((value, key) => {
		if (!keyToSkip.includes(key)) {
			preResult.push({
				key,
				value,
			});
		}
	});

	history.replace(
		`${history.location.pathname}?selected=${JSON.stringify(
			Object.fromEntries(selectedFilter),
		)}&filterToFetchData=${JSON.stringify(
			filterToFetchData,
		)}&current=${current}&selectedTags=${JSON.stringify(
			selectedTags,
		)}&filter=${JSON.stringify(Object.fromEntries(filter))}&${preResult
			.map((e) => `${e.key}=${e.value}`)
			.join('&')}&isFilterExclude=${JSON.stringify(
			Object.fromEntries(isFilterExclude),
		)}&userSelectedFilter=${JSON.stringify(
			Object.fromEntries(userSelectedFilter),
		)}`,
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
