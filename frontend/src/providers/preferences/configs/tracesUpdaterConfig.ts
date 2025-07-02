import setLocalStorageKey from 'api/browser/localstorage/set';
import { TelemetryFieldKey } from 'api/v5/v5';
import { LOCALSTORAGE } from 'constants/localStorage';
import { defaultOptionsQuery } from 'container/OptionsMenu/constants';
import { FontSize, OptionsQuery } from 'container/OptionsMenu/types';
import { Dispatch, SetStateAction } from 'react';

import { PreferenceMode, Preferences } from '../types';

// --- TRACES preferences updater config ---
const getTracesUpdaterConfig = (
	redirectWithOptionsData: (options: OptionsQuery) => void,
	setSavedViewPreferences: Dispatch<SetStateAction<Preferences | null>>,
): {
	updateColumns: (newColumns: TelemetryFieldKey[], mode: string) => void;
	updateFormatting: () => void;
} => ({
	updateColumns: (newColumns: TelemetryFieldKey[], mode: string): void => {
		// remove the formatting props
		if (mode === PreferenceMode.SAVED_VIEW) {
			setSavedViewPreferences({
				columns: newColumns,
				formatting: {
					maxLines: 2,
					format: 'table',
					fontSize: 'small' as FontSize,
					version: 1,
				},
			});
		}

		if (mode === PreferenceMode.DIRECT) {
			// just need to update the columns see for remove props
			redirectWithOptionsData({
				...defaultOptionsQuery,
				selectColumns: newColumns,
			});

			const local = JSON.parse(
				localStorage.getItem(LOCALSTORAGE.TRACES_LIST_OPTIONS) || '{}',
			);
			local.selectColumns = newColumns;
			setLocalStorageKey(LOCALSTORAGE.TRACES_LIST_OPTIONS, JSON.stringify(local));
		}
	},
	updateFormatting: (): void => {}, // no-op for traces
});

export default getTracesUpdaterConfig;
