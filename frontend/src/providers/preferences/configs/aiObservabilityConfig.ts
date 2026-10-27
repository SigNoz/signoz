import { TelemetryFieldKey } from 'api/v5/v5';
import { LOCALSTORAGE } from 'constants/localStorage';
import { defaultSelectedColumns } from 'container/LLMObservability/Explorer/ListView/configs';
import { buildCompositeKey } from 'container/OptionsMenu/utils';

import { AIObservabilityPreference, PreferenceDataSource } from '../types';

// TODO(ai-explorer): share `options`, keyed by `panelTypes`, once Logs/Traces no longer read or write it on this page.
export const AI_OBSERVABILITY_URL_PARAMS: Record<
	AIObservabilityPreference,
	string
> = {
	[AIObservabilityPreference.LIST]: 'listOptions',
	[AIObservabilityPreference.TRACE]: 'traceOptions',
};

export const AI_OBSERVABILITY_STORAGE_KEYS: Record<
	AIObservabilityPreference,
	LOCALSTORAGE
> = {
	[AIObservabilityPreference.LIST]: LOCALSTORAGE.AI_OBSERVABILITY_LIST_OPTIONS,
	[AIObservabilityPreference.TRACE]: LOCALSTORAGE.AI_OBSERVABILITY_TRACE_OPTIONS,
};

// Trace view defaults depend on the aggregates the keys endpoint reports, so the view applies them.
const AI_OBSERVABILITY_DEFAULT_COLUMNS: Record<
	AIObservabilityPreference,
	TelemetryFieldKey[]
> = {
	[AIObservabilityPreference.LIST]: defaultSelectedColumns,
	[AIObservabilityPreference.TRACE]: [],
};

export const isAIObservabilityPreference = (
	dataSource: PreferenceDataSource,
): dataSource is AIObservabilityPreference =>
	Object.values(AIObservabilityPreference).includes(
		dataSource as AIObservabilityPreference,
	);

export const getAIObservabilityDefaultColumns = (
	preference: AIObservabilityPreference,
): TelemetryFieldKey[] => AI_OBSERVABILITY_DEFAULT_COLUMNS[preference];

type RawColumn = Partial<TelemetryFieldKey> & { key?: string };

/** Drops malformed, non-trace and duplicate fields; `null` when nothing usable is left. */
export const sanitizeColumns = (
	preference: AIObservabilityPreference,
	columns: unknown,
): TelemetryFieldKey[] | null => {
	if (!Array.isArray(columns)) {
		return null;
	}

	const seen = new Set<string>();
	const sanitized = (columns as RawColumn[]).reduce<TelemetryFieldKey[]>(
		(acc, column) => {
			const name = column?.name ?? column?.key;
			if (typeof name !== 'string' || !name) {
				return acc;
			}
			if (column.signal && column.signal !== 'traces') {
				return acc;
			}
			// Per-trace aggregates have no value on a span row.
			if (
				preference === AIObservabilityPreference.LIST &&
				column.fieldContext === 'trace'
			) {
				return acc;
			}

			const id = buildCompositeKey(
				name,
				column.fieldContext,
				column.fieldDataType,
			);
			if (seen.has(id)) {
				return acc;
			}
			seen.add(id);

			const { key: _key, ...field } = column;
			acc.push({ ...field, name } as TelemetryFieldKey);
			return acc;
		},
		[],
	);

	return sanitized.length ? sanitized : null;
};

/** `selectColumns` of a stored options object; `null` when absent or unparseable. */
export const parseSelectColumns = (raw: string | null): unknown => {
	if (!raw) {
		return null;
	}
	try {
		return JSON.parse(raw)?.selectColumns;
	} catch {
		return null;
	}
};
