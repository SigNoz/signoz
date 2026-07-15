// Stage-aware autocomplete for the dashboards-list DSL: as the caret moves, it
// suggests keys, then operators (valid for that key's field type), then values
// (drawn from the tags/users the API reports). Grammar lives in dslGrammar.ts;
// caret/stage detection in dslTokenizer.ts.
import {
	classifyField,
	LIST_OPERATORS,
	literal,
	OPERATOR_MATRIX,
	RESERVED_KEYS,
	VALUELESS_OPERATORS,
} from './dslGrammar';
import { type CaretContext, getCaretContext } from './dslTokenizer';

// Show the full key set (the popup scrolls); values are capped a bit higher too.
const KEY_LIMIT = 100;
const VALUE_LIMIT = 50;

export interface SuggestionSource {
	// Reserved column keys (from the list response, falling back to RESERVED_KEYS).
	reservedKeys?: string[];
	tagKeys: string[];
	// Known values per tag key (lower-cased key → values).
	tagValuesByKey: Record<string, string[]>;
	// Creator emails for `created_by` value suggestions.
	creatorEmails: string[];
	currentUserEmail?: string;
}

export interface Suggestion {
	label: string;
	insertText: string;
	kind: 'key' | 'operator' | 'value' | 'connector';
	// Right-aligned hint in the popup — e.g. 'field' vs 'tag' so reserved columns
	// are distinguishable from org tag keys.
	detail?: string;
	// Chars to move the caret back from the end of `insertText` after applying.
	// Used to land the caret inside a `[...]` list so multi-select can continue.
	caretOffset?: number;
}

export interface SuggestionsResult {
	items: Suggestion[];
	ctx: CaretContext;
}

const includesInsensitive = (haystack: string, needle: string): boolean =>
	haystack.toLowerCase().includes(needle.toLowerCase());

const dedupe = (values: string[]): string[] => Array.from(new Set(values));

const keySuggestions = (
	partial: string,
	source: SuggestionSource,
): Suggestion[] => {
	const reserved = source.reservedKeys ?? [...RESERVED_KEYS];
	const reservedSet = new Set(reserved.map((k) => k.toLowerCase()));
	// Show reserved keys in our defined (purpose) order — name, description, … —
	// rather than the API's alphabetical order; any extra API keys follow, then tags.
	const known = RESERVED_KEYS as readonly string[];
	const orderedReserved = [
		...known.filter((k) => reserved.includes(k)),
		...reserved.filter((k) => !known.includes(k)),
	];
	const keys = dedupe([...orderedReserved, ...source.tagKeys]);
	const lower = partial.toLowerCase();
	return keys
		.filter((k) => includesInsensitive(k, partial) && k.toLowerCase() !== lower)
		.slice(0, KEY_LIMIT)
		.map((k) => ({
			label: k,
			insertText: `${k} `,
			kind: 'key',
			// Distinguish built-in columns from org tag keys in the popup.
			detail: reservedSet.has(k.toLowerCase()) ? 'field' : 'tag',
		}));
};

const operatorSuggestions = (
	fieldKey: string,
	partial: string,
): Suggestion[] => {
	const ops = OPERATOR_MATRIX[classifyField(fieldKey)];
	const upper = partial.toUpperCase();
	return ops
		.filter((op) => op.startsWith(upper))
		.map((op) => ({
			// Echo the key with the operator (matches the query-builder UX) so the
			// suggestion reads as the clause being built.
			label: `${fieldKey} ${op}`,
			insertText: `${op} `,
			kind: 'operator',
		}));
};

