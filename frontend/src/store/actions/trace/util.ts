import { TraceFilterEnum, TraceReducer } from 'types/reducer/trace';
import history from 'lib/history';
import { GlobalTime } from 'types/actions/globalTime';

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

export const parseSelectedFilter = (
	query: string,
	selectedFilter: TraceReducer['selectedFilter'],
): ParsedUrl<Map<TraceFilterEnum, string[]>> => {
	const url = new URLSearchParams(query);

	const filters = new Map<TraceFilterEnum, string[]>();

	url.forEach((value, key) => {
		if (key === 'selected') {
			try {
				const parsedValue = JSON.parse(decodeURIComponent(value));
				if (typeof parsedValue === 'object') {
					Object.keys(parsedValue).forEach((e) => {
						filters.set(e as TraceFilterEnum, parsedValue[e]);
					});
				}
			} catch (error) {
				// if the parsing error happens
			}
		}
	});

	if (filters.size === 0) {
		return {
			urlValue: filters,
			currentValue: selectedFilter,
		};
	}

	return {
		urlValue: filters,
		currentValue: filters,
	};
};

export const parseFilterToFetchData = (
	query: string,
	stateTraceFilterData: TraceReducer['filterToFetchData'],
): ParsedUrl<TraceFilterEnum[]> => {
	const url = new URLSearchParams(query);

	let filterToFetchData: TraceFilterEnum[] = [];

	url.forEach((value, key) => {
		if (key === 'filterToFetchData') {
			try {
				const parsedValue = JSON.parse(decodeURIComponent(value));

				if (Array.isArray(parsedValue)) {
					filterToFetchData.push(...parsedValue);
				}
			} catch (error) {
				console.log('error while parsing json');
			}
		}
	});

	if (filterToFetchData.length === 0) {
		return {
			currentValue: stateTraceFilterData,
			urlValue: filterToFetchData,
		};
	}

	return {
		currentValue: filterToFetchData,
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
		const parsedQuerySelectedTags = JSON.parse(querySelectedTags);

		if (Array.isArray(parsedQuerySelectedTags)) {
			selectedTags = parsedQuerySelectedTags;
		}
	}

	if (selectedTags.length == 0) {
		return {
			currentValue: stateSelectedTags,
			urlValue: selectedTags,
		};
	}

	return {
		currentValue: selectedTags,
		urlValue: selectedTags,
	};
};

export const parseQueryIntoCurrent = (
	query: string,
	stateCurrent: TraceReducer['spansAggregate']['currentPage'],
): ParsedUrl<TraceReducer['spansAggregate']['currentPage']> => {
	const url = new URLSearchParams(query);

	let current = 0;

	url.forEach((value, key) => {
		if (key === 'current') {
			try {
				const parsedValue = JSON.parse(decodeURIComponent(value));
				if (Number.isInteger(parsedValue)) {
					current = parseInt(parsedValue, 10);
				}
			} catch (error) {
				console.log('error while parsing json');
			}
		}
	});

	if (current === 0) {
		return {
			currentValue: stateCurrent,
			urlValue: current,
		};
	}

	return {
		currentValue: current,
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
) => {
	history.replace(
		`${history.location.pathname}?selected=${JSON.stringify(
			Object.fromEntries(selectedFilter),
		)}&filterToFetchData=${JSON.stringify(
			filterToFetchData,
		)}&current=${current}&selectedTags=${JSON.stringify(selectedTags)}`,
	);
};
