import { useCallback, useEffect, useMemo } from 'react';
import { useSelectableFields } from 'hooks/querySuggestions/useSelectableFields';
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
import { buildCompositeKey } from 'container/OptionsMenu/utils';
import { TracesTableRow } from 'container/TracesExplorer/TracesTable/getFieldColumn';
import { TelemetryFieldKey } from 'types/api/v5/queryRange';
import { DataSource } from 'types/common/queryBuilder';

import { buildTraceViewColumns, TRACE_ID_COLUMN_ID } from './configs';

const STORAGE_KEY = LOCALSTORAGE.AI_OBSERVABILITY_TRACE_VIEW_COLUMNS;

/** Matches the id getFieldColumn derives, so fields and columns address alike. */
const columnIdOf = (field: TelemetryFieldKey): string =>
	buildCompositeKey(field.name, field.fieldContext, field.fieldDataType);

interface UseTraceViewColumns {
	columns: TableColumnDef<TracesTableRow>[];
	selectedFields: TelemetryFieldKey[];
	onFieldsChange: (next: TelemetryFieldKey[]) => void;
	requiredFields: readonly string[];
	isLoading: boolean;
}

/** Edits column visibility in the table's own store; the request is unaffected. */
// TODO(ai-explorer): browser-local only, unlike the list views' `?options=` columns.
export function useTraceViewColumns(): UseTraceViewColumns {
	// Same pool the fields selector offers, so columns and choices cannot drift apart.
	const { fields: availableFields, isFetched } = useSelectableFields({
		signal: DataSource.TRACES,
		searchText: '',
		source: 'ai_o11y',
	});

	const columns = useMemo(
		() => buildTraceViewColumns(availableFields),
		[availableFields],
	);

	// Defaults from a partial column set would persist as the user's own choice.
	useEffect(() => {
		if (isFetched) {
			initializeFromDefaults(STORAGE_KEY, columns);
		}
	}, [isFetched, columns]);

	const hiddenColumnIds = useHiddenColumnIds(STORAGE_KEY);
	const columnOrder = useColumnOrder(STORAGE_KEY);

	const selectedFields = useMemo(() => {
		const hidden = new Set(hiddenColumnIds);
		const orderIndex = new Map(columnOrder.map((id, index) => [id, index]));

		return availableFields
			.filter((field) => !hidden.has(columnIdOf(field)))
			.sort(
				(a, b) =>
					(orderIndex.get(columnIdOf(a)) ?? Infinity) -
					(orderIndex.get(columnIdOf(b)) ?? Infinity),
			);
	}, [availableFields, hiddenColumnIds, columnOrder]);

	const onFieldsChange = useCallback(
		(next: TelemetryFieldKey[]): void => {
			const keptIds = new Set(next.map(columnIdOf));

			columns.forEach((column) => {
				if (keptIds.has(column.id) || column.id === TRACE_ID_COLUMN_ID) {
					showColumn(STORAGE_KEY, column.id);
				} else {
					hideColumn(STORAGE_KEY, column.id);
				}
			});

			// Columns missing from the order sort last, so the visible ones suffice.
			setColumnOrder(STORAGE_KEY, next.map(columnIdOf));
		},
		[columns],
	);

	return {
		columns,
		selectedFields,
		onFieldsChange,
		requiredFields: [TRACE_ID_COLUMN_ID],
		isLoading: !isFetched,
	};
}
