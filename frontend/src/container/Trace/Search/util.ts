import { AllMenu } from 'container/Trace/Search/AllTags/Tag';
import { TraceReducer } from 'types/reducer/trace';

import { extractTagType } from './AllTags/Tag/utils';

type Tags = TraceReducer['selectedTags'];

interface PayloadProps<T> {
	isError: boolean;
	payload: T;
}

function extractValues(
	tagType: string,
	filters: string[],
	isError: boolean,
): [number[], boolean[], string[], boolean] {
	const StringValues: string[] = [];
	const NumberValues: number[] = [];
	const BoolValues: boolean[] = [];
	let isErr = isError;
	if (tagType === 'string') {
		StringValues.push(...filters);
	} else if (tagType === 'number') {
		filters.forEach((element) => {
			const num = Number(element);
			isErr = Number.isNaN(num) ? true : isError;
			NumberValues.push(num);
		});
	} else if (tagType === 'bool') {
		filters.forEach((element) => {
			if (element === 'true') {
				BoolValues.push(true);
			} else if (element === 'false') {
				BoolValues.push(false);
			} else {
				isErr = true;
			}
		});
	}
	return [NumberValues, BoolValues, StringValues, isErr];
}

export const parseQueryToTags = (query: string): PayloadProps<Tags> => {
	let isError = false;
	console.log(query);
	const noOfTags = query.split(' AND ');

	const tags: Tags = noOfTags.map((filter) => {
		const splitBy = AllMenu.find((e) => filter.includes(` ${e.key} `))?.key || '';

		const filteredTags = filter.split(splitBy).map((e) => e.trim());

		const filterForTags = filteredTags[1];

		isError =
			splitBy.length === 0 || filteredTags.length !== 2 || !filterForTags
				? true
				: isError;

		const removingFirstAndLastBrackets = `${filterForTags?.slice(1, -1)}`;

		const filters = removingFirstAndLastBrackets
			.split(',')
			.map((e) => e.replaceAll(/"/g, ''));

		filters.forEach((e) => {
			const firstChar = e.charAt(0);
			const lastChar = e.charAt(e.length - 1);
			isError = firstChar === '"' && lastChar === '"' ? true : isError;
		});

		const tagType = extractTagType(filteredTags[0]);
		const [NumberValues, BoolValues, StringValues, isErr] = extractValues(
			tagType,
			filters,
			isError,
		);
		isError = isErr;
		return {
			Key: [filteredTags[0]],
			StringValues,
			NumberValues,
			BoolValues,
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
		.map(({ StringValues, NumberValues, BoolValues, Key, Operator }) => {
			if (Key[0] === undefined) {
				isError = true;
			}
			if (StringValues.length > 0) {
				return `${Key[0]} ${Operator} (${StringValues.map((e) => {
					return `"${e.replaceAll(/"/g, '')}"`;
				}).join(',')})`;
			}
			if (NumberValues.length > 0) {
				return `${Key[0]} ${Operator} (${NumberValues.map((e) => {
					return `"${e.toString().replaceAll(/"/g, '')}"`;
				}).join(',')})`;
			}
			if (BoolValues.length > 0) {
				return `${Key[0]} ${Operator} (${BoolValues.map((e) => {
					return `"${e.toString().replaceAll(/"/g, '')}"`;
				}).join(',')})`;
			}
			return '';
		})
		.join(' AND ');

	return {
		isError,
		payload,
	};
};
