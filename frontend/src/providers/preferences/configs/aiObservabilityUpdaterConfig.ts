import { Dispatch, SetStateAction } from 'react';
import getLocalStorageKey from 'api/browser/localstorage/get';
import setLocalStorageKey from 'api/browser/localstorage/set';
import { TelemetryFieldKey } from 'api/v5/v5';
import { LOCALSTORAGE } from 'constants/localStorage';
import { defaultOptionsQuery } from 'container/OptionsMenu/constants';
import { OptionsQuery } from 'container/OptionsMenu/types';

import { PreferenceMode, Preferences } from '../types';

// --- AI OBSERVABILITY preferences updater config ---
const getAIObservabilityUpdaterConfig = (
	redirectWithOptionsData: (options: OptionsQuery) => void,
	setSavedViewPreferences: Dispatch<SetStateAction<Preferences | null>>,
): {
	updateColumns: (newColumns: TelemetryFieldKey[], mode: string) => void;
	updateFormatting: () => void;
} => ({
	updateColumns: (newColumns: TelemetryFieldKey[], mode: string): void => {
		if (mode === PreferenceMode.SAVED_VIEW) {
			setSavedViewPreferences({ columns: newColumns });
		}

		if (mode === PreferenceMode.DIRECT) {
			redirectWithOptionsData({
				...defaultOptionsQuery,
				selectColumns: newColumns,
			});

			const local = JSON.parse(
				getLocalStorageKey(LOCALSTORAGE.AI_OBSERVABILITY_LIST_OPTIONS) || '{}',
			);
			local.selectColumns = newColumns;
			setLocalStorageKey(
				LOCALSTORAGE.AI_OBSERVABILITY_LIST_OPTIONS,
				JSON.stringify(local),
			);
		}
	},
	updateFormatting: (): void => {}, // no-op for AI observability
});

export default getAIObservabilityUpdaterConfig;
