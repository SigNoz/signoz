import setLocalStorageKey from 'api/browser/localstorage/set';
import { LOCALSTORAGE } from 'constants/localStorage';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';

// --- TRACES preferences updater config ---
const tracesUpdater = {
	updateColumns: (newColumns: BaseAutocompleteData[], mode: string): void => {
		const url = new URL(window.location.href);
		const options = JSON.parse(url.searchParams.get('options') || '{}');
		options.selectColumns = newColumns;
		url.searchParams.set('options', JSON.stringify(options));
		window.history.replaceState({}, '', url.toString());

		if (mode === 'direct') {
			const local = JSON.parse(
				localStorage.getItem(LOCALSTORAGE.TRACES_LIST_OPTIONS) || '{}',
			);
			local.selectColumns = newColumns;
			setLocalStorageKey(LOCALSTORAGE.TRACES_LIST_OPTIONS, JSON.stringify(local));
		}
	},
	updateFormatting: (): void => {}, // no-op for traces
};

export default tracesUpdater;
