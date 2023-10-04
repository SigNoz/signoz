/* eslint-disable no-param-reassign */
/* eslint-disable no-restricted-syntax */
/* eslint-disable sonarjs/cognitive-complexity */
import { decode, encode } from 'js-base64';
import { flattenDeep, map, uniqWith } from 'lodash-es';
import { Dashboard } from 'types/api/dashboard/getAll';

import { IOptionsData, IQueryStructure, TCategory, TOperator } from './types';

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
): IQueryStructure[] => JSON.parse(decode(queryString));

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
	const escapeRegExp = (regExp: string): string =>
		regExp.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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
							if (searchSpaceItem.match(escapeRegExp(queryValue))) {
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

export const OptionsSchemas = {
	attribute: {
		mode: undefined,
		options: [
			{
				name: 'Title',
			},
			{
				name: 'Description',
			},
			{
				name: 'Tags',
			},
		],
	},
	operator: {
		mode: undefined,
		options: [
			{
				value: '=',
				name: 'Equal',
			},
			{
				name: 'Not Equal',
				value: '!=',
			},
		],
	},
};

export function OptionsValueResolution(
	category: TCategory,
	searchData: Dashboard[],
): Record<string, unknown> | IOptionsData {
	const OptionsValueSchema = {
		title: {
			mode: 'tags',
			options: uniqWith(
				map(searchData, (searchItem) => ({ name: searchItem.data.title })),
				(prev, next) => prev.name === next.name,
			),
		},
		description: {
			mode: 'tags',
			options: uniqWith(
				map(searchData, (searchItem) =>
					searchItem.data.description
						? {
								name: searchItem.data.description,
								value: searchItem.data.description,
						  }
						: null,
				).filter(Boolean),
				(prev, next) => prev?.name === next?.name,
			),
		},
		tags: {
			mode: 'tags',
			options: uniqWith(
				map(
					flattenDeep(
						// eslint-disable-next-line @typescript-eslint/ban-ts-comment
						// @ts-ignore
						map(searchData, (searchItem) => searchItem.data.tags).filter(Boolean),
					),
					(tag) => ({ name: tag }),
				),
				(prev, next) => prev.name === next.name,
			),
		},
	};

	return (
		OptionsValueSchema[category] ||
		({ mode: undefined, options: [] } as IOptionsData)
	);
}
