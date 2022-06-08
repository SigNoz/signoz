import { TraceFilterEnum, TraceReducer } from 'types/reducer/trace';

import { isTraceFilterEnum, ParsedUrl } from '../util';

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
			console.error(error);
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
