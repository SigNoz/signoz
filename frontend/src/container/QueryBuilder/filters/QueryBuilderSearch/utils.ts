import { OPERATORS } from 'constants/queryBuilder';
import { parse } from 'papaparse';

import { orderByValueDelimiter } from '../OrderByFilter/utils';

const operators = /=|!=|>=|>|<=|<$/;

// eslint-disable-next-line no-useless-escape
export const tagRegexpV1 = /^\s*(.*?)\s*(=|!=|>=|>|<=)\s*(.*)$/g;

export const tagRegexpV2 = /^\s*(.+?)\s+(IN|in|nin|NIN|LIKE|like|NLIKE|nlike|REGEX|regex|NREGEX|nregex|EXISTS|exists|NEXISTS|nexists|CONTAINS|contains|NCONTAINS|ncontains|HAS|has|NHAS|nhas|=|!=|>=|>|<=|<)\s*(.*)$/g;

export function isInNInOperator(value: string): boolean {
	return value === OPERATORS.IN || value === OPERATORS.NIN;
}

function endsWithOperator(inputString: string): boolean {
	return operators.test(inputString);
}

interface ITagToken {
	tagKey: string;
	tagOperator: string;
	tagValue: string[];
}

export function getMatchRegex(str: string): RegExp {
	if (endsWithOperator(str)) {
		return tagRegexpV1;
	}

	return tagRegexpV2;
}

export function getTagToken(tag: string): ITagToken {
	const matches = tag?.matchAll(getMatchRegex(tag));
	const [match] = matches ? Array.from(matches) : [];

	if (match) {
		const [, matchTagKey, matchTagOperator, matchTagValue] = match;

		return {
			tagKey: matchTagKey,
			tagOperator: matchTagOperator,
			tagValue: isInNInOperator(matchTagOperator)
				? parse(matchTagValue).data.flat()
				: matchTagValue,
		} as ITagToken;
	}

	return {
		tagKey: tag,
		tagOperator: '',
		tagValue: [],
	};
}

export function isExistsNotExistsOperator(value: string): boolean {
	const { tagOperator } = getTagToken(value);

	return (
		tagOperator?.trim() === OPERATORS.NOT_EXISTS.toLocaleLowerCase() ||
		tagOperator?.trim() === OPERATORS.EXISTS.toLocaleLowerCase()
	);
}

export function getRemovePrefixFromKey(tag: string): string {
	return tag?.replace(/^(tag_|resource_)/, '').trim();
}

export function getOperatorValue(op: string): string {
	return op.toLocaleLowerCase();
}

export function getOperatorFromValue(op: string): string {
	return op.toLocaleLowerCase();
}

export function replaceStringWithMaxLength(
	mainString: string,
	array: string[],
	replacementString: string,
): string {
	const lastSearchValue = array.pop() ?? ''; // Remove the last search value from the array
	if (lastSearchValue === '') return `${mainString}${replacementString},`; // if user select direclty from options
	return mainString.replace(lastSearchValue, `${replacementString},`);
}

export function checkCommaInValue(str: string): string {
	return str.includes(',') ? `"${str}"` : str;
}

export function getRemoveOrderFromValue(tag: string): string {
	const match = parse(tag, { delimiter: orderByValueDelimiter });
	if (match) {
		const [key] = match.data.flat() as string[];
		return key;
	}
	return tag;
}
