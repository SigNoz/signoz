import { Dispatch, SetStateAction } from 'react';
import removeLocalStorageKey from 'api/browser/localstorage/remove';
import setLocalStorageKey from 'api/browser/localstorage/set';
import { TelemetryFieldKey } from 'api/v5/v5';
import { defaultOptionsQuery } from 'container/OptionsMenu/constants';
import { OptionsQuery } from 'container/OptionsMenu/types';

import { AIObservabilityPreference, PreferenceMode, Preferences } from '../types';
import {
	AI_OBSERVABILITY_STORAGE_KEYS,
	sanitizeColumns,
} from './aiObservabilityConfig';

// --- AI OBSERVABILITY preferences updater config, one per explorer tab ---
const getAIObservabilityUpdaterConfig = (
	preference: AIObservabilityPreference,
	redirectWithOptionsData: (options: OptionsQuery) => void,
	setSavedViewPreferences: Dispatch<SetStateAction<Preferences | null>>,
): {
	updateColumns: (newColumns: TelemetryFieldKey[], mode: string) => void;
	updateFormatting: () => void;
} => ({
	updateColumns: (newColumns: TelemetryFieldKey[], mode: string): void => {
		// An emptied selection is stored as none, so the loader falls back to the defaults.
		const columns = sanitizeColumns(preference, newColumns) ?? [];

		if (mode === PreferenceMode.SAVED_VIEW) {
			setSavedViewPreferences({ columns });
			return;
		}

		redirectWithOptionsData({ ...defaultOptionsQuery, selectColumns: columns });
		if (columns.length) {
			setLocalStorageKey(
				AI_OBSERVABILITY_STORAGE_KEYS[preference],
				JSON.stringify({ selectColumns: columns }),
			);
		} else {
			removeLocalStorageKey(AI_OBSERVABILITY_STORAGE_KEYS[preference]);
		}
	},
	updateFormatting: (): void => {}, // no-op for the AI explorer
});

export default getAIObservabilityUpdaterConfig;
