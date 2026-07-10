import { QueryParams } from 'constants/query';
import { parseAsJson } from 'nuqs';

import type { SelectedVariableValue } from './selectionTypes';

/** URL sentinel for an "ALL values selected" state (matches V1). */
export const ALL_SELECTED = '__ALL__';

/** `?variables=` holds `{ [name]: value }` (ALL encoded as the sentinel). */
export const variablesUrlParser = parseAsJson<
	Record<string, SelectedVariableValue>
>((v) =>
	typeof v === 'object' && v !== null
		? (v as Record<string, SelectedVariableValue>)
		: null,
);

/**
 * Extends a search string with the current `?variables=` param (unchanged when
 * absent), so the dashboard ↔ editor handoff keeps the selection in the URL and
 * it survives a refresh (V1 parity).
 */
export function withVariablesSearch(
	base: string,
	currentSearch: string,
): string {
	const value = new URLSearchParams(currentSearch).get(QueryParams.variables);
	if (!value) {
		return base;
	}
	const params = new URLSearchParams(base);
	params.set(QueryParams.variables, value);
	return `?${params.toString()}`;
}
