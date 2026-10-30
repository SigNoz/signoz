// Grammar-independent operator tables for the list-filter DSL. Key sets and
// field types come from a DslGrammar config mirroring the backend allow-list
// (e.g. pkg/types/dashboardtypes/list_filter.go); keep those configs in sync.
import { negateOperator, OPERATORS } from 'constants/antlrQueryConstants';

import type { DslFieldType, DslGrammar } from './types';

// A reserved key maps to its column type; anything else is dynamic.
export const classifyField = (grammar: DslGrammar, key: string): DslFieldType =>
	grammar.fieldTypes[key.toLowerCase()] ?? 'dynamic';

// String/dynamic comparison operators, reusing the shared operator constants
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

// Valid operators per field type. Dynamic keys additionally support existence checks.
export const OPERATOR_MATRIX: Record<DslFieldType, string[]> = {
	string: STRING_OPS,
	dynamic: [...STRING_OPS, OPERATORS.EXISTS, negateOperator(OPERATORS.EXISTS)],
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
	enum: [
		OPERATORS['='],
		OPERATORS['!='],
		OPERATORS.IN,
		negateOperator(OPERATORS.IN),
	],
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
