/* eslint-disable no-empty */
import getLocalStorageKey from 'api/browser/localstorage/get';
import { TelemetryFieldKey } from 'api/v5/v5';
import { LOCALSTORAGE } from 'constants/localStorage';
import { defaultSelectedColumns } from 'container/LLMObservability/Explorer/ListView/configs';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';

const isValidTraceColumn = (col: {
	name?: string;
	signal?: string;
	[key: string]: unknown;
}): boolean => !(col?.signal && col.signal !== 'traces');

// --- AI OBSERVABILITY preferences loader config ---
const aiObservabilityLoaders = {
	local: (): {
		columns: BaseAutocompleteData[];
	} => {
		const local = getLocalStorageKey(LOCALSTORAGE.AI_OBSERVABILITY_LIST_OPTIONS);
		if (local) {
			try {
				const parsed = JSON.parse(local);
				const localColumns = parsed.selectColumns || [];
				return { columns: localColumns.filter(isValidTraceColumn) };
			} catch {}
		}
		return { columns: [] };
	},
	url: (): {
		columns: BaseAutocompleteData[];
	} => {
		const urlParams = new URLSearchParams(window.location.search);
		try {
			const options = JSON.parse(urlParams.get('options') || '{}');
			const urlColumns = options.selectColumns || [];
			return { columns: urlColumns.filter(isValidTraceColumn) };
		} catch {}
		return { columns: [] };
	},
	default: (): {
		columns: TelemetryFieldKey[];
	} => ({
		columns: defaultSelectedColumns,
	}),
	priority: ['local', 'url', 'default'] as const,
};

export default aiObservabilityLoaders;
