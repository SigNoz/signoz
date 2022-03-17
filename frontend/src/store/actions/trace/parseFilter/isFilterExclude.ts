import { TraceFilterEnum, TraceReducer } from 'types/reducer/trace';

import { isTraceFilterEnum, ParsedUrl } from '../util';

export const parseFilterExclude = (
	query: string,
	stateFilterExclude: TraceReducer['isFilterExclude'],
): ParsedUrl<TraceReducer['isFilterExclude']> => {
	const currentFilter = new Map<TraceFilterEnum, boolean>();

	const url = new URLSearchParams(query);

	const isPresent = url.get('isFilterExclude');

	if (isPresent) {
		try {
			const parsedValue = JSON.parse(isPresent);

			if (typeof parsedValue === 'object') {
				Object.keys(parsedValue).forEach((key) => {
					if (isTraceFilterEnum(key)) {
						const keyValue = parsedValue[key];
						if (typeof keyValue === 'boolean') {
							currentFilter.set(key, keyValue);
						}
					}
				});
			}
		} catch (error) {
			// parsing the value
		}
	}

	if (isPresent) {
		return {
			currentValue: currentFilter,
			urlValue: currentFilter,
		};
	}

	return {
		currentValue: stateFilterExclude,
		urlValue: currentFilter,
	};
};
