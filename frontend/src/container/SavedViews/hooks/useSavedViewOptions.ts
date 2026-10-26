import { useMemo } from 'react';
import { SavedviewtypesSourceDTO } from 'api/generated/services/sigNoz.schemas';
import { defaultOptionsQuery } from 'container/OptionsMenu/constants';
import { usePreferenceContext } from 'providers/preferences/context/PreferenceContextProvider';
import { PreferenceSource } from 'providers/preferences/types';

import { SavedViewOptions } from '../types';
import {
	getPreferenceSlice,
	getSavedViewPreferenceSource,
} from '../utils/getSavedViewPreferenceSource';

interface UseSavedViewOptionsResult {
	preferenceSource?: PreferenceSource;
	options?: SavedViewOptions;
}

export function useSavedViewOptions(
	source: SavedviewtypesSourceDTO,
	panelType: string | null | undefined,
): UseSavedViewOptionsResult {
	const preferences = usePreferenceContext();
	const preferenceSource = getSavedViewPreferenceSource(source, panelType);
	const preferencesSlice = getPreferenceSlice(preferences, preferenceSource);
	const slicePreferences = preferencesSlice?.preferences;

	const options = useMemo((): SavedViewOptions | undefined => {
		if (!preferencesSlice) {
			return undefined;
		}
		return {
			selectColumns: slicePreferences?.columns || [],
			format: slicePreferences?.formatting?.format || defaultOptionsQuery.format,
			maxLines:
				slicePreferences?.formatting?.maxLines || defaultOptionsQuery.maxLines,
			fontSize:
				slicePreferences?.formatting?.fontSize || defaultOptionsQuery.fontSize,
		};
	}, [preferencesSlice, slicePreferences]);

	return { preferenceSource, options };
}
