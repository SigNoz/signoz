/* eslint-disable no-empty */
import getLocalStorageKey from 'api/browser/localstorage/get';
import { TelemetryFieldKey } from 'api/v5/v5';
import { LOCALSTORAGE } from 'constants/localStorage';
import { defaultLogsSelectedColumns } from 'container/OptionsMenu/constants';
import { FontSize } from 'container/OptionsMenu/types';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';

import { FormattingOptions } from '../types';

/**
 * Validates if a column is valid for Logs Explorer
 * Filters out Traces-specific columns that would cause query failures
 */
const isValidLogColumn = (col: {
	name?: string;
	signal?: string;
	[key: string]: unknown;
}): boolean =>
	// If column has signal field, it must be 'logs'
	!(col?.signal && col.signal !== 'logs');

// --- LOGS preferences loader config ---
const logsLoaders = {
	local: (): {
		columns: BaseAutocompleteData[];
		formatting: FormattingOptions;
	} => {
		const local = getLocalStorageKey(LOCALSTORAGE.LOGS_LIST_OPTIONS);
		if (local) {
			try {
				const parsed = JSON.parse(local);

				const localColumns = parsed.selectColumns || [];

				// Filter out invalid columns (e.g., Logs columns that might have been incorrectly stored)
				const validLogColumns = localColumns.filter(isValidLogColumn);

				return {
					columns: validLogColumns.length > 0 ? validLogColumns : [],
					formatting: {
						maxLines: parsed.maxLines ?? 1,
						format: parsed.format ?? 'table',
						fontSize: parsed.fontSize ?? 'small',
						version: parsed.version ?? 1,
					},
				};
			} catch {}
		}
		return { columns: [], formatting: undefined } as any;
	},
	url: (): {
		columns: BaseAutocompleteData[];
		formatting: FormattingOptions;
	} => {
		const urlParams = new URLSearchParams(window.location.search);
		try {
			const options = JSON.parse(urlParams.get('options') || '{}');

			const urlColumns = options.selectColumns || [];

			// Filter out invalid columns (e.g., Logs columns that might have been incorrectly stored)
			const validLogColumns = urlColumns.filter(isValidLogColumn);

			return {
				columns: validLogColumns.length > 0 ? validLogColumns : [],
				formatting: {
					maxLines: options.maxLines ?? 1,
					format: options.format ?? 'table',
					fontSize: options.fontSize ?? 'small',
					version: options.version ?? 1,
				},
			};
		} catch {}
		return { columns: [], formatting: undefined } as any;
	},
	default: (): {
		columns: TelemetryFieldKey[];
		formatting: FormattingOptions;
	} => ({
		columns: defaultLogsSelectedColumns,
		formatting: {
			maxLines: 1,
			format: 'table',
			fontSize: 'small' as FontSize,
			version: 1,
		},
	}),
	priority: ['local', 'url', 'default'] as const,
};

export default logsLoaders;
