import { TraceReducer } from 'types/reducer/trace';

import { ParsedUrl } from '../util';

export const parseQueryIntoSelectedTags = (
	query: string,
	stateSelectedTags: TraceReducer['selectedTags'],
): ParsedUrl<TraceReducer['selectedTags']> => {
	const url = new URLSearchParams(query);

	let selectedTags: TraceReducer['selectedTags'] = [];

	const querySelectedTags = url.get('selectedTags');

	if (querySelectedTags) {
		try {
			const parsedQuerySelectedTags = JSON.parse(querySelectedTags);

			if (Array.isArray(parsedQuerySelectedTags)) {
				selectedTags = parsedQuerySelectedTags;
			}
		} catch (error) {
			// error while parsing
		}
	}

	if (querySelectedTags) {
		return {
			currentValue: selectedTags,
			urlValue: selectedTags,
		};
	}

	return {
		currentValue: stateSelectedTags,
		urlValue: selectedTags,
	};
};
