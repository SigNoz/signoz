/* eslint-disable  */
// @ts-ignore
// @ts-nocheck

import { QueryTypes } from 'lib/logql/tokens';

export const queryKOVPair = () => [
	{
		type: QueryTypes.QUERY_KEY,
		value: null,
	},
	{
		type: QueryTypes.QUERY_OPERATOR,
		value: null,
	},
	{
		type: QueryTypes.QUERY_VALUE,
		value: null,
	},
];
export const createParsedQueryStructure = (parsedQuery = []) => {
	if (!parsedQuery.length) {
		return parsedQuery;
	}

	const structuredArray = [queryKOVPair()];

	let cond;
	let qCtr = -1;
	parsedQuery.forEach((query, idx) => {
		if (cond) {
			structuredArray.push(cond);
			structuredArray.push(queryKOVPair());
			cond = null;
			qCtr = -1;
		}
		const stagingArr = structuredArray[structuredArray.length - 1];
		const prevQuery =
			Array.isArray(stagingArr) && qCtr >= 0 ? stagingArr[qCtr] : null;

		if (query.type === QueryTypes.QUERY_KEY) {
			stagingArr[qCtr + 1] = query;
		} else if (
			query.type === QueryTypes.QUERY_OPERATOR &&
			prevQuery &&
			prevQuery.type === QueryTypes.QUERY_KEY
		) {
			stagingArr[qCtr + 1] = query;
		} else if (
			query.type === QueryTypes.QUERY_VALUE &&
			prevQuery &&
			prevQuery.type === QueryTypes.QUERY_OPERATOR
		) {
			stagingArr[qCtr + 1] = query;
		} else if (query.type === QueryTypes.CONDITIONAL_OPERATOR) {
			cond = query;
		}
		qCtr++;
	});
	return structuredArray;
};
