import { ALL_SENTINEL, type SelectionsByName } from './state/types';

/**
 * Replaces `$varname` references in a string with the current selection.
 *
 * - text selection      → the freeform string
 * - list, allSelected   → ALL_SENTINEL (callers decide whether to expand to
 *                         all known values or to send the literal marker)
 * - list, single value  → that value
 * - list, multi values  → comma-joined; brackets if caller wraps with IN ()
 *
 * Variable names match `[a-zA-Z_][a-zA-Z0-9_.]*` so dotted attribute keys
 * like `$service.name` work. Substitution is non-recursive (we don't expand
 * `$other` if a value happens to contain another reference).
 */
const VARIABLE_REF = /\$([a-zA-Z_][a-zA-Z0-9_.]*)/g;

function selectionToString(
	selection: SelectionsByName[string],
): string | null {
	if (!selection) {return null;}
	if (selection.kind === 'text') {return selection.value;}
	if (selection.allSelected) {return ALL_SENTINEL;}
	if (selection.values.length === 0) {return '';}
	return selection.values.join(',');
}

export function substituteVariables(
	template: string,
	selections: SelectionsByName,
): string {
	if (!template) {return template;}
	return template.replace(VARIABLE_REF, (match, name: string) => {
		const sel = selections[name];
		const value = selectionToString(sel);
		// Leave unresolved references intact so the consumer can decide how to
		// handle them (better than producing silent partial substitutions).
		return value === null ? match : value;
	});
}

/**
 * Lists the variable names referenced in a string. Used by the dependency
 * graph (Phase 5).
 */
export function referencedVariables(template: string): string[] {
	if (!template) {return [];}
	const out = new Set<string>();
	let match: RegExpExecArray | null;
	const re = new RegExp(VARIABLE_REF.source, 'g');
	// eslint-disable-next-line no-cond-assign
	while ((match = re.exec(template)) !== null) {
		out.add(match[1]);
	}
	return Array.from(out);
}
