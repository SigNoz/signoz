import { OPERATORS } from 'constants/queryBuilder';
import { MetricsType } from 'container/MetricsApplication/constant';
import { queryFilterTags } from 'hooks/queryBuilder/useTag';
import { parse } from 'papaparse';
import { TagFilter } from 'types/api/queryBuilder/queryBuilderData';

import { orderByValueDelimiter } from '../OrderByFilter/utils';

export const tagRegexp =
	/^\s*(.*?)\s*(\bIN\b|\bNOT_IN\b|\bNIN\b|\bLIKE\b|\bNOT_LIKE\b|\bNLIKE\b|\bILIKE\b|\bNOT_ILIKE\b|\bNOTILIKE\b|\bREGEX\b|\bNOT_REGEX\b|\bNREGEX\b|=|!=|\bEXISTS\b|\bNOT_EXISTS\b|\bNEXISTS\b|\bCONTAINS\b|\bNOT_CONTAINS\b|\bNCONTAINS\b|>=|>|<=|<|\bHAS\b|\bNHAS\b)\s*(.*)$/gi;

export function isInNInOperator(value: string): boolean {
	return (
		value === 'IN' ||
		value === 'NOT_IN' ||
		value === 'NIN' ||
		value === 'in' ||
		value === 'not in' ||
		value === 'nin'
	);
}

interface ITagToken {
	tagKey: string;
	tagOperator: string;
	tagValue: string[];
}

export function getTagToken(tag: string): ITagToken {
	const matches = tag?.matchAll(tagRegexp);
	const [match] = matches ? Array.from(matches) : [];

	if (match) {
		const [, matchTagKey, matchTagOperator, matchTagValue] = match;
		return {
			tagKey: matchTagKey,
			tagOperator: matchTagOperator.toUpperCase(),
			tagValue: isInNInOperator(matchTagOperator.toUpperCase())
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
		tagOperator?.trim() === OPERATORS.NOT_EXISTS ||
		tagOperator?.trim() === OPERATORS.EXISTS ||
		tagOperator?.trim() === 'NEXISTS'
	);
}

export function getRemovePrefixFromKey(tag: string): string {
	return tag?.replace(/^(tag_|resource_)/, '').trim();
}

export function getOperatorValue(op: string): string {
	switch (op) {
		case 'IN':
			return 'in';
		case 'NOT_IN':
			return 'not in';
		case OPERATORS.REGEX:
			return 'regex';
		case OPERATORS.HAS:
			return 'has';
		case OPERATORS.NHAS:
			return 'not has';
		case OPERATORS.NREGEX:
			return 'not regex';
		case 'LIKE':
			return 'like';
		case 'ILIKE':
			return 'ilike';
		case 'NOT_LIKE':
			return 'not like';
		case 'NOT_ILIKE':
			return 'not ilike';
		case 'EXISTS':
			return 'exists';
		case 'NOT_EXISTS':
			return 'not exists';
		case 'CONTAINS':
			return 'contains';
		case 'NOT_CONTAINS':
			return 'not contains';
		// Short form operators (InfraMonitoring)
		case 'NIN':
			return 'nin';
		case 'NLIKE':
			return 'nlike';
		case 'NOTILIKE':
			return 'notilike';
		case 'NREGEX':
			return 'nregex';
		case 'NEXISTS':
			return 'nexists';
		case 'NCONTAINS':
			return 'ncontains';
		default:
			return op;
	}
}

export function getOperatorFromValue(op: string): string {
	switch (op) {
		case 'in':
			return 'IN';
		case 'not in':
			return 'NOT_IN';
		case 'like':
			return 'LIKE';
		case 'regex':
			return OPERATORS.REGEX;
		case 'not regex':
			return OPERATORS.NREGEX;
		case 'not like':
			return 'NOT_LIKE';
		case 'exists':
			return 'EXISTS';
		case 'not exists':
			return 'NOT_EXISTS';
		case 'contains':
			return 'CONTAINS';
		case 'not contains':
			return 'NOT_CONTAINS';
		case 'has':
			return OPERATORS.HAS;
		case 'not has':
			return OPERATORS.NHAS;
		// Short-form operators (InfraMonitoring)
		case 'nin':
			return 'NIN';
		case 'nlike':
			return 'NLIKE';
		case 'notilike':
			return 'NOTILIKE';
		case 'nregex':
			return 'NREGEX';
		case 'nexists':
			return 'NEXISTS';
		case 'ncontains':
			return 'NCONTAINS';
		default:
			return op;
	}
}

export function replaceStringWithMaxLength(
	mainString: string,
	array: string[],
	replacementString: string,
): string {
	const lastSearchValue = array.pop() ?? '';
	if (lastSearchValue === '') {
		return `${mainString}${replacementString},`;
	}
	/**
	 * We need to escape the special characters in the lastSearchValue else the
	 * new RegExp fails with error range out of order in char class
	 */
	const escapedLastSearchValue = lastSearchValue.replace(
		/[-/\\^$*+?.()|[\]{}]/g,
		'\\$&',
	);

	const updatedString = mainString.replace(
		new RegExp(`${escapedLastSearchValue}(?=[^${escapedLastSearchValue}]*$)`),
		replacementString,
	);
	return `${updatedString},`;
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

export function getOptionType(label: string): MetricsType | undefined {
	let optionType;

	if (label.startsWith('tag_')) {
		optionType = MetricsType.Tag;
	} else if (label.startsWith('resource_')) {
		optionType = MetricsType.Resource;
	}

	return optionType;
}

/**
 *
 * @param exampleQueries the example queries based on recommendation engine
 * @returns the data formatted to the Option[]
 */
export function convertExampleQueriesToOptions(
	exampleQueries: TagFilter[],
): { label: string; value: TagFilter }[] {
	return exampleQueries.map((query) => ({
		value: query,
		label: queryFilterTags(query).join(' , '),
	}));
}
