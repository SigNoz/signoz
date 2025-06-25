/* eslint-disable no-empty */
import getLocalStorageKey from 'api/browser/localstorage/get';
import { LOCALSTORAGE } from 'constants/localStorage';
import { defaultTraceSelectedColumns } from 'container/OptionsMenu/constants';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';

// --- TRACES preferences loader config ---
const tracesLoaders = {
	local: async (): Promise<{
		columns: BaseAutocompleteData[];
	}> => {
		const local = getLocalStorageKey(LOCALSTORAGE.TRACES_LIST_OPTIONS);
		if (local) {
			try {
				const parsed = JSON.parse(local);
				return {
					columns: parsed.selectColumns || [],
				};
			} catch {}
		}
		return { columns: [] };
	},
	url: async (): Promise<{
		columns: BaseAutocompleteData[];
	}> => {
		const urlParams = new URLSearchParams(window.location.search);
		try {
			const options = JSON.parse(urlParams.get('options') || '{}');
			return {
				columns: options.selectColumns || [],
			};
		} catch {}
		return { columns: [] };
	},
	default: async (): Promise<{
		columns: BaseAutocompleteData[];
	}> => ({
		columns: defaultTraceSelectedColumns as BaseAutocompleteData[],
	}),
	priority: ['local', 'url', 'default'] as const,
};

export default tracesLoaders;
