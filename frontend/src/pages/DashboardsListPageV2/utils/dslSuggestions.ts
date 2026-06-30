// Key-name suggestions for the dashboards-list DSL search box. The reserved keys
// mirror the backend filter DSL (pkg/.../listfilter_visitor.go); any other key is
// treated as a tag key, so we also surface the tag keys the list API reports.
import type { SelectedTag } from '../types';

// Reserved DSL keys the backend recognises as dashboard columns.
export const RESERVED_DSL_KEYS: string[] = [
	'name',
	'description',
	'created_at',
	'updated_at',
	'created_by',
	'locked',
	'source',
];

export interface ActiveKeyToken {
	token: string;
	// Index in the value string where the partial key begins.
	start: number;
}

// The partial key the user is currently typing: the trailing segment after the
// last top-level AND/OR (or the start), provided it hasn't yet reached an
// operator (no whitespace). Returns null once the key is complete.
export const getActiveKeyToken = (value: string): ActiveKeyToken | null => {
	const boundaryRe = /\b(?:AND|OR)\b/gi;
	let lastEnd = 0;
	let match = boundaryRe.exec(value);
	while (match !== null) {
		lastEnd = match.index + match[0].length;
		match = boundaryRe.exec(value);
	}
	const segment = value.slice(lastEnd);
	const leading = segment.length - segment.trimStart().length;
	const partial = segment.slice(leading);
	if (partial.length === 0 || /[\s(]/.test(partial)) {
		return null;
	}
	return { token: partial, start: lastEnd + leading };
};

// Build the de-duplicated, ordered list of keys to offer: reserved columns plus
// distinct tag keys from the list response.
export const buildSuggestionKeys = (availableTags: SelectedTag[]): string[] => {
	const tagKeys = availableTags.map((t) => t.key);
	return Array.from(new Set([...RESERVED_DSL_KEYS, ...tagKeys]));
};

// Keys matching the partial token (case-insensitive), excluding an exact match.
export const matchKeys = (
	keys: string[],
	token: string,
	limit = 8,
): string[] => {
	const lower = token.toLowerCase();
	return keys
		.filter((k) => k.toLowerCase().includes(lower) && k.toLowerCase() !== lower)
		.slice(0, limit);
};

// Replace the active partial key in `value` with the chosen key + a space, ready
// for the user to type an operator.
export const applyKeySuggestion = (
	value: string,
	active: ActiveKeyToken,
	key: string,
): string => `${value.slice(0, active.start)}${key} `;
