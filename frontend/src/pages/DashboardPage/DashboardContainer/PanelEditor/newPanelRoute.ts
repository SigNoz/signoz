import { generatePath } from 'react-router-dom';
import { QueryParams } from 'constants/query';
import type { PANEL_TYPES } from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import type { Query } from 'types/api/queryBuilder/queryBuilderData';

import type { NewPanelTarget } from '../patchOps';
import { PANELS } from '../Panels/registry';
import {
	PANEL_TYPE_TO_PANEL_KIND,
	type PanelKind,
} from '../Panels/types/panelKind';

// New (unsaved) panels use a fixed id segment, carrying kind + target in the query
// (`/panel/new?panelKind=…&layoutIndex=<index|root>` or `&newSection=<title>`).
export const NEW_PANEL_ID = 'new';
const PANEL_KIND_PARAM = 'panelKind';
const LAYOUT_INDEX_PARAM = 'layoutIndex';
const NEW_SECTION_PARAM = 'newSection';
const ROOT_LAYOUT = 'root';

/** Query string (incl. leading `?`) for the new-panel editor route. */
export function newPanelSearch(
	panelKind: PanelKind,
	target?: NewPanelTarget,
): string {
	const params = new URLSearchParams({ [PANEL_KIND_PARAM]: panelKind });
	if (target?.type === 'section') {
		params.set(LAYOUT_INDEX_PARAM, String(target.layoutIndex));
	} else if (target?.type === 'root') {
		params.set(LAYOUT_INDEX_PARAM, ROOT_LAYOUT);
	} else if (target?.type === 'newSection') {
		params.set(NEW_SECTION_PARAM, target.title);
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
	// Gated on the registry, not the legacy map — a static kind has no legacy
	// panel type, and the map would reject its route as a stale link.
	return kind && kind in PANELS ? (kind as PanelKind) : null;
}

/**
 * New-panel editor link that exports an explorer query into a V2 dashboard. Carries the
 * raw `Query` as `compositeQuery` (conversion happens in the editor). `null` when the panel
 * type has no V2 kind, so the caller skips the export instead of landing on an unrelated kind.
 *
 * Double-encoded on purpose: `useGetCompositeQueryParam` decodes twice, so a single encode
 * would let a bare `%`/`+` (e.g. `ILIKE 'Inf%'`) break its second decode and drop the query.
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
	}=${encodeURIComponent(encodeURIComponent(JSON.stringify(query)))}`;
}

export function parseNewPanelTarget(
	search: string,
): NewPanelTarget | undefined {
	const params = new URLSearchParams(search);
	const title = params.get(NEW_SECTION_PARAM)?.trim();
	if (title) {
		return { type: 'newSection', title };
	}
	const raw = params.get(LAYOUT_INDEX_PARAM);
	if (raw === ROOT_LAYOUT) {
		return { type: 'root' };
	}
	if (raw === null || raw === '') {
		return undefined;
	}
	const n = Number(raw);
	return Number.isNaN(n) ? undefined : { type: 'section', layoutIndex: n };
}
