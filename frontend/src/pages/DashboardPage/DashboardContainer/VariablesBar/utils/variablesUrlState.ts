import { parseAsJson } from 'nuqs';

import type { SelectedVariableValue } from '../selectionTypes';

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
