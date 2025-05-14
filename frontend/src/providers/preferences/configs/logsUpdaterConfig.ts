import setLocalStorageKey from 'api/browser/localstorage/set';
import { LOCALSTORAGE } from 'constants/localStorage';
import { defaultOptionsQuery } from 'container/OptionsMenu/constants';
import { FontSize, OptionsQuery } from 'container/OptionsMenu/types';
import { Dispatch, SetStateAction } from 'react';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';

import { FormattingOptions, Preferences } from '../types';

// --- LOGS preferences updater config ---
const getLogsUpdaterConfig = (
	redirectWithOptionsData: (options: OptionsQuery) => void,
	setSavedViewPreferences: Dispatch<SetStateAction<Preferences | null>>,
): {
	updateColumns: (newColumns: BaseAutocompleteData[], mode: string) => void;
	updateFormatting: (newFormatting: FormattingOptions, mode: string) => void;
} => ({
	updateColumns: (newColumns: BaseAutocompleteData[], mode: string): void => {
		if (mode === 'savedView') {
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

		if (mode === 'direct') {
			// redirectWithOptionsData({
			// 	...defaultOptionsQuery,
			// 	selectColumns: newColumns,
			// });

			// Also update local storage
			const local = JSON.parse(
				localStorage.getItem(LOCALSTORAGE.LOGS_LIST_OPTIONS) || '{}',
			);
			local.selectColumns = newColumns;
			setLocalStorageKey(LOCALSTORAGE.LOGS_LIST_OPTIONS, JSON.stringify(local));
		}
	},
	updateFormatting: (newFormatting: FormattingOptions, mode: string): void => {
		// Always update URL
		redirectWithOptionsData({
			...defaultOptionsQuery,
			...newFormatting,
		});

		if (mode === 'direct') {
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
