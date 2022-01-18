import { TraceFilterEnum, TraceReducer } from 'types/reducer/trace';
import history from 'lib/history';

export const parseQuery = (query: string): Map<string, string> => {
	const url = new URLSearchParams(query);

	const filters = new Map<string, string>();

	const setFilters = (value: string, key: string) => {
		filters.set(key, JSON.parse(decodeURIComponent(value)));
	};

	url.forEach((value, key) => {
		if (key === 'status') {
			setFilters(value, key);
		}

		if (key === 'serviceName') {
			setFilters(value, key);
		}

		if (key === 'httpRoute') {
			setFilters(value, key);
		}

		if (key === 'httpCode') {
			setFilters(value, key);
		}

		if (key === 'httpUrl') {
			setFilters(value, key);
		}

		if (key === 'httpHost') {
			setFilters(value, key);
		}

		if (key === 'httpMethod') {
			setFilters(value, key);
		}

		if (key === 'httpMethod') {
			setFilters(value, key);
		}
		if (key === 'duration') {
			setFilters(value, key);
		}
	});

	return filters;
};

export const parseSelectedFilter = (query: string): Map<string, string[]> => {
	const url = new URLSearchParams(query);

	const filters = new Map<string, string[]>();

	url.forEach((value, key) => {
		if (key === 'selected') {
			try {
				const parsedValue = JSON.parse(decodeURIComponent(value));
				if (typeof parsedValue === 'object') {
					Object.keys(parsedValue).forEach((e) => {
						filters.set(e, parsedValue[e]);
					});
				}
			} catch (error) {
				// if the parsing error happens
			}
		}
	});

	return filters;
};

export const parseFilterToFetchData = (query: string) => {
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

	return filterToFetchData;
};

export const parseQueryIntoCurrent = (query: string) => {
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

	return current;
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
	filter: TraceReducer['filter'],
	selectedFilter: TraceReducer['selectedFilter'],
	filterToFetchData: TraceReducer['filterToFetchData'],
	current: TraceReducer['spansAggregate']['total'],
) => {
	const key = convertMapIntoStringifyString(filter);

	history.replace(
		`${history.location.pathname}?${key}&selected=${JSON.stringify(
			Object.fromEntries(selectedFilter),
		)}&filterToFetchData=${JSON.stringify(filterToFetchData)}&current=${current}`,
	);
};
