/* eslint-disable  */
// @ts-ignore
// @ts-nocheck

import {
	ErrorConvertToFullText,
	ErrorInvalidQueryPair,
} from 'lib/logql/errors';
import splitter from 'lib/logql/splitter';
import {
	ConditionalOperators,
	QueryOperatorsMultiVal,
	QueryOperatorsSingleVal,
	QueryTypes,
} from 'lib/logql/tokens';

const validateMultiValue = (queryToken: string): boolean => {
	const queryValues = [];
	let start;
	let isQuoteStart = false;
	if (queryToken[0] === '(' && queryToken[queryToken.length - 1] === ')') {
		for (let idx = 1; idx < queryToken.length - 1; idx += 1) {
			if (queryToken[idx] === "'") {
				if (queryToken[idx - 1] === '\\') {
					// skip
				} else if (isQuoteStart) {
					isQuoteStart = false;
					queryValues.push(queryToken.slice(start, idx));
				} else {
					isQuoteStart = true;
					start = idx + 1;
				}
			}
		}
	} else {
		return false;
	}
	return queryValues;
};
export const parseQuery = (queryString) => {
	let parsedRaw = [];
	const generateQuery = (queryToken) => {
		const prevToken = parsedRaw[parsedRaw.length - 1];

		// Is a QUERY_KEY
		if (
			prevToken === undefined ||
			prevToken.type === QueryTypes.CONDITIONAL_OPERATOR
		) {
			parsedRaw.push({
				type: QueryTypes.QUERY_KEY,
				value: queryToken,
			});
		}
		// Is a QUERY_OPERATOR
		else if (prevToken && prevToken.type === QueryTypes.QUERY_KEY) {
			if (
				Object.values({
					...QueryOperatorsMultiVal,
					...QueryOperatorsSingleVal,
				}).find((op) => op.toLowerCase() === queryToken.toLowerCase())
			)
				parsedRaw.push({
					type: QueryTypes.QUERY_OPERATOR,
					value: queryToken,
				});
			else {
				throw new ErrorInvalidQueryPair(
					'Expected conditional operator received',
					queryToken,
				);
			}
		}
		// Is a QUERY_VALUE
		else if (prevToken && prevToken.type === QueryTypes.QUERY_OPERATOR) {
			// Check for multi value
			let value = queryToken;
			// if (
			// 	typeof queryToken === 'string' &&
			// 	queryToken.length >= 2 &&
			// 	queryToken[0] === "'" &&
			// 	queryToken[queryToken.length - 1] === "'"
			// ) {
			// 	value = queryToken.slice(1, queryToken.length - 1);
			// }
			if (
				Object.values(QueryOperatorsMultiVal).some(
					(operator) => operator.toLowerCase() === prevToken.value.toLowerCase(),
				)
			) {
				value = validateMultiValue(queryToken);
				if (value === false) {
					throw new ErrorConvertToFullText();
				}
			}

			parsedRaw.push({
				type: QueryTypes.QUERY_VALUE,
				value,
			});
		} else if (prevToken && prevToken.type === QueryTypes.QUERY_VALUE) {
			if (
				Object.values(ConditionalOperators).find(
					(op) => op.toLowerCase() === queryToken.toLowerCase(),
				)
			)
				parsedRaw.push({
					type: QueryTypes.CONDITIONAL_OPERATOR,
					value: queryToken,
				});
			else {
				throw new ErrorInvalidQueryPair(
					'Expected conditional operator received',
					queryToken,
				);
			}
		} else {
			// Not a Key
		}
	};

	try {
		const spaceSplittedQUery = splitter(queryString);
		spaceSplittedQUery.forEach((q) => {
			generateQuery(q);
		});
	} catch (e: Error) {
		if (e instanceof ErrorInvalidQueryPair) {
			//
		} else if (e instanceof ErrorConvertToFullText) {
			parsedRaw = [
				{
					type: QueryTypes.QUERY_KEY,
					value: 'FULLTEXT',
				},
				{
					type: QueryTypes.QUERY_OPERATOR,
					value: 'CONTAINS',
				},
				{
					type: QueryTypes.QUERY_VALUE,
					value: String.raw`${queryString}`,
				},
			];
		}
	}
	return parsedRaw;
};

export default parseQuery;
