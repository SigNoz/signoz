import setLocalStorageKey from 'api/browser/localstorage/set';
import { LOCALSTORAGE } from 'constants/localStorage';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';

import { FormattingOptions } from '../types';

// --- LOGS preferences updater config ---
const logsUpdater = {
	updateColumns: (newColumns: BaseAutocompleteData[], mode: string): void => {
		// Always update URL
		const url = new URL(window.location.href);
		const options = JSON.parse(url.searchParams.get('options') || '{}');
		options.selectColumns = newColumns;
		url.searchParams.set('options', JSON.stringify(options));
		window.history.replaceState({}, '', url.toString());

		if (mode === 'direct') {
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
		const url = new URL(window.location.href);
		const options = JSON.parse(url.searchParams.get('options') || '{}');
		Object.assign(options, newFormatting);
		url.searchParams.set('options', JSON.stringify(options));
		window.history.replaceState({}, '', url.toString());

		if (mode === 'direct') {
			// Also update local storage
			const local = JSON.parse(
				localStorage.getItem(LOCALSTORAGE.LOGS_LIST_OPTIONS) || '{}',
			);
			Object.assign(local, newFormatting);
			setLocalStorageKey(LOCALSTORAGE.LOGS_LIST_OPTIONS, JSON.stringify(local));
		}
	},
};

export default logsUpdater;
