import { SavedviewtypesSourceDTO } from 'api/generated/services/sigNoz.schemas';

import { PreferenceSlice } from '../types';
import { isPreferenceSourcePage } from '../utils';
import { usePreferenceContext } from './PreferenceContextProvider';

export function usePreferenceSlice(
	sourcePage: SavedviewtypesSourceDTO,
): PreferenceSlice | undefined {
	const context = usePreferenceContext();
	return isPreferenceSourcePage(sourcePage) ? context[sourcePage] : undefined;
}
