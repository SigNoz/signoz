import { TraceReducer } from 'types/reducer/trace';

import { ParsedUrl } from '../util';

export const parseQueryIntoCurrent = (
	query: string,
	stateCurrent: TraceReducer['spansAggregate']['currentPage'],
): ParsedUrl<TraceReducer['spansAggregate']['currentPage']> => {
	const url = new URLSearchParams(query);

	let current = 1;

	const selected = url.get('spanAggregateCurrentPage');

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
