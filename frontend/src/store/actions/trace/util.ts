import { TraceFilterEnum, TraceReducer } from 'types/reducer/trace';
import history from 'lib/history';
import { GlobalTime } from 'types/actions/globalTime';
import { AllTraceFilterEnum } from 'container/Trace/Filters';
import { PayloadProps as GetFilterPayload } from 'types/api/trace/getFilters';

export const parseMinMaxTime = (query: string): GlobalTime => {
	const url = new URLSearchParams(query);
	let maxTime = 0;
	let minTime = 0;

	const urlMaxTime = url.get('minTime');
	const urlMinTime = url.get('maxTime');

	if (urlMaxTime && urlMinTime) {
		maxTime = parseInt(urlMaxTime);
		minTime = parseInt(urlMinTime);
	}

	return {
		maxTime,
		minTime,
	};
};

interface ParsedUrl<T> {
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

export const parseSelectedFilter = (
	query: string,
	selectedFilter: TraceReducer['selectedFilter'],
): ParsedUrl<Map<TraceFilterEnum, string[]>> => {
	const url = new URLSearchParams(query);

	const filters = new Map<TraceFilterEnum, string[]>();

	const selected = url.get('selected');

	if (selected) {
		try {
			const parsedValue = JSON.parse(decodeURIComponent(selected));
			if (typeof parsedValue === 'object') {
				Object.keys(parsedValue).forEach((e) => {
					if (isTraceFilterEnum(e)) {
						filters.set(e, parsedValue[e]);
					}
				});
			}
		} catch (error) {
			// if the parsing error happens
		}
	}

	if (selected) {
		return {
			urlValue: filters,
			currentValue: filters,
		};
	}

	return {
		urlValue: filters,
		currentValue: selectedFilter,
	};
};

export const parseFilterToFetchData = (
	query: string,
	stateTraceFilterData: TraceReducer['filterToFetchData'],
): ParsedUrl<TraceFilterEnum[]> => {
	const url = new URLSearchParams(query);

	let filterToFetchData: TraceFilterEnum[] = [];

	const selected = url.get('filterToFetchData');

	if (selected) {
		try {
			const parsedValue = JSON.parse(decodeURIComponent(selected));

			if (Array.isArray(parsedValue)) {
				filterToFetchData.push(...parsedValue);
			}
		} catch (error) {
			console.log('error while parsing json');
		}
	}

	if (selected) {
		return {
			currentValue: filterToFetchData,
			urlValue: filterToFetchData,
		};
	}

	return {
		currentValue: stateTraceFilterData,
		urlValue: filterToFetchData,
	};
};

export const parseQueryIntoSelectedTags = (
	query: string,
	stateSelectedTags: TraceReducer['selectedTags'],
): ParsedUrl<TraceReducer['selectedTags']> => {
	const url = new URLSearchParams(query);

	let selectedTags: TraceReducer['selectedTags'] = [];

	const querySelectedTags = url.get('selectedTags');

	if (querySelectedTags) {
		try {
			const parsedQuerySelectedTags = JSON.parse(querySelectedTags);

			if (Array.isArray(parsedQuerySelectedTags)) {
				selectedTags = parsedQuerySelectedTags;
			}
		} catch (error) {
			//error while parsing
		}
	}

	if (querySelectedTags) {
		return {
			currentValue: selectedTags,
			urlValue: selectedTags,
		};
	}

	return {
		currentValue: stateSelectedTags,
		urlValue: selectedTags,
	};
};

export const parseQueryIntoFilter = (
	query: string,
	stateFilter: TraceReducer['filter'],
): ParsedUrl<TraceReducer['filter']> => {
	const urlFilter = new Map<TraceFilterEnum, Record<string, string>>();
	const url = new URLSearchParams(query);

	const selected = url.get('filter');

	if (selected) {
		try {
			const parsedValue = JSON.parse(selected);

			if (typeof parsedValue === 'object') {
				Object.keys(parsedValue).forEach((key) => {
					if (isTraceFilterEnum(key)) {
						const value = parsedValue[key];
						if (typeof value === 'object') {
							urlFilter.set(key, value);
						}
					}
				});
			}
		} catch (error) {
			console.log(error);
		}
	}

	if (selected) {
		return {
			currentValue: urlFilter,
			urlValue: urlFilter,
		};
	}

	return {
		currentValue: stateFilter,
		urlValue: urlFilter,
	};
};

export const parseQueryIntoCurrent = (
	query: string,
	stateCurrent: TraceReducer['spansAggregate']['currentPage'],
): ParsedUrl<TraceReducer['spansAggregate']['currentPage']> => {
	const url = new URLSearchParams(query);

	let current = 0;

	const selected = url.get('current');

	if (selected) {
		try {
			const parsedValue = JSON.parse(decodeURIComponent(selected));
			if (Number.isInteger(parsedValue)) {
				current = parseInt(parsedValue, 10);
			}
		} catch (error) {
			console.log('error while parsing json');
		}
	}

	if (selected) {
		return {
			currentValue: parseInt(selected, 10),
			urlValue: current,
		};
	}

	return {
		currentValue: stateCurrent,
		urlValue: current,
	};
};

export const convertMapIntoStringifyString = (
	map: Map<TraceFilterEnum, Record<string, string>>,
) => {
	const parsedFilter = Object.fromEntries(map);

	return Object.keys(parsedFilter)
		.map((e) => `${e}=${JSON.stringify(parsedFilter[e])}`)
		.join('&');
};

export const updateURL = (
	selectedFilter: TraceReducer['selectedFilter'],
	filterToFetchData: TraceReducer['filterToFetchData'],
	current: TraceReducer['spansAggregate']['total'],
	selectedTags: TraceReducer['selectedTags'],
	filter: TraceReducer['filter'],
) => {
	const search = new URLSearchParams(location.search);
	const preResult: { key: string; value: string }[] = [];

	const keyToSkip = [
		'selected',
		'filterToFetchData',
		'current',
		'selectedTags',
		'filter',
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
			.join('&')}`,
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
