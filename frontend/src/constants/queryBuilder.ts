export type QueryBuilderStateT = 'search';

export const QUERY_BUILDER_STATE_KEYS = {
	SEARCH: 'search' as QueryBuilderStateT,
};

// OPERATORS
const IN = 'IN';
const NIN = 'NIN';
const LIKE = 'LIKE';
const NLIKE = 'NLIKE';
const EQUALS = 'EQUALS';
const NOT_EQUALS = 'NOT_EQUALS';
export const EXISTS = 'EXISTS';
export const NOT_EXISTS = 'NOT_EXISTS';
const STARTS_WITH = 'STARTS_WITH';
const NOT_STARTS_WITH = 'NOT_STARTS_WITH';
const CONTAINS = 'CONTAINS';
const NOT_CONTAINS = 'NOT_CONTAINS';
const GTE = 'GTE';
const GT = 'GT';
const LTE = 'LTE';
const LT = 'LT';

export const QUERY_BUILDER_OPERATORS = {
	METRICS: [IN, NIN, LIKE, NLIKE],
	TRACES: [
		EQUALS,
		NOT_EQUALS,
		IN,
		NIN,
		EXISTS,
		NOT_EXISTS,
		STARTS_WITH,
		NOT_STARTS_WITH,
		CONTAINS,
		NOT_CONTAINS,
	],
	LOGS: [IN, NIN, GTE, GT, LTE, LT, CONTAINS, NOT_CONTAINS],
	UNIVERSAL: [
		EQUALS,
		NOT_EQUALS,
		IN,
		NIN,
		EXISTS,
		NOT_EXISTS,
		LIKE,
		NLIKE,
		GTE,
		GT,
		LTE,
		LT,
		CONTAINS,
		NOT_CONTAINS,
	],
};
