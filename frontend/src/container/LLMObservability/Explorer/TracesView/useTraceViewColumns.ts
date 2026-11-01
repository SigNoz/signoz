import { useCallback, useMemo } from 'react';
import { useFieldKeysSuggestion } from 'hooks/querySuggestions/useFieldKeysSuggestion';
import { mergeExtraFields } from 'utils/extraFields';
import type { TableColumnDef } from 'components/TanStackTableView/types';
import { buildCompositeKey } from 'container/OptionsMenu/utils';
import { usePreferenceContext } from 'providers/preferences/context/PreferenceContextProvider';
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
	isDefaultVisible,
	sortByDefaultOrder,
	TRACE_ID_COLUMN_ID,
} from './configs';

/** Matches the id getFieldColumn derives, so fields and columns address alike. */
const columnIdOf = (field: TelemetryFieldKey): string =>
	buildCompositeKey(field.name, field.fieldContext, field.fieldDataType);

const isTraceId = (field: TelemetryFieldKey): boolean =>
	columnIdOf(field) === TRACE_ID_COLUMN_ID;

interface UseTraceViewColumns {
	/** Visible columns, in the user's order. */
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

export function useTraceViewColumns(): UseTraceViewColumns {
	const { preferences, updateColumns } =
		usePreferenceContext().aiObservabilityTraceView;

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

	// Stored fields resolve against the pool, so a field that is gone drops out; none left means the defaults.
	const selectedFields = useMemo(() => {
		const byId = new Map(
			availableFields.map((field) => [columnIdOf(field), field]),
		);
		const stored = (preferences?.columns ?? [])
			.map((field) => byId.get(columnIdOf(field)))
			.filter((field): field is TelemetryFieldKey => !!field);
		const selected = stored.length
			? stored
			: availableFields.filter(isDefaultVisible);
		const traceId = byId.get(TRACE_ID_COLUMN_ID);

		return selected.some(isTraceId) || !traceId
			? selected
			: [traceId, ...selected];
	}, [availableFields, preferences?.columns]);

	const columns = useMemo(
		() => buildTraceViewColumns(selectedFields),
		[selectedFields],
	);

	const onFieldsChange = useCallback(
		(next: TelemetryFieldKey[]): void => {
			if (!isSuccess) {
				return;
			}
			const traceId = selectedFields.find(isTraceId);
			updateColumns(next.some(isTraceId) || !traceId ? next : [traceId, ...next]);
		},
		[isSuccess, selectedFields, updateColumns],
	);

	const onColumnOrderChange = useCallback(
		(cols: TableColumnDef<TracesTableRow>[]): void => {
			const byId = new Map(
				selectedFields.map((field) => [columnIdOf(field), field]),
			);
			onFieldsChange(
				cols
					.map((col) => byId.get(col.id))
					.filter((field): field is TelemetryFieldKey => !!field),
			);
		},
		[selectedFields, onFieldsChange],
	);

	const onColumnRemove = useCallback(
		(columnId: string): void => {
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
