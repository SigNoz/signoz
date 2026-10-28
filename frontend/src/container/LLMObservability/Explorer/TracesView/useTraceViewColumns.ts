import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useFieldKeysSuggestion } from 'hooks/querySuggestions/useFieldKeysSuggestion';
import { mergeExtraFields } from 'utils/extraFields';
import type { TableColumnDef } from 'components/TanStackTableView/types';
import {
	setColumnOrder,
	showColumn,
	useColumnOrder,
	useHiddenColumnIds,
} from 'components/TanStackTableView/useColumnStore';
import { LOCALSTORAGE } from 'constants/localStorage';
import { useOptionsMenu } from 'container/OptionsMenu';
import { AIObservabilityPreference } from 'providers/preferences/types';
import { TracesTableRow } from '../TracesTable/getFieldColumn';
import { TelemetryFieldKey } from 'types/api/v5/queryRange';
import { DATA_SOURCE_TO_SIGNAL, DataSource } from 'types/common/queryBuilder';

import {
	TRACE_VIEW_BUILDER_QUERY_TYPE,
	TRACE_VIEW_COLUMN_EXTRA_FIELDS,
	TRACE_VIEW_FIELD_KEYS,
} from '../constants';
import {
	buildTraceViewColumns,
	columnIdOf,
	getDefaultTraceViewFields,
	getLegacyTraceViewSelection,
	sortByDefaultOrder,
	TRACE_ID_COLUMN_ID,
} from './configs';

/** Now only column widths; it held the selection as hidden ids + order before the preference slice. */
const TABLE_STORAGE_KEY = LOCALSTORAGE.AI_OBSERVABILITY_TRACE_VIEW_COLUMNS;

interface UseTraceViewColumns {
	columns: TableColumnDef<TracesTableRow>[];
	selectedFields: TelemetryFieldKey[];
	onFieldsChange: (next: TelemetryFieldKey[]) => void;
	onColumnOrderChange: (cols: TableColumnDef<TracesTableRow>[]) => void;
	onColumnRemove: (columnId: string) => void;
	requiredFields: readonly string[];
	isLoading: boolean;
	/** False until the keys fetch lands; a partial set must not reach the persisted store. */
	canPersistColumns: boolean;
}

const withTraceId = (
	fields: TelemetryFieldKey[],
	availableFields: TelemetryFieldKey[],
): TelemetryFieldKey[] => {
	if (fields.some((field) => field.name === TRACE_ID_COLUMN_ID)) {
		return fields;
	}
	const traceId = availableFields.find(
		(field) => field.name === TRACE_ID_COLUMN_ID,
	);
	return traceId ? [traceId, ...fields] : fields;
};

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
		() =>
			sortByDefaultOrder(
				mergeExtraFields(TRACE_VIEW_COLUMN_EXTRA_FIELDS, fetchedFields),
			),
		[fetchedFields],
	);

	const { options, config } = useOptionsMenu({
		dataSource: AIObservabilityPreference.TRACE,
	});
	// Nothing stored loads as an empty list; the defaults then come from the pool.
	const storedFields = options?.selectColumns?.length
		? options.selectColumns
		: null;
	const updateColumns = config?.fieldsSelector?.onFieldsChange;

	// Captured on first render, before the table prunes hidden ids it no longer renders.
	const legacyHiddenIds = useHiddenColumnIds(TABLE_STORAGE_KEY);
	const legacyOrder = useColumnOrder(TABLE_STORAGE_KEY);
	const legacy = useRef({ hiddenIds: legacyHiddenIds, order: legacyOrder });

	const migratedFields = useMemo(
		() =>
			isSuccess && !storedFields
				? getLegacyTraceViewSelection(
						availableFields,
						legacy.current.hiddenIds,
						legacy.current.order,
					)
				: null,
		[isSuccess, storedFields, availableFields],
	);

	// updateColumns changes identity every render; the migration must still run once.
	const hasMigrated = useRef(false);
	useEffect(() => {
		if (!migratedFields || hasMigrated.current) {
			return;
		}
		hasMigrated.current = true;
		updateColumns?.(migratedFields);
		// Clear the old encoding so a later reset to defaults isn't migrated again.
		setColumnOrder(TABLE_STORAGE_KEY, []);
		legacy.current.hiddenIds.forEach((id) => showColumn(TABLE_STORAGE_KEY, id));
		legacy.current = { hiddenIds: [], order: [] };
	}, [migratedFields, updateColumns]);

	const selectedFields = useMemo(() => {
		const byName = new Map(availableFields.map((field) => [field.name, field]));
		const source =
			storedFields ?? migratedFields ?? getDefaultTraceViewFields(availableFields);
		// Stored fields the endpoint no longer reports are dropped.
		const resolved = source
			.map((field) => byName.get(field.name))
			.filter((field): field is TelemetryFieldKey => !!field);
		return withTraceId(resolved, availableFields);
	}, [availableFields, storedFields, migratedFields]);

	const columns = useMemo(
		() => buildTraceViewColumns(selectedFields),
		[selectedFields],
	);

	const onFieldsChange = useCallback(
		(next: TelemetryFieldKey[]): void => {
			if (!isSuccess) {
				return;
			}
			updateColumns?.(withTraceId(next, availableFields));
		},
		[isSuccess, availableFields, updateColumns],
	);

	const onColumnOrderChange = useCallback(
		(cols: TableColumnDef<TracesTableRow>[]): void => {
			const orderIndex = new Map(cols.map((col, index) => [col.id, index]));
			onFieldsChange(
				[...selectedFields].sort(
					(a, b) =>
						(orderIndex.get(columnIdOf(a)) ?? Infinity) -
						(orderIndex.get(columnIdOf(b)) ?? Infinity),
				),
			);
		},
		[selectedFields, onFieldsChange],
	);

	const onColumnRemove = useCallback(
		(columnId: string): void => {
			if (columnId === TRACE_ID_COLUMN_ID) {
				return;
			}
			onFieldsChange(
				selectedFields.filter((field) => columnIdOf(field) !== columnId),
			);
		},
		[selectedFields, onFieldsChange],
	);

	return {
		columns,
		selectedFields,
		onFieldsChange,
		onColumnOrderChange,
		onColumnRemove,
		requiredFields: [TRACE_ID_COLUMN_ID],
		isLoading: !isFetched,
		canPersistColumns: isSuccess,
	};
}
