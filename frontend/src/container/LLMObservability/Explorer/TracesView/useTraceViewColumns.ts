import { useCallback, useEffect, useMemo } from 'react';
import { useFieldKeysSuggestion } from 'hooks/querySuggestions/useFieldKeysSuggestion';
import { mergeExtraFields } from 'utils/extraFields';
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
import { TracesTableRow } from '../TracesTable/getFieldColumn';
import { TelemetryFieldKey } from 'types/api/v5/queryRange';
import { DATA_SOURCE_TO_SIGNAL, DataSource } from 'types/common/queryBuilder';

import {
	TRACE_VIEW_BUILDER_QUERY_TYPE,
	TRACE_VIEW_COLUMN_EXTRA_FIELDS,
	TRACE_VIEW_FIELD_KEYS,
} from '../constants';
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
	/** Set once the keys fetch lands; without it nothing can reach the persisted store. */
	columnStorageKey?: string;
}

// TODO(ai-explorer): browser-local only, unlike the list views' `?options=` columns.
export function useTraceViewColumns(): UseTraceViewColumns {
	const {
		data: fetchedFields = [],
		isFetched,
		isSuccess,
	} = useFieldKeysSuggestion(
		{
			...TRACE_VIEW_FIELD_KEYS,
			signal: DATA_SOURCE_TO_SIGNAL[DataSource.TRACES],
			searchText: '',
		},
		TRACE_VIEW_BUILDER_QUERY_TYPE,
	);

	const availableFields = useMemo(
		() => mergeExtraFields(TRACE_VIEW_COLUMN_EXTRA_FIELDS, fetchedFields),
		[fetchedFields],
	);

	const columns = useMemo(
		() => buildTraceViewColumns(availableFields),
		[availableFields],
	);

	// Defaults from a partial column set would persist as the user's own choice.
	const columnStorageKey = isSuccess ? STORAGE_KEY : undefined;

	useEffect(() => {
		if (columnStorageKey) {
			initializeFromDefaults(columnStorageKey, columns);
		}
	}, [columnStorageKey, columns]);

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
			if (!columnStorageKey) {
				return;
			}

			const keptIds = new Set(next.map(columnIdOf));

			columns.forEach((column) => {
				if (keptIds.has(column.id) || column.id === TRACE_ID_COLUMN_ID) {
					showColumn(columnStorageKey, column.id);
				} else {
					hideColumn(columnStorageKey, column.id);
				}
			});

			// Columns missing from the order sort last, so the visible ones suffice.
			setColumnOrder(columnStorageKey, next.map(columnIdOf));
		},
		[columns, columnStorageKey],
	);

	return {
		columns,
		selectedFields,
		onFieldsChange,
		requiredFields: [TRACE_ID_COLUMN_ID],
		isLoading: !isFetched,
		columnStorageKey,
	};
}
