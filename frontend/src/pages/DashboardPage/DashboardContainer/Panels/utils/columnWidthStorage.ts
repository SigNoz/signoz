import getLocalStorageApi from 'api/browser/localstorage/get';
import setLocalStorageApi from 'api/browser/localstorage/set';
import { LOCALSTORAGE } from 'constants/localStorage';

/** Resized column widths for a single panel, keyed by column key. */
export type ColumnWidths = Record<string, number>;

// All panels' widths live under one localStorage key, keyed by panelId, so the
// store is a single read/write rather than one entry per panel.
type ColumnWidthStore = Record<string, ColumnWidths>;

function readStore(): ColumnWidthStore {
	try {
		const raw = getLocalStorageApi(LOCALSTORAGE.DASHBOARD_V2_PANEL_COLUMN_WIDTHS);
		if (!raw) {
			return {};
		}
		const parsed = JSON.parse(raw);
		return typeof parsed === 'object' && parsed !== null
			? (parsed as ColumnWidthStore)
			: {};
	} catch {
		// Malformed JSON or storage access denied — fall back to no stored widths.
		return {};
	}
}

function writeStore(store: ColumnWidthStore): void {
	setLocalStorageApi(
		LOCALSTORAGE.DASHBOARD_V2_PANEL_COLUMN_WIDTHS,
		JSON.stringify(store),
	);
}

/** Reads the stored widths for one panel (empty when none persisted yet). */
export function readColumnWidths(panelId: string): ColumnWidths {
	return readStore()[panelId] ?? {};
}

/** Persists the widths for one panel, leaving every other panel's entry intact. */
export function writeColumnWidths(panelId: string, widths: ColumnWidths): void {
	const store = readStore();
	store[panelId] = widths;
	writeStore(store);
}

/** Drops one panel's entry (e.g. an abandoned new-panel draft). */
export function clearColumnWidths(panelId: string): void {
	const store = readStore();
	if (!(panelId in store)) {
		return;
	}
	delete store[panelId];
	writeStore(store);
}

/**
 * Re-keys one panel's widths and drops the source entry. A new panel is authored
 * under the new-panel sentinel id and only gets its real id on save, so without
 * this the widths set while authoring would be stranded under the sentinel.
 */
export function transferColumnWidths(
	fromPanelId: string,
	toPanelId: string,
): void {
	if (fromPanelId === toPanelId) {
		return;
	}
	const store = readStore();
	const widths = store[fromPanelId];
	if (!widths) {
		return;
	}
	delete store[fromPanelId];
	store[toPanelId] = widths;
	writeStore(store);
}
