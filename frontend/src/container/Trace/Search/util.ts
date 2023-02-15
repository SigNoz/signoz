import { AllMenu } from 'container/Trace/Search/AllTags/Tag';
import { TraceReducer } from 'types/reducer/trace';

import { extractTagType, TagValueTypes } from './AllTags/Tag/utils';

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

	// Split the query string by ' AND '
	const noOfTags = query.split(' AND ');

	// Map over each tag
	const tags: Tags = noOfTags.map((filter) => {
		// Find the operator used in the filter
		const operator =
			AllMenu.find((e) => `${filter} `.includes(` ${e.key} `))?.key || '';

		// Split the filter by the operator
		const [tagName, tagValues] = filter.split(operator).map((e) => e.trim());

		// If the operator is Exists or NotExists, then return the tag object without values
		if (operator === 'Exists' || operator === 'NotExists') {
			return {
				Key: tagName,
				StringValues: [],
				NumberValues: [],
				BoolValues: [],
				Operator: operator as FlatArray<Tags, 1>['Operator'],
			};
		}
		// Check for errors in the filter
		isError = operator.length === 0 || !tagName || !tagValues ? true : isError;

		// Remove the first and last brackets from the tagValues
		const formattedTagValues = tagValues.slice(1, -1);

		// Split the tagValues by ',' and remove any quotes
		const filters = formattedTagValues
			.split(',')
			.map((e) => e.replaceAll(/"/g, ''));

		// Check for errors in the filters
		filters.forEach((e) => {
			const firstChar = e.charAt(0);
			const lastChar = e.charAt(e.length - 1);
			isError = firstChar === '"' && lastChar === '"' ? true : isError;
		});

		// Extract the tag type
		const tagType = extractTagType(tagName);

		// Extract the values for the tag
		const [NumberValues, BoolValues, StringValues, isErr] = extractValues(
			tagType,
			filters,
			isError,
		);
		isError = isErr;

		// Return the tag object
		return {
			Key: tagName,
			StringValues,
			NumberValues,
			BoolValues,
			Operator: operator as FlatArray<Tags, 1>['Operator'],
		};
	});
	return {
		isError,
		payload: tags,
	};
};

const formatValues = (values: TagValueTypes[]): string =>
	values.map((e) => `"${e.toString().replaceAll(/"/g, '')}"`).join(',');

export const parseTagsToQuery = (tags: Tags): PayloadProps<string> => {
	let isError = false;

	// Map over each tag
	const payload = tags
		.map(({ StringValues, NumberValues, BoolValues, Key, Operator }) => {
			// Check if the key of the tag is undefined
			if (!Key) {
				isError = true;
			}
			if (Operator === 'Exists' || Operator === 'NotExists') {
				return `${Key} ${Operator}`;
			}
			// Check if the tag has string values
			if (StringValues.length > 0) {
				// Format the string values and join them with a ','
				const formattedStringValues = formatValues(StringValues);
				return `${Key} ${Operator} (${formattedStringValues})`;
			}

			// Check if the tag has number values
			if (NumberValues.length > 0) {
				// Format the number values and join them with a ','
				const formattedNumberValues = formatValues(NumberValues);
				return `${Key} ${Operator} (${formattedNumberValues})`;
			}

			// Check if the tag has boolean values
			if (BoolValues.length > 0) {
				// Format the boolean values and join them with a ','
				const formattedBoolValues = formatValues(BoolValues);
				return `${Key} ${Operator} (${formattedBoolValues})`;
			}

			return '';
		})
		.join(' AND ');

	return {
		isError,
		payload,
	};
};
