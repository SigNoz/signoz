/* eslint-disable  */
// @ts-ignore
// @ts-nocheck

import { QueryTypes, ConditionalOperators, ValidTypeSequence, ValidTypeValue } from 'lib/logql/tokens';

export interface QueryFields {
	type: keyof typeof QueryTypes;
	value: string | string[];
}


export function fieldsQueryIsvalid(queryFields: QueryFields[]): boolean {
	let lastOp: string;
	let result = true;
	queryFields.forEach((q, idx)=> {
		
		if (!q.value || q.value === null || q.value === '') result = false;
		
		if (Array.isArray(q.value) && q.value.length === 0 ) result = false;

		const nextOp = idx < queryFields.length  ? queryFields[idx+1]: undefined;
		if (!ValidTypeSequence(lastOp?.type, q?.type, nextOp?.type)) result = false

		if (!ValidTypeValue(lastOp?.value, q.value)) result = false;
		lastOp = q;
	});
	return result
}

export const queryKOVPair = (): QueryFields[] => [
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

export const initQueryKOVPair = (name?: string = null, op?: string = null  , value?: string | string[] = null ): QueryFields[] => [
	{
		type: QueryTypes.QUERY_KEY,
		value: name,
	},
	{
		type: QueryTypes.QUERY_OPERATOR,
		value: op,
	},
	{
		type: QueryTypes.QUERY_VALUE,
		value: value,
	},
];

export const prepareConditionOperator = (op?: string = ConditionalOperators.AND): QueryFields => {
	return {
		type: QueryTypes.CONDITIONAL_OPERATOR,
		value: op,
	}
}

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

export const hashCode = (s: string): string => {
	if (!s) {
		return '0';
	}
	return `${Math.abs(
		s.split('').reduce((a, b) => {
			// eslint-disable-next-line no-bitwise, no-param-reassign
			a = (a << 5) - a + b.charCodeAt(0);
			// eslint-disable-next-line no-bitwise
			return a & a;
		}, 0),
	)}`;
};
