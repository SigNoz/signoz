import { TraceFilterEnum, TraceReducer } from 'types/reducer/trace';

import { isTraceFilterEnum, ParsedUrl } from '../util';

export const parseSelectedFilter = (
	query: string,
	selectedFilter: TraceReducer['selectedFilter'],
	isUserSelected = false,
): ParsedUrl<Map<TraceFilterEnum, string[]>> => {
	const url = new URLSearchParams(query);

	const filters = new Map<TraceFilterEnum, string[]>();

	const title = isUserSelected ? 'selected' : 'userSelectedFilter';

	const selected = url.get(title);

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
