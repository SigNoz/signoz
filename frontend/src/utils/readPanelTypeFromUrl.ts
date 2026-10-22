import { QueryParams } from 'constants/query';
import { PANEL_TYPES } from 'constants/queryBuilder';

import { getUnstableCurrentSearchParams } from './getUnstableCurrentSearchParams';

// The param is JSON-encoded, but a hand-written link can carry it unencoded.
export const readPanelTypeFromUrl = (
	fallback: PANEL_TYPES | null = null,
): PANEL_TYPES | null => {
	const raw = getUnstableCurrentSearchParams().get(QueryParams.panelTypes);

	if (!raw) {
		return fallback;
	}

	try {
		return JSON.parse(raw) as PANEL_TYPES;
	} catch {
		return raw as PANEL_TYPES;
	}
};
