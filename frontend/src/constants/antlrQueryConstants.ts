/* eslint-disable @typescript-eslint/naming-convention */

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

export const TRACE_OPERATOR_OPERATORS = {
	AND: '&&',
	OR: '||',
	NOT: 'NOT',
	DIRECT_DESCENDENT: '=>',
	INDIRECT_DESCENDENT: '->',
};

export const TRACE_OPERATOR_OPERATORS_WITH_PRIORITY = {
	[TRACE_OPERATOR_OPERATORS.DIRECT_DESCENDENT]: 1,
	[TRACE_OPERATOR_OPERATORS.AND]: 2,
	[TRACE_OPERATOR_OPERATORS.OR]: 3,
	[TRACE_OPERATOR_OPERATORS.NOT]: 4,
	[TRACE_OPERATOR_OPERATORS.INDIRECT_DESCENDENT]: 5,
};

export const TRACE_OPERATOR_OPERATORS_LABELS = {
	[TRACE_OPERATOR_OPERATORS.DIRECT_DESCENDENT]: 'Direct Descendant',
	[TRACE_OPERATOR_OPERATORS.INDIRECT_DESCENDENT]: 'Indirect Descendant',
};

export const QUERY_BUILDER_FUNCTIONS = {
	HAS: 'has',
	HASANY: 'hasAny',
	HASALL: 'hasAll',
	HASTOKEN: 'hasToken',
};

export function negateOperator(operatorOrFunction: string): string {
	// Special cases for equals/not equals
	if (operatorOrFunction === OPERATORS['=']) {
		return OPERATORS['!='];
	}
	if (operatorOrFunction === OPERATORS['!=']) {
		return OPERATORS['='];
	}
	// For all other operators and functions, add NOT in front
	return `${OPERATORS.NOT} ${operatorOrFunction}`;
}

export enum DEPRECATED_OPERATORS {
	REGEX = 'regex',
	NIN = 'nin',
	NREGEX = 'nregex',
	NLIKE = 'nlike',
	NILIKE = 'nilike',
	NEXTISTS = 'nexists',
	NCONTAINS = 'ncontains',
	NHAS = 'nhas',
	NHASANY = 'nhasany',
	NHASALL = 'nhasall',
}

export const DEPRECATED_OPERATORS_MAP = {
	[DEPRECATED_OPERATORS.REGEX]: OPERATORS.REGEXP,
	[DEPRECATED_OPERATORS.NIN]: negateOperator(OPERATORS.IN),
	[DEPRECATED_OPERATORS.NREGEX]: negateOperator(OPERATORS.REGEXP),
	[DEPRECATED_OPERATORS.NLIKE]: negateOperator(OPERATORS.LIKE),
	[DEPRECATED_OPERATORS.NILIKE]: negateOperator(OPERATORS.ILIKE),
	[DEPRECATED_OPERATORS.NEXTISTS]: negateOperator(OPERATORS.EXISTS),
	[DEPRECATED_OPERATORS.NCONTAINS]: negateOperator(OPERATORS.CONTAINS),
	[DEPRECATED_OPERATORS.NHAS]: negateOperator(QUERY_BUILDER_FUNCTIONS.HAS),
	[DEPRECATED_OPERATORS.NHASANY]: negateOperator(QUERY_BUILDER_FUNCTIONS.HASANY),
	[DEPRECATED_OPERATORS.NHASALL]: negateOperator(QUERY_BUILDER_FUNCTIONS.HASALL),
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
