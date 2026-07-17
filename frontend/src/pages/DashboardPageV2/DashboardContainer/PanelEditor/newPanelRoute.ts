import { generatePath } from 'react-router-dom';
import { QueryParams } from 'constants/query';
import type { PANEL_TYPES } from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import type { Query } from 'types/api/queryBuilder/queryBuilderData';

import {
	PANEL_KIND_TO_PANEL_TYPE,
	PANEL_TYPE_TO_PANEL_KIND,
	type PanelKind,
} from '../Panels/types/panelKind';

// New (unsaved) panels use a fixed id segment, carrying kind + target section in the
// query (`/panel/new?panelKind=…&layoutIndex=…`); the real id is generated on save.
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

/**
 * New-panel editor link that exports an explorer query into a V2 dashboard. Carries the
 * raw `Query` as `compositeQuery` encoded as the V1 link so `useGetCompositeQueryParam`
 * reads it identically (conversion happens in the editor). `null` when the panel type has
 * no V2 kind, so the caller skips the export instead of landing on an unrelated kind.
 */
export function buildExportPanelLink({
	dashboardId,
	panelType,
	query,
}: {
	dashboardId: string;
	panelType: PANEL_TYPES;
	query: Query;
}): string | null {
	const kind = PANEL_TYPE_TO_PANEL_KIND[panelType];
	if (!kind) {
		return null;
	}
	const path = generatePath(ROUTES.DASHBOARD_PANEL_EDITOR, {
		dashboardId,
		panelId: NEW_PANEL_ID,
	});
	return `${path}${newPanelSearch(kind)}&${
		QueryParams.compositeQuery
	}=${encodeURIComponent(JSON.stringify(query))}`;
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
