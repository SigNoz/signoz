export const OPERATORS = {
	IN: 'IN',
	LIKE: 'LIKE',
	ILIKE: 'ILIKE',
	REGEXP: 'REGEXP',
	EXISTS: 'EXISTS',
	CONTAINS: 'CONTAINS',
	BETWEEN: 'BETWEEN',
	NOT: 'NOT',
	'=': '=',
	'!=': '!=',
	'>=': '>=',
	'>': '>',
	'<=': '<=',
	'<': '<',
};

export const NON_VALUE_OPERATORS = [OPERATORS.EXISTS];

// eslint-disable-next-line @typescript-eslint/naming-convention
export enum QUERY_BUILDER_KEY_TYPES {
	STRING = 'string',
	NUMBER = 'number',
	BOOLEAN = 'boolean',
}

export const QUERY_BUILDER_OPERATORS_BY_KEY_TYPE = {
	[QUERY_BUILDER_KEY_TYPES.STRING]: [
		OPERATORS['='],
		OPERATORS['!='],
		OPERATORS.IN,
		OPERATORS.LIKE,
		OPERATORS.ILIKE,
		OPERATORS.CONTAINS,
		OPERATORS.EXISTS,
		OPERATORS.REGEXP,
		OPERATORS.NOT,
	],
	[QUERY_BUILDER_KEY_TYPES.NUMBER]: [
		OPERATORS['='],
		OPERATORS['!='],
		OPERATORS['>='],
		OPERATORS['>'],
		OPERATORS['<='],
		OPERATORS['<'],
		OPERATORS.IN,
		OPERATORS.EXISTS,
		OPERATORS.BETWEEN,
		OPERATORS.NOT,
	],
	[QUERY_BUILDER_KEY_TYPES.BOOLEAN]: [
		OPERATORS['='],
		OPERATORS['!='],
		OPERATORS.EXISTS,
		OPERATORS.NOT,
	],
};

export const negationQueryOperatorSuggestions = [
	{ label: OPERATORS.LIKE, type: 'operator', info: 'Like' },
	{ label: OPERATORS.ILIKE, type: 'operator', info: 'Case insensitive like' },
	{ label: OPERATORS.EXISTS, type: 'operator', info: 'Exists' },
	{ label: OPERATORS.BETWEEN, type: 'operator', info: 'Between' },
	{ label: OPERATORS.IN, type: 'operator', info: 'In' },
	{ label: OPERATORS.REGEXP, type: 'operator', info: 'Regular expression' },
	{ label: OPERATORS.CONTAINS, type: 'operator', info: 'Contains' },
];

export const queryOperatorSuggestions = [
	{ label: OPERATORS['='], type: 'operator', info: 'Equal to' },
	{ label: OPERATORS['!='], type: 'operator', info: 'Not equal to' },
	{ label: OPERATORS['>'], type: 'operator', info: 'Greater than' },
	{ label: OPERATORS['<'], type: 'operator', info: 'Less than' },
	{ label: OPERATORS['>='], type: 'operator', info: 'Greater than or equal to' },
	{ label: OPERATORS['<='], type: 'operator', info: 'Less than or equal to' },
	{ label: OPERATORS.NOT, type: 'operator', info: 'Not' },
	...negationQueryOperatorSuggestions,
];
