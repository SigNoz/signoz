// Frontend mirror of the backend dashboards-list filter DSL grammar
// (pkg/types/dashboardtypes/list_filter.go). There is no keys/operators API, so
// the valid keys, per-field operators, and value shapes are encoded here. Keep in
// sync with the backend allow-lists.
import { negateOperator, OPERATORS } from 'constants/antlrQueryConstants';

// Reserved keys the backend recognises as dashboard columns. Any other key is a
// tag key. (`updated_by` and `source` are NOT queryable.)
export const RESERVED_KEYS = [
	'name',
	'description',
	'created_by',
	'created_at',
	'updated_at',
	'locked',
] as const;

export type DslFieldType = 'string' | 'timestamp' | 'bool' | 'tag';

const RESERVED_FIELD_TYPES: Record<string, DslFieldType> = {
	name: 'string',
	description: 'string',
	created_by: 'string',
	created_at: 'timestamp',
	updated_at: 'timestamp',
	locked: 'bool',
};

// A reserved key maps to its column type; anything else is a tag.
export const classifyField = (key: string): DslFieldType =>
	RESERVED_FIELD_TYPES[key.toLowerCase()] ?? 'tag';

// String/tag comparison operators, reusing the shared operator constants
// (REGEXP is allow-listed by the backend but unimplemented, so it is omitted).
const STRING_OPS = [
	OPERATORS['='],
	OPERATORS['!='],
	OPERATORS.CONTAINS,
	negateOperator(OPERATORS.CONTAINS),
	OPERATORS.LIKE,
	negateOperator(OPERATORS.LIKE),
	OPERATORS.ILIKE,
	negateOperator(OPERATORS.ILIKE),
	OPERATORS.IN,
	negateOperator(OPERATORS.IN),
];

// Valid operators per field type. Tags additionally support existence checks.
export const OPERATOR_MATRIX: Record<DslFieldType, string[]> = {
	string: STRING_OPS,
	tag: [...STRING_OPS, OPERATORS.EXISTS, negateOperator(OPERATORS.EXISTS)],
	timestamp: [
		OPERATORS['='],
		OPERATORS['!='],
		OPERATORS['<'],
		OPERATORS['<='],
		OPERATORS['>'],
		OPERATORS['>='],
		OPERATORS.BETWEEN,
		negateOperator(OPERATORS.BETWEEN),
	],
	bool: [OPERATORS['='], OPERATORS['!=']],
};

// Operators that take no value (the clause is complete after the operator).
export const VALUELESS_OPERATORS = new Set([
	OPERATORS.EXISTS,
	negateOperator(OPERATORS.EXISTS),
]);

// Operators whose value is a bracketed list (`IN ['a', 'b']`) rather than a
// single literal — value suggestions wrap/append inside the `[...]`.
export const LIST_OPERATORS = new Set([
	OPERATORS.IN,
	negateOperator(OPERATORS.IN),
]);

// Every operator, longest spelling first, so the tokenizer matches `NOT IN`
// before `NOT`/`IN` and `>=` before `>`. Word operators allow flexible internal
// whitespace (`NOT   IN`).
export const OPERATOR_PATTERN = new RegExp(
	'^(' +
		[
			'NOT\\s+CONTAINS',
			'NOT\\s+LIKE',
			'NOT\\s+ILIKE',
			'NOT\\s+BETWEEN',
			'NOT\\s+EXISTS',
			'NOT\\s+IN',
			'CONTAINS',
			'ILIKE',
			'LIKE',
			'BETWEEN',
			'EXISTS',
			'IN',
			'>=',
			'<=',
			'!=',
			'<>',
			'==',
			'=',
			'<',
			'>',
		].join('|') +
		')',
	'i',
);

// Canonical (uppercase, single-spaced) form of a matched operator spelling.
export const canonicalOperator = (raw: string): string => {
	const collapsed = raw.replace(/\s+/g, ' ').trim().toUpperCase();
	return collapsed === '==' ? '=' : collapsed === '<>' ? '!=' : collapsed;
};

// Characters that start an operator symbol — used to end a bare key token that
// abuts an operator without whitespace (`name='x'`).
export const isOperatorSymbolStart = (ch: string): boolean =>
	ch === '=' || ch === '!' || ch === '<' || ch === '>';

// A single-quoted DSL string literal with embedded single quotes escaped.
export const literal = (value: string): string =>
	`'${value.replace(/'/g, "\\'")}'`;
