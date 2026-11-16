import { SavedviewtypesSourceDTO } from 'api/generated/services/sigNoz.schemas';
import { PANEL_TYPES } from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import { withBasePath } from 'utils/basePath';

import {
	AI_OBSERVABILITY_COLUMN_PANELS,
	PREFERENCE_SOURCE_PAGES,
} from './constants';
import { PreferenceSourcePage } from './types';

export function isPreferenceSourcePage(
	sourcePage: SavedviewtypesSourceDTO,
): sourcePage is PreferenceSourcePage {
	return (
		PREFERENCE_SOURCE_PAGES as readonly SavedviewtypesSourceDTO[]
	).includes(sourcePage);
}

export function hasPreferences(
	sourcePage: SavedviewtypesSourceDTO,
	panelType: PANEL_TYPES,
): boolean {
	if (sourcePage === SavedviewtypesSourceDTO.ai_observability) {
		return AI_OBSERVABILITY_COLUMN_PANELS.includes(panelType);
	}
	return isPreferenceSourcePage(sourcePage);
}

// The url `options` param belongs to the explorer that is open, so a link to
// one explorer never seeds another explorer's slice.
export function isAiObservabilityExplorerRoute(): boolean {
	return (
		window.location.pathname === withBasePath(ROUTES.AI_OBSERVABILITY_EXPLORER)
	);
}
