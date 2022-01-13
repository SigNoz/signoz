import { TraceFilterEnum } from 'types/reducer/trace';

export const parseQuery = (query: string): Map<string, string> => {
	const url = new URLSearchParams(query);

	const filters = new Map<string, string>();

	const setFilters = (value: string, key: string) => {
		filters.set(key, JSON.parse(value));
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

export const convertMapIntoStringifyString = (
	map: Map<TraceFilterEnum, Record<string, string>>,
) => {
	const parsedFilter = Object.fromEntries(map);

	return Object.keys(parsedFilter)
		.map((e) => `${e}=${JSON.stringify(parsedFilter[e])}`)
		.join('&');
};
