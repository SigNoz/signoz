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

/** Reads the stored widths for one panel (empty when none persisted yet). */
export function readColumnWidths(panelId: string): ColumnWidths {
	return readStore()[panelId] ?? {};
}

/** Persists the widths for one panel, leaving every other panel's entry intact. */
export function writeColumnWidths(panelId: string, widths: ColumnWidths): void {
	const store = readStore();
	store[panelId] = widths;
	setLocalStorageApi(
		LOCALSTORAGE.DASHBOARD_V2_PANEL_COLUMN_WIDTHS,
		JSON.stringify(store),
	);
}
