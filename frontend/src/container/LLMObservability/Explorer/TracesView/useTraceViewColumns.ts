import { useCallback, useEffect, useMemo } from 'react';
import type { TableColumnDef } from 'components/TanStackTableView/types';
import {
	hideColumn,
	initializeFromDefaults,
	setColumnOrder,
	showColumn,
	useColumnOrder,
	useHiddenColumnIds,
} from 'components/TanStackTableView/useColumnStore';
import { LOCALSTORAGE } from 'constants/localStorage';
import { useTimezone } from 'providers/Timezone';
import { TelemetryFieldKey } from 'types/api/v5/queryRange';

import { TraceListRow } from '../tableUtils';
import { getTraceViewColumns, TRACE_ID_COLUMN_ID } from './configs';

const STORAGE_KEY = LOCALSTORAGE.AI_OBSERVABILITY_TRACE_VIEW_COLUMNS;

/** No fieldContext: the selector's composite key then equals the column id. */
const toFieldKey = (
	column: TableColumnDef<TraceListRow>,
): TelemetryFieldKey => ({
	name: column.id,
	key: column.id,
});

interface UseTraceViewColumns {
	/** Every column; the table applies visibility from the store itself. */
	columns: TableColumnDef<TraceListRow>[];
	availableFields: TelemetryFieldKey[];
	selectedFields: TelemetryFieldKey[];
	onFieldsChange: (next: TelemetryFieldKey[]) => void;
	requiredFields: readonly string[];
}

/** Edits column visibility in the table's own store; the request is unaffected. */
// TODO(ai-explorer): browser-local only, unlike the list views' `?options=` columns.
export function useTraceViewColumns(): UseTraceViewColumns {
	const { formatTimezoneAdjustedTimestamp } = useTimezone();

	const columns = useMemo(
		() => getTraceViewColumns(formatTimezoneAdjustedTimestamp),
		[formatTimezoneAdjustedTimestamp],
	);

	// The store rejects show/hide until an entry exists; an empty result renders no table.
	useEffect(() => {
		initializeFromDefaults(STORAGE_KEY, columns);
	}, [columns]);

	const hiddenColumnIds = useHiddenColumnIds(STORAGE_KEY);
	const columnOrder = useColumnOrder(STORAGE_KEY);

	const availableFields = useMemo(() => columns.map(toFieldKey), [columns]);

	const selectedFields = useMemo(() => {
		const hidden = new Set(hiddenColumnIds);
		const orderIndex = new Map(columnOrder.map((id, index) => [id, index]));

		return columns
			.filter((column) => !hidden.has(column.id))
			.sort(
				(a, b) =>
					(orderIndex.get(a.id) ?? Infinity) - (orderIndex.get(b.id) ?? Infinity),
			)
			.map(toFieldKey);
	}, [columns, hiddenColumnIds, columnOrder]);

	const onFieldsChange = useCallback(
		(next: TelemetryFieldKey[]): void => {
			const nextIds = next.map((field) => field.name);
			const keptIds = new Set(nextIds);

			columns.forEach((column) => {
				if (keptIds.has(column.id) || column.id === TRACE_ID_COLUMN_ID) {
					showColumn(STORAGE_KEY, column.id);
				} else {
					hideColumn(STORAGE_KEY, column.id);
				}
			});

			// Columns missing from the order sort last, so the visible ones suffice.
			setColumnOrder(STORAGE_KEY, nextIds);
		},
		[columns],
	);

	return {
		columns,
		availableFields,
		selectedFields,
		onFieldsChange,
		requiredFields: [TRACE_ID_COLUMN_ID],
	};
}
