import getLocalStorageKey from 'api/browser/localstorage/get';
import { TelemetryFieldKey } from 'api/v5/v5';

import { AIObservabilityPreference } from '../types';
import {
	AI_OBSERVABILITY_STORAGE_KEYS,
	AI_OBSERVABILITY_URL_PARAMS,
	getAIObservabilityDefaultColumns,
	parseSelectColumns,
	sanitizeColumns,
} from './aiObservabilityConfig';

// --- AI OBSERVABILITY preferences loader config, one per explorer tab ---
const getAIObservabilityLoaderConfig = (
	preference: AIObservabilityPreference,
): {
	local: () => { columns: TelemetryFieldKey[] };
	url: () => { columns: TelemetryFieldKey[] };
	default: () => { columns: TelemetryFieldKey[] };
	priority: readonly ['local', 'url', 'default'];
} => ({
	local: () => ({
		columns:
			sanitizeColumns(
				preference,
				parseSelectColumns(
					getLocalStorageKey(AI_OBSERVABILITY_STORAGE_KEYS[preference]),
				),
			) ?? [],
	}),
	url: () => ({
		columns:
			sanitizeColumns(
				preference,
				parseSelectColumns(
					new URLSearchParams(window.location.search).get(
						AI_OBSERVABILITY_URL_PARAMS[preference],
					),
				),
			) ?? [],
	}),
	default: () => ({ columns: getAIObservabilityDefaultColumns(preference) }),
	priority: ['local', 'url', 'default'] as const,
});

export default getAIObservabilityLoaderConfig;
