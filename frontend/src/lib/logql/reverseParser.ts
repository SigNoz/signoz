/* eslint-disable  */
// @ts-ignore
// @ts-nocheck

import { QueryTypes, StringTypeQueryOperators } from './tokens';

export const reverseParser = (
	parserQueryArr: { type: string; value: any }[] = [],
) => {
	let queryString = '';
	let lastToken: { type: string; value: any };
	parserQueryArr.forEach((query) => {
		if (queryString) {
			queryString += ' ';
		}

		if (Array.isArray(query.value) && query.value.length > 0) {
			// if the values are array type, here we spread them in
			// ('a', 'b') format
			queryString += `(${query.value.map((val) => `'${val}'`).join(',')})`;
		} else {
			if (
				query.type === QueryTypes.QUERY_VALUE &&
				lastToken.type === QueryTypes.QUERY_OPERATOR &&
				Object.values(StringTypeQueryOperators).includes(lastToken.value)
			) {
				// for operators that need string type value, here we append single
				// quotes. if the content has single quote they would be removed
				queryString += `'${query.value?.replace(/'/g, '')}'`;
			} else {
				queryString += query.value;
			}
		}
		lastToken = query;
	});

	return queryString;
};

export default reverseParser;
