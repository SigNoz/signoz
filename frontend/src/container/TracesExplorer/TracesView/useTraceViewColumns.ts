import { useCallback, useMemo, useState } from 'react';
import getLocalStorageKey from 'api/browser/localstorage/get';
import setLocalStorageKey from 'api/browser/localstorage/set';
import { LOCALSTORAGE } from 'constants/localStorage';
import { TelemetryFieldKey } from 'types/api/v5/queryRange';

import {
	DEFAULT_TRACE_VIEW_COLUMNS,
	TRACE_VIEW_COLUMN_REGISTRY,
} from './configs';

function readStoredKeys(): string[] {
	const raw = getLocalStorageKey(LOCALSTORAGE.TRACE_VIEW_COLUMNS);
	if (!raw) {
		return DEFAULT_TRACE_VIEW_COLUMNS;
	}
	try {
		const parsed = JSON.parse(raw) as string[];
		if (!Array.isArray(parsed) || parsed.length === 0) {
			return DEFAULT_TRACE_VIEW_COLUMNS;
		}
		const allowed = new Set(TRACE_VIEW_COLUMN_REGISTRY.map((f) => f.name));
		const filtered = parsed.filter((key) => allowed.has(key));
		return filtered.length > 0 ? filtered : DEFAULT_TRACE_VIEW_COLUMNS;
	} catch {
		return DEFAULT_TRACE_VIEW_COLUMNS;
	}
}

interface UseTraceViewColumnsReturn {
	/** Registry keys currently visible in the table. */
	visibleKeys: string[];
	/** Selected fields as TelemetryFieldKey[] for FieldsSelector. */
	selectedFields: TelemetryFieldKey[];
	/** Full registry — offered as availableFields (no unscoped fetch). */
	availableFields: TelemetryFieldKey[];
	onFieldsChange: (fields: TelemetryFieldKey[]) => void;
}

/**
 * POC: own Trace View column visibility separately from List View's
 * TRACES_LIST_OPTIONS so the two explorers don't collide.
 * Visibility is client-side only — toggling never refetches.
 */
function useTraceViewColumns(): UseTraceViewColumnsReturn {
	const [visibleKeys, setVisibleKeys] = useState<string[]>(readStoredKeys);

	const availableFields = TRACE_VIEW_COLUMN_REGISTRY;

	const selectedFields = useMemo(
		() =>
			visibleKeys
				.map((key) => availableFields.find((f) => f.name === key))
				.filter((f): f is TelemetryFieldKey => Boolean(f)),
		[availableFields, visibleKeys],
	);

	const onFieldsChange = useCallback((fields: TelemetryFieldKey[]): void => {
		const nextKeys = fields.map((f) => f.name);
		const keys = nextKeys.length > 0 ? nextKeys : DEFAULT_TRACE_VIEW_COLUMNS;
		setVisibleKeys(keys);
		setLocalStorageKey(LOCALSTORAGE.TRACE_VIEW_COLUMNS, JSON.stringify(keys));
	}, []);

	return {
		visibleKeys,
		selectedFields,
		availableFields,
		onFieldsChange,
	};
}

export default useTraceViewColumns;
