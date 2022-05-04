import { TraceReducer } from 'types/reducer/trace';

import { ParsedUrl } from '../util';

export const parseAggregateOrderParams = (
	query: string,
	stateCurrent: TraceReducer['spansAggregate']['orderParam'],
): ParsedUrl<TraceReducer['spansAggregate']['orderParam']> => {
	const url = new URLSearchParams(query);

	let current = '';

	const selected = url.get('spanAggregateOrderParam');

	if (selected) {
		try {
			const parsedValue = selected;

			if (parsedValue && typeof parsedValue === 'string') {
				current = parsedValue;
			}
		} catch (error) {
			console.log(error);
			console.log('error while parsing json');
		}
	}

	if (selected) {
		return {
			currentValue: current,
			urlValue: current,
		};
	}

	return {
		currentValue: stateCurrent,
		urlValue: current,
	};
};
