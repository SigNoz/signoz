/* eslint-disable no-param-reassign */
/* eslint-disable no-restricted-syntax */
/* eslint-disable sonarjs/cognitive-complexity */
import { decode, encode } from 'js-base64';
import { flattenDeep } from 'lodash-es';
import { Dashboard } from 'types/api/dashboard/getAll';

import { IQueryStructure, TCategory, TOperator } from './types';

export const convertQueriesToURLQuery = (
	queries: IQueryStructure[],
): string => {
	if (!queries || !queries.length) {
		return '';
	}

	return encode(JSON.stringify(queries));
};

export const convertURLQueryStringToQuery = (
	queryString: string,
): IQueryStructure[] => {
	return JSON.parse(decode(queryString));
};

export const resolveOperator = (
	result: unknown,
	operator: TOperator,
): boolean => {
	if (operator === '!=') {
		return !result;
	}
	if (operator === '=') {
		return !!result;
	}
	return !!result;
};
export const executeSearchQueries = (
	queries: IQueryStructure[] = [],
	searchData: Dashboard[] = [],
): Dashboard[] => {
	if (!searchData.length || !queries.length) {
		return searchData;
	}

	queries.forEach((query: IQueryStructure) => {
		const { operator } = query;
		let { value } = query;
		const categoryLowercase: TCategory = `${query.category}`.toLowerCase() as
			| 'title'
			| 'description';
		value = flattenDeep([value]);

		searchData = searchData.filter(({ data: searchPayload }: Dashboard) => {
			try {
				const searchSpace =
					flattenDeep([searchPayload[categoryLowercase]]).filter(Boolean) || null;
				if (!searchSpace || !searchSpace.length)
					return resolveOperator(false, operator);

				for (const searchSpaceItem of searchSpace) {
					if (searchSpaceItem)
						for (const queryValue of value) {
							if (searchSpaceItem.match(queryValue)) {
								return resolveOperator(true, operator);
							}
						}
				}
			} catch (error) {
				console.error(error);
			}
			return resolveOperator(false, operator);
		});
	});
	return searchData;
};
