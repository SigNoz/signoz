// Frontend mirror of the backend dashboards-list filter DSL grammar
// (pkg/types/dashboardtypes/list_filter.go). There is no keys/operators API, so
// the valid keys, per-field operators, and value shapes are encoded here. Keep in
// sync with the backend allow-lists.

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

// String/tag comparison operators (REGEXP is allow-listed by the backend but
// unimplemented, so it is deliberately omitted).
const STRING_OPS = [
	'=',
	'!=',
	'CONTAINS',
	'NOT CONTAINS',
	'LIKE',
	'NOT LIKE',
	'ILIKE',
	'NOT ILIKE',
	'IN',
	'NOT IN',
];

// Valid operators per field type. Tags additionally support existence checks.
export const OPERATOR_MATRIX: Record<DslFieldType, string[]> = {
	string: STRING_OPS,
	tag: [...STRING_OPS, 'EXISTS', 'NOT EXISTS'],
	timestamp: ['=', '!=', '<', '<=', '>', '>=', 'BETWEEN', 'NOT BETWEEN'],
	bool: ['=', '!='],
};

// Operators that take no value (the clause is complete after the operator).
export const VALUELESS_OPERATORS = new Set(['EXISTS', 'NOT EXISTS']);

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
