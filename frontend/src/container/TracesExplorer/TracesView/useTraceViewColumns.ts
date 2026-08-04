import { useCallback, useMemo, useState } from 'react';
import getLocalStorageKey from 'api/browser/localstorage/get';
import setLocalStorageKey from 'api/browser/localstorage/set';
import { LOCALSTORAGE } from 'constants/localStorage';
import { TelemetryFieldKey } from 'types/api/v5/queryRange';

import { TraceViewColumn } from './configs';

/**
 * Opt-in column selection for Trace View. Passing one enables the Options →
 * Edit columns picker; omitting it leaves Trace View on its base columns with
 * no picker at all.
 *
 * Pass a module-level constant, not an inline literal — a fresh object each
 * render invalidates the memoised column set on every pass.
 */
export interface TraceViewColumnSelection {
	/** Every column offered, in default display order. */
	columns: TraceViewColumn[];
	/** Where this caller persists visibility. Must be unique per view. */
	storageKey: LOCALSTORAGE;
	/** Field names visible before the user customises anything. */
	defaultVisible: string[];
}

interface UseTraceViewColumnsReturn {
	/** Columns to render, in the user's persisted order. */
	visibleColumns: TraceViewColumn[];
	/** Visible fields, for the picker's "added" list. */
	selectedFields: TelemetryFieldKey[];
	/** Every offered field, for the picker's "other" list. */
	availableFields: TelemetryFieldKey[];
	onFieldsChange: (fields: TelemetryFieldKey[]) => void;
}

function readStoredKeys(
	selection: TraceViewColumnSelection | undefined,
): string[] {
	if (!selection) {
		return [];
	}

	const { storageKey, columns, defaultVisible } = selection;
	const raw = getLocalStorageKey(storageKey);
	if (!raw) {
		return defaultVisible;
	}

	try {
		const parsed = JSON.parse(raw) as string[];
		if (!Array.isArray(parsed) || parsed.length === 0) {
			return defaultVisible;
		}
		// Drop anything the caller no longer offers, so a stale localStorage
		// entry from an earlier column set self-heals instead of rendering blank.
		const allowed = new Set(columns.map((column) => column.field.name));
		const filtered = parsed.filter((key) => allowed.has(key));
		return filtered.length > 0 ? filtered : defaultVisible;
	} catch {
		return defaultVisible;
	}
}

/**
 * Owns Trace View column visibility client-side: toggling reorders or hides
 * columns without touching the query, so it never triggers a refetch.
 */
function useTraceViewColumns(
	selection?: TraceViewColumnSelection,
): UseTraceViewColumnsReturn {
	const [visibleKeys, setVisibleKeys] = useState<string[]>(() =>
		readStoredKeys(selection),
	);

	const offeredColumns = selection?.columns;

	const columnsByName = useMemo(
		() =>
			new Map((offeredColumns ?? []).map((column) => [column.field.name, column])),
		[offeredColumns],
	);

	// Ordered by visibleKeys, so reordering in the picker moves the column.
	const visibleColumns = useMemo(
		() =>
			visibleKeys
				.map((key) => columnsByName.get(key))
				.filter((column): column is TraceViewColumn => Boolean(column)),
		[columnsByName, visibleKeys],
	);

	const selectedFields = useMemo(
		() => visibleColumns.map((column) => column.field),
		[visibleColumns],
	);

	const availableFields = useMemo(
		() => (offeredColumns ?? []).map((column) => column.field),
		[offeredColumns],
	);

	const onFieldsChange = useCallback(
		(fields: TelemetryFieldKey[]): void => {
			if (!selection) {
				return;
			}
			const nextKeys = fields.map((field) => field.name);
			const keys = nextKeys.length > 0 ? nextKeys : selection.defaultVisible;
			setVisibleKeys(keys);
			setLocalStorageKey(selection.storageKey, JSON.stringify(keys));
		},
		[selection],
	);

	return {
		visibleColumns,
		selectedFields,
		availableFields,
		onFieldsChange,
	};
}

export default useTraceViewColumns;
