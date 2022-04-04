import { TraceFilterEnum, TraceReducer } from 'types/reducer/trace';

import { ParsedUrl } from '../util';

export const parseFilterToFetchData = (
	query: string,
	stateTraceFilterData: TraceReducer['filterToFetchData'],
): ParsedUrl<TraceFilterEnum[]> => {
	const url = new URLSearchParams(query);

	const filterToFetchData: TraceFilterEnum[] = [];

	const selected = url.get('filterToFetchData');

	if (selected) {
		try {
			const parsedValue = JSON.parse(decodeURIComponent(selected));

			if (Array.isArray(parsedValue)) {
				filterToFetchData.push(...parsedValue);
			}
		} catch (error) {
			// error while parsing json
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
