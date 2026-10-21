/* eslint-disable no-empty */
import getLocalStorageKey from 'api/browser/localstorage/get';
import { TelemetryFieldKey } from 'api/v5/v5';
import { LOCALSTORAGE } from 'constants/localStorage';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';

import { AI_OBSERVABILITY_TRACE_VIEW_URL_OPTIONS } from '../types';

const isValidTraceColumn = (col: {
	name?: string;
	signal?: string;
	[key: string]: unknown;
}): boolean => !(col?.signal && col.signal !== 'traces');

// --- AI OBSERVABILITY TRACE VIEW preferences loader config ---
// Empty columns mean "use the defaults": they depend on the field keys the view fetches.
const aiObservabilityTraceViewLoaders = {
	local: (): {
		columns: BaseAutocompleteData[];
	} => {
		const local = getLocalStorageKey(
			LOCALSTORAGE.AI_OBSERVABILITY_TRACE_VIEW_OPTIONS,
		);
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
			const options = JSON.parse(
				urlParams.get(AI_OBSERVABILITY_TRACE_VIEW_URL_OPTIONS) || '{}',
			);
			const urlColumns = options.selectColumns || [];
			return { columns: urlColumns.filter(isValidTraceColumn) };
		} catch {}
		return { columns: [] };
	},
	default: (): {
		columns: TelemetryFieldKey[];
	} => ({
		columns: [],
	}),
	// A shared link opens with the sender's columns.
	priority: ['url', 'local', 'default'] as const,
};

export default aiObservabilityTraceViewLoaders;
