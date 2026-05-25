import { ALL_SENTINEL, type SelectionsByName, type VariableSelection } from './types';

const URL_PREFIX = 'var-';

/**
 * Encodes a single selection into a URL-safe string. Compact format:
 *   - text variable      → the freeform string
 *   - list (ALL)         → "__ALL__"
 *   - list (single)      → "value"
 *   - list (multi)       → "v1,v2,v3"
 */
function encodeSelection(sel: VariableSelection): string {
	if (sel.kind === 'text') return sel.value;
	if (sel.allSelected) return ALL_SENTINEL;
	return sel.values.join(',');
}

function decodeSelection(
	raw: string,
	hint: 'list' | 'text',
): VariableSelection {
	if (hint === 'text') return { kind: 'text', value: raw };
	if (raw === ALL_SENTINEL) {
		return { kind: 'list', values: [], allSelected: true };
	}
	const values = raw ? raw.split(',') : [];
	return { kind: 'list', values, allSelected: false };
}

/**
 * Reads `var-<name>=<encoded>` params off the current location.
 * `hints` tells us each variable's kind (list vs text) for decoding.
 */
export function readSelectionsFromUrl(
	hints: Record<string, 'list' | 'text'>,
): SelectionsByName {
	const out: SelectionsByName = {};
	if (typeof window === 'undefined') return out;
	const params = new URLSearchParams(window.location.search);
	params.forEach((value, key) => {
		if (!key.startsWith(URL_PREFIX)) return;
		const name = key.slice(URL_PREFIX.length);
		const hint = hints[name];
		if (!hint) return;
		out[name] = decodeSelection(value, hint);
	});
	return out;
}

/**
 * Writes the current selections into the URL, replacing any previous
 * `var-*` params. Uses `replaceState` so it doesn't pollute history.
 */
export function writeSelectionsToUrl(selections: SelectionsByName): void {
	if (typeof window === 'undefined') return;
	const params = new URLSearchParams(window.location.search);
	// Strip existing var-* params
	const keysToDelete: string[] = [];
	params.forEach((_, key) => {
		if (key.startsWith(URL_PREFIX)) keysToDelete.push(key);
	});
	keysToDelete.forEach((k) => params.delete(k));

	Object.entries(selections).forEach(([name, sel]) => {
		if (!sel) return;
		params.set(`${URL_PREFIX}${name}`, encodeSelection(sel));
	});

	const search = params.toString();
	const nextUrl = `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash}`;
	window.history.replaceState(window.history.state, '', nextUrl);
}
