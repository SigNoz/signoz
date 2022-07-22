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
		const isInPresent = filter.includes('in');
		const isNotInPresent = filter.includes('not in');

		if (!isNotInPresent && !isInPresent) {
			isError = true;
		}

		const isPresentSplit = isInPresent ? 'in' : '';

		const splitBy = isNotInPresent ? 'not in' : isPresentSplit;

		if (splitBy.length === 0) {
			isError = true;
		}

		const filteredtags = filter.split(splitBy).map((e) => e.trim());

		if (filteredtags.length !== 2) {
			isError = true;
		}

		const filterForTags = filteredtags[1];

		if (!filterForTags) {
			isError = true;
		}

		const removingFirstAndLastBrackets = `${filterForTags?.slice(1, -1)}`;

		const noofFilters = removingFirstAndLastBrackets
			.split(',')
			.map((e) => e.replaceAll(/"/g, ''));

		noofFilters.forEach((e) => {
			const firstChar = e.charAt(0);
			const lastChar = e.charAt(e.length - 1);

			if (firstChar === '"' && lastChar === '"') {
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
	let isError = false;

	const payload = tags
		.map(({ Values, Key, Operator }) => {
			if (Key[0] === undefined) {
				isError = true;
			}

			return `${Key[0]} ${Operator} (${Values.map((e) => {
				return `"${e.replaceAll(/"/g, '')}"`;
			}).join(',')})`;
		})
		.join(' AND ');

	return {
		isError,
		payload,
	};
};
