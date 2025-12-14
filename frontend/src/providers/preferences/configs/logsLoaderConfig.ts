/* eslint-disable no-empty */
import getLocalStorageKey from 'api/browser/localstorage/get';
import { TelemetryFieldKey } from 'api/v5/v5';
import { LOCALSTORAGE } from 'constants/localStorage';
import { defaultLogsSelectedColumns } from 'container/OptionsMenu/constants';
import { FontSize } from 'container/OptionsMenu/types';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';

import { FormattingOptions } from '../types';

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
				return {
					columns: parsed.selectColumns || [],
					formatting: {
						maxLines: parsed.maxLines ?? 2,
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
			return {
				columns: options.selectColumns || [],
				formatting: {
					maxLines: options.maxLines ?? 2,
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
			maxLines: 2,
			format: 'table',
			fontSize: 'small' as FontSize,
			version: 1,
		},
	}),
	priority: ['local', 'url', 'default'] as const,
};

export default logsLoaders;
