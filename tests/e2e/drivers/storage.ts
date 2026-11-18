import type { Page } from '@playwright/test';

/** The app's persisted table state, and the one-shot reset specs need. */

const COLUMN_STORAGE_PREFIX = '@signoz/table-columns/';

export interface ColumnState {
	hiddenColumnIds?: string[];
	columnOrder?: string[];
	columnSizing?: Record<string, number>;
}

export function columnStorageKey(tableKey: string): string {
	return `${COLUMN_STORAGE_PREFIX}${tableKey}`;
}

export async function readJson<T>(page: Page, key: string): Promise<T | null> {
	const raw = await page.evaluate((k) => localStorage.getItem(k), key);
	return raw ? (JSON.parse(raw) as T) : null;
}

export async function writeJson(
	page: Page,
	key: string,
	value: unknown,
): Promise<void> {
	await page.evaluate(({ k, v }) => localStorage.setItem(k, JSON.stringify(v)), {
		k: key,
		v: value,
	});
}

export async function writeRaw(
	page: Page,
	key: string,
	raw: string,
): Promise<void> {
	await page.evaluate(({ k, v }) => localStorage.setItem(k, v), {
		k: key,
		v: raw,
	});
}

/**
 * Read a zustand-persisted store.
 *
 * The `persist` middleware writes a `{ state, version }` envelope, so reading
 * the keys off the top level silently yields `undefined` for all of them.
 * `useColumnStore` writes its own JSON directly, which is why
 * {@link ColumnState} needs no unwrapping.
 */
export async function readPersisted<T>(
	page: Page,
	key: string,
): Promise<Partial<T>> {
	const parsed = await readJson<{ state?: T } & T>(page, key);
	return parsed ? (parsed.state ?? parsed) : {};
}

/** Marker that makes {@link resetKeys} clear exactly once. */
const RESET_MARKER = '__e2e_storage_reset';

/**
 * Clear `keys` once, before the first navigation.
 *
 * The "once" is load-bearing: `addInitScript` re-runs before app code on
 * **every** navigation, so an unguarded version also wipes state on
 * `page.reload()` — which silently breaks exactly the scenarios that assert
 * persistence survives a reload.
 */
export async function resetKeys(page: Page, keys: string[]): Promise<void> {
	await page.addInitScript(
		({ marker, items }) => {
			if (sessionStorage.getItem(marker)) {
				return;
			}
			sessionStorage.setItem(marker, '1');
			for (const key of items) {
				localStorage.removeItem(key);
			}
		},
		{ marker: RESET_MARKER, items: keys },
	);
}
