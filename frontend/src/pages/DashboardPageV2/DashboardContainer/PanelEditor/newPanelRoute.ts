import {
	PANEL_KIND_TO_PANEL_TYPE,
	type PanelKind,
} from '../Panels/types/panelKind';

// New (unsaved) panels share a fixed id segment, carrying kind + target section
// in the query: `/panel/new?panelKind=signoz/ListPanel&layoutIndex=2`. The real
// id is generated on save.
export const NEW_PANEL_ID = 'new';
const PANEL_KIND_PARAM = 'panelKind';
const LAYOUT_INDEX_PARAM = 'layoutIndex';

/** Query string (incl. leading `?`) for the new-panel editor route. */
export function newPanelSearch(
	panelKind: PanelKind,
	layoutIndex?: number,
): string {
	const params = new URLSearchParams({ [PANEL_KIND_PARAM]: panelKind });
	if (layoutIndex !== undefined) {
		params.set(LAYOUT_INDEX_PARAM, String(layoutIndex));
	}
	return `?${params.toString()}`;
}

/**
 * The PanelKind a `panel/new` route is creating, or null when the id isn't the
 * new-panel sentinel or the `panelKind` param is missing/unknown (stale link).
 */
export function parseNewPanelKind(
	panelId: string,
	search: string,
): PanelKind | null {
	if (panelId !== NEW_PANEL_ID) {
		return null;
	}
	const kind = new URLSearchParams(search).get(PANEL_KIND_PARAM);
	return kind && kind in PANEL_KIND_TO_PANEL_TYPE ? (kind as PanelKind) : null;
}

/** Target section index for a new panel, or undefined when unset/invalid. */
export function parseNewPanelLayoutIndex(search: string): number | undefined {
	const raw = new URLSearchParams(search).get(LAYOUT_INDEX_PARAM);
	if (raw === null || raw === '') {
		return undefined;
	}
	const n = Number(raw);
	return Number.isNaN(n) ? undefined : n;
}
