/* eslint-disable no-empty */
import getLocalStorageKey from 'api/browser/localstorage/get';
import { TelemetryFieldKey } from 'api/v5/v5';
import { LOCALSTORAGE } from 'constants/localStorage';
import { defaultTraceSelectedColumns } from 'container/OptionsMenu/constants';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';

/**
 * Validates if a column is valid for Traces Explorer
 * Filters out Logs-specific columns that would cause query failures
 */
const isValidTraceColumn = (col: {
	name?: string;
	signal?: string;
	[key: string]: unknown;
}): boolean =>
	// If column has signal field, it must be 'traces'
	!(col?.signal && col.signal !== 'traces');

// --- TRACES preferences loader config ---
const tracesLoaders = {
	local: (): {
		columns: BaseAutocompleteData[];
	} => {
		const local = getLocalStorageKey(LOCALSTORAGE.TRACES_LIST_OPTIONS);
		if (local) {
			try {
				const parsed = JSON.parse(local);
				const localColumns = parsed.selectColumns || [];

				// Filter out invalid columns (e.g., Logs columns that might have been incorrectly stored)
				const validTraceColumns = localColumns.filter(isValidTraceColumn);

				return {
					columns: validTraceColumns.length > 0 ? validTraceColumns : [],
				};
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

			// Filter out invalid columns (e.g., Logs columns)
			// Only accept columns that are valid for Traces (signal='traces' or columns without signal that aren't logs-specific)
			const validTraceColumns = urlColumns.filter(isValidTraceColumn);

			// Only return columns if we have valid trace columns, otherwise return empty to fall back to defaults
			return {
				columns: validTraceColumns.length > 0 ? validTraceColumns : [],
			};
		} catch {}
		return { columns: [] };
	},
	default: (): {
		columns: TelemetryFieldKey[];
	} => ({
		columns: defaultTraceSelectedColumns,
	}),
	priority: ['local', 'url', 'default'] as const,
};

export default tracesLoaders;
