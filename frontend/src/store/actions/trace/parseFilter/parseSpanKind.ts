import { TraceReducer } from 'types/reducer/trace';

import { ParsedUrl } from '../util';

export const parseQueryIntoSpanKind = (
	query: string,
	stateCurrent: TraceReducer['spanKind'],
): ParsedUrl<TraceReducer['spanKind']> => {
	const url = new URLSearchParams(query);

	let current = '';

	const selected = url.get('spanKind');

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
