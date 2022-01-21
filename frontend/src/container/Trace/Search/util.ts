import { TraceReducer } from 'types/reducer/trace';

type Tags = TraceReducer['selectedTags'];

interface PayloadProps<T> {
	isError: boolean;
	payload: T;
}

export const parseQueryToTags = (query: string): PayloadProps<Tags> => {
	let isError = false;

	const noOfTags = query.split(' AND ');

	const tags: Tags = noOfTags.map((filter) => {
		const isInPresent = filter.includes('IN');
		const isNotInPresent = filter.includes('NOT_IN');

		if (!isNotInPresent || !isInPresent) {
			isError = true;
		}

		const splitBy = isNotInPresent ? 'NOT_IN' : isInPresent ? 'IN' : '';

		if (splitBy.length === 0) {
			isError = true;
		}

		const filteredtags = filter.split(splitBy).map((e) => e.trim());

		if (filteredtags.length !== 2) {
			isError = true;
		}

		const filterForTags = filteredtags[1];

		const removingFirstAndLastBrackets = `${filterForTags.slice(1, -1)}`;

		const noofFilters = removingFirstAndLastBrackets.split(',');

		noofFilters.forEach((e) => {
			const firstChar = e.charAt(0);
			const lastChar = e.charAt(e.length - 1);

			if (!(firstChar === '"' && lastChar === '"')) {
				isError = true;
			}
		});

		return {
			Key: [filteredtags[0]],
			Values: noofFilters,
			Operator: splitBy as FlatArray<Tags, 1>['Operator'],
		};
	});

	return {
		isError,
		payload: tags,
	};
};

export const parseTagsToQuery = (tags: Tags): PayloadProps<string> => {
	return {
		isError: false,
		payload: tags
			.map(
				({ Values, Key, Operator }) =>
					`${Key[0]} ${Operator} (${Values.map((e) => `"${e}"`).join(',')})`,
			)
			.join(' AND '),
	};
};
