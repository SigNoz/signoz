import { Dispatch, SetStateAction } from 'react';
import setLocalStorageKey from 'api/browser/localstorage/set';
import { TelemetryFieldKey } from 'api/v5/v5';
import { LOCALSTORAGE } from 'constants/localStorage';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { defaultOptionsQuery } from 'container/OptionsMenu/constants';
import { OptionsQuery } from 'container/OptionsMenu/types';

import { PreferenceMode, Preferences } from '../types';
import aiObservabilityLoaderConfig from './aiObservabilityLoaderConfig';

// --- AI OBSERVABILITY preferences updater config ---
const getAiObservabilityUpdaterConfig = (
	redirectWithOptionsData: (options: OptionsQuery) => void,
	setSavedViewPreferences: Dispatch<SetStateAction<Preferences | null>>,
	panelType: PANEL_TYPES | undefined,
): {
	updateColumns: (newColumns: TelemetryFieldKey[], mode: string) => void;
	updateFormatting: () => void;
} => ({
	updateColumns: (newColumns, mode): void => {
		if (!panelType) {
			return;
		}

		if (mode === PreferenceMode.SAVED_VIEW) {
			setSavedViewPreferences({ columns: newColumns, panelType });
		}

		if (mode === PreferenceMode.DIRECT) {
			const panels = {
				...aiObservabilityLoaderConfig.local().panels,
				[panelType]: newColumns,
			};
			redirectWithOptionsData({
				...defaultOptionsQuery,
				selectColumns: newColumns,
			});
			setLocalStorageKey(
				LOCALSTORAGE.AI_OBSERVABILITY_OPTIONS,
				JSON.stringify(panels),
			);
		}
	},
	updateFormatting: (): void => {}, // no-op for ai observability
});

export default getAiObservabilityUpdaterConfig;
