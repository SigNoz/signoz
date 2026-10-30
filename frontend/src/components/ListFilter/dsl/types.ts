import type { CaretContext } from './dslTokenizer';

// `dynamic` keys (tags, labels) take string ops plus EXISTS / NOT EXISTS.
export type DslFieldType = 'string' | 'timestamp' | 'bool' | 'enum' | 'dynamic';

// A list-filter DSL grammar, mirroring a backend `list_filter.go` allow-list.
export interface DslGrammar {
	// Reserved keys in suggestion order.
	reservedKeys: readonly string[];
	// Reserved key -> type. Any key not listed here is dynamic.
	fieldTypes: Record<string, DslFieldType>;
	// `detail` labels dynamic keys in the popup. A reserved dynamic key (e.g.
	// rules' `severity`) aliases `${prefix}${key}` for value lookups.
	dynamicKey: { detail: string; prefix: string };
	enumValues?: Record<string, readonly string[]>;
	// Advertised by the API but not filterable (e.g. `labels.<key>`).
	hiddenKeys?: readonly string[];
}

export interface SuggestionSource {
	// Reserved keys from the list response, falling back to the grammar's.
	reservedKeys?: string[];
	// Dynamic keys exactly as typed (e.g. `team`, `labels.team`).
	dynamicKeys: string[];
	// Known values per dynamic key (lower-cased full key -> values).
	valuesByKey: Record<string, string[]>;
	// Values for `created_by` / `updated_by`.
	creatorEmails: string[];
	currentUserEmail?: string;
}

export interface Suggestion {
	label: string;
	insertText: string;
	kind: 'key' | 'operator' | 'value' | 'connector';
	// Right-aligned hint in the popup — e.g. 'field' vs 'tag' so reserved columns
	// are distinguishable from dynamic keys.
	detail?: string;
	// Chars to move the caret back from the end of `insertText` after applying.
	// Used to land the caret inside a `[...]` list so multi-select can continue.
	caretOffset?: number;
}

export interface SuggestionsResult {
	items: Suggestion[];
	ctx: CaretContext;
}

// Relative "updated within" windows offered by the Updated filter dropdown.
export type UpdatedWindow = 'any' | 'today' | '7d' | '30d';
