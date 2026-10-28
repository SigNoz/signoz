import { useCallback, useMemo } from 'react';
import { TelemetryFieldKey } from 'api/v5/v5';
import type { TableColumnDef } from 'components/TanStackTableView/types';
import { OptionsMenuConfig } from 'container/OptionsMenu/types';
import { buildCompositeKey } from 'container/OptionsMenu/utils';
import { usePreferenceContext } from 'providers/preferences/context/PreferenceContextProvider';

import { getFieldColumn, TracesTableRow } from '../TracesTable/getFieldColumn';
import { defaultSelectedColumns, TIMESTAMP_FIELD } from './configs';

const columnIdOf = (field: TelemetryFieldKey): string =>
	buildCompositeKey(field.name, field.fieldContext, field.fieldDataType);

interface UseListViewColumns {
	selectedColumns: TelemetryFieldKey[];
	/** Changes on add/remove only, so a reorder doesn't refetch. */
	selectColumnsSignature: string;
	columns: TableColumnDef<TracesTableRow>[];
	config: OptionsMenuConfig;
	onColumnOrderChange: (cols: TableColumnDef<TracesTableRow>[]) => void;
	onColumnRemove: (columnId: string) => void;
}

export function useListViewColumns(): UseListViewColumns {
	const { preferences, updateColumns } = usePreferenceContext().aiObservability;

	const selectedColumns = useMemo(
		() =>
			(preferences?.columns ?? defaultSelectedColumns).filter(
				(field) => field.name !== TIMESTAMP_FIELD.name,
			),
		[preferences?.columns],
	);

	const selectColumnsSignature = useMemo(
		() =>
			selectedColumns
				.map((field) => field.name)
				.sort()
				.join(','),
		[selectedColumns],
	);

	const columns = useMemo(
		() => [TIMESTAMP_FIELD, ...selectedColumns].map(getFieldColumn),
		[selectedColumns],
	);

	const config = useMemo<OptionsMenuConfig>(
		() => ({
			fieldsSelector: { value: selectedColumns, onFieldsChange: updateColumns },
		}),
		[selectedColumns, updateColumns],
	);

	const onColumnOrderChange = useCallback(
		(cols: TableColumnDef<TracesTableRow>[]): void => {
			const byId = new Map(selectedColumns.map((f) => [columnIdOf(f), f]));
			updateColumns(
				cols
					.map((col) => byId.get(col.id))
					.filter((f): f is TelemetryFieldKey => !!f),
			);
		},
		[selectedColumns, updateColumns],
	);

	const onColumnRemove = useCallback(
		(columnId: string): void => {
			updateColumns(selectedColumns.filter((f) => columnIdOf(f) !== columnId));
		},
		[selectedColumns, updateColumns],
	);

	return {
		selectedColumns,
		selectColumnsSignature,
		columns,
		config,
		onColumnOrderChange,
		onColumnRemove,
	};
}
