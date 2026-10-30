import { SavedviewtypesSourceDTO } from 'api/generated/services/sigNoz.schemas';

import { PREFERENCE_SOURCE_PAGES } from './constants';
import { PreferenceSourcePage } from './types';

export function isPreferenceSourcePage(
	sourcePage: SavedviewtypesSourceDTO,
): sourcePage is PreferenceSourcePage {
	return (
		PREFERENCE_SOURCE_PAGES as readonly SavedviewtypesSourceDTO[]
	).includes(sourcePage);
}
