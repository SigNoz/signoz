import setLocalStorageKey from 'api/browser/localstorage/set';
import { TelemetryFieldKey } from 'api/v5/v5';
import { LOCALSTORAGE } from 'constants/localStorage';
import { defaultOptionsQuery } from 'container/OptionsMenu/constants';
import { FontSize, OptionsQuery } from 'container/OptionsMenu/types';
import { Dispatch, SetStateAction } from 'react';

import { FormattingOptions, PreferenceMode, Preferences } from '../types';

// --- LOGS preferences updater config ---
const getLogsUpdaterConfig = (
	preferences: Preferences | null,
	redirectWithOptionsData: (options: OptionsQuery) => void,
	setSavedViewPreferences: Dispatch<SetStateAction<Preferences | null>>,
): {
	updateColumns: (newColumns: TelemetryFieldKey[], mode: string) => void;
	updateFormatting: (newFormatting: FormattingOptions, mode: string) => void;
} => ({
	updateColumns: (newColumns: TelemetryFieldKey[], mode: string): void => {
		if (mode === PreferenceMode.SAVED_VIEW) {
			setSavedViewPreferences((prev) => {
				if (!prev) {
					return {
						columns: newColumns,
						formatting: {
							maxLines: 2,
							format: 'table',
							fontSize: 'small' as FontSize,
							version: 1,
						},
					};
				}

				return {
					...prev,
					columns: newColumns,
				};
			});
		}

		if (mode === PreferenceMode.DIRECT) {
			// just need to update the columns see for remove props
			redirectWithOptionsData({
				...defaultOptionsQuery,
				...preferences?.formatting,
				selectColumns: newColumns,
			});

			// Also update local storage
			const local = JSON.parse(
				localStorage.getItem(LOCALSTORAGE.LOGS_LIST_OPTIONS) || '{}',
			);
			local.selectColumns = newColumns;
			setLocalStorageKey(LOCALSTORAGE.LOGS_LIST_OPTIONS, JSON.stringify(local));
		}
	},
	updateFormatting: (newFormatting: FormattingOptions, mode: string): void => {
		if (mode === PreferenceMode.SAVED_VIEW) {
			setSavedViewPreferences((prev) => {
				if (!prev) return { columns: [], formatting: newFormatting };
				return {
					...prev,
					formatting: newFormatting,
				};
			});
		}

		if (mode === PreferenceMode.DIRECT) {
			redirectWithOptionsData({
				...defaultOptionsQuery,
				...preferences?.formatting,
				...newFormatting,
			});

			// Also update local storage
			const local = JSON.parse(
				localStorage.getItem(LOCALSTORAGE.LOGS_LIST_OPTIONS) || '{}',
			);
			Object.assign(local, newFormatting);
			setLocalStorageKey(LOCALSTORAGE.LOGS_LIST_OPTIONS, JSON.stringify(local));
		}
	},
});

export default getLogsUpdaterConfig;