// Strip a leading opening quote from a partially-typed value for matching.
const unquotePartial = (partial: string): string =>
	partial.replace(/^['"]/, '');

// A complete quoted literal (`'a'` or `"a"`, escapes allowed) — used to tell an
// already-entered list value from the fragment the user is still typing.
const COMPLETE_LITERAL = /^(['"])(?:\\.|(?!\1).)*\1$/;

interface ListPartial {
	// Values already entered in the list (unquoted).
	committed: string[];
	// The value fragment the caret is currently typing (unquoted).
	fragment: string;
}

// Index just past the string literal opening at `start` (mirrors the tokenizer's
// escape handling); runs to end-of-input if unterminated.
const skipStringLiteral = (text: string, start: number): number => {
	const quote = text[start];
	for (let i = start + 1; i < text.length; i += 1) {
		if (text[i] === '\\') {
			i += 1;
		} else if (text[i] === quote) {
			return i;
		}
	}
	return text.length - 1;
};

// Split a top-level, comma-separated `[...]` partial (quote-aware) into its
// already-entered values and the fragment under the caret. A trailing comma or a
// complete quoted last piece means the caret starts a fresh value (fragment '').
const parseListPartial = (partial: string): ListPartial => {
	const inner = partial.trim().replace(/^[[(]/, '');
	const pieces: string[] = [];
	let depth = 0;
	let start = 0;
	for (let i = 0; i < inner.length; i += 1) {
		const c = inner[i];
		if (c === "'" || c === '"') {
			i = skipStringLiteral(inner, i);
		} else if (c === '[' || c === '(') {
			depth += 1;
		} else if (c === ']' || c === ')') {
			depth = Math.max(0, depth - 1);
		} else if (c === ',' && depth === 0) {
			pieces.push(inner.slice(start, i));
			start = i + 1;
		}
	}
	pieces.push(inner.slice(start));
	const last = pieces[pieces.length - 1].trim();
	const lastIsComplete = last !== '' && COMPLETE_LITERAL.test(last);
	const committedPieces = lastIsComplete ? pieces : pieces.slice(0, -1);
	return {
		committed: committedPieces
			.map((p) => unquotePartial(p.trim()).replace(/['"]$/, ''))
			.filter((p) => p !== ''),
		fragment: lastIsComplete ? '' : unquotePartial(last),
	};
};

const valueSuggestions = (
	ctx: CaretContext,
	source: SuggestionSource,
): Suggestion[] => {
	if (VALUELESS_OPERATORS.has(ctx.operator)) {
		return [];
	}
	const key = ctx.fieldKey.toLowerCase();
	const type = classifyField(ctx.fieldKey);

	// List operators (`IN`/`NOT IN`) take a `[...]` list: parse what's already in
	// the brackets so we exclude entered values and append rather than replace.
	const isList = LIST_OPERATORS.has(ctx.operator);
	const list = isList ? parseListPartial(ctx.partial) : null;
	// A fresh list has no `[` yet; once inside one the `]` already sits after the
	// caret, so we omit the closing bracket when appending.
	const inBracket = isList && /^\s*[[(]/.test(ctx.partial);
	const needle = list ? list.fragment : unquotePartial(ctx.partial);

	if (type === 'bool') {
		return ['true', 'false']
			.filter((v) => v.startsWith(needle.toLowerCase()))
			.map((v) => ({ label: v, insertText: `${v} `, kind: 'value' }));
	}

	let raw: string[] = [];
	if (key === 'created_by') {
		const emails = source.currentUserEmail
			? dedupe([source.currentUserEmail, ...source.creatorEmails])
			: source.creatorEmails;
		raw = emails;
	} else if (type === 'tag') {
		raw = source.tagValuesByKey[key] ?? [];
	} else {
		// name / description / timestamps have no known value set — free text.
		return [];
	}

	const committed = new Set(list?.committed ?? []);
	return raw
		.filter((v) => !committed.has(v) && includesInsensitive(v, needle))
		.slice(0, VALUE_LIMIT)
		.map((v) => {
			const label =
				v === source.currentUserEmail && key === 'created_by' ? `${v} (me)` : v;
			if (isList) {
				const values = [...(list?.committed ?? []), v].map(literal).join(', ');
				return {
					label,
					// Append inside the existing `[...]` (its `]` stays after the caret),
					// or open a fresh closed list. Either way the caret lands just before
					// the `]` so the next pick continues the list.
					insertText: inBracket ? `[${values}` : `[${values}]`,
					kind: 'value',
					caretOffset: inBracket ? 0 : 1,
				};
			}
			return {
				label,
				// Trailing space so picking a value lands the caret in the connector slot.
				insertText: `${literal(v)} `,
				kind: 'value',
			};
		});
};

// AND / OR chaining after a complete term.
const CONNECTORS = ['AND', 'OR'];

const connectorSuggestions = (partial: string): Suggestion[] => {
	const upper = partial.toUpperCase();
	return CONNECTORS.filter((c) => c.startsWith(upper)).map((c) => ({
		label: c,
		insertText: `${c} `,
		kind: 'connector',
	}));
};

// Compute the suggestions for the caret position, plus the caret context the
// caller uses to splice a chosen suggestion back in.
export const getSuggestions = (
	query: string,
	caret: number,
	source: SuggestionSource,
): SuggestionsResult => {
	const ctx = getCaretContext(query, caret);
	let items: Suggestion[] = [];
	if (ctx.stage === 'key') {
		items = keySuggestions(ctx.partial, source);
	} else if (ctx.stage === 'operator') {
		items = operatorSuggestions(ctx.fieldKey, ctx.partial);
	} else if (ctx.stage === 'value') {
		items = valueSuggestions(ctx, source);
	} else if (ctx.stage === 'connector') {
		items = connectorSuggestions(ctx.partial);
	}
	return { items, ctx };
};
