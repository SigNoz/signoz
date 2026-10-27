import { useCallback, useMemo, useState } from 'react';
import { toast } from '@signozhq/ui/sonner';
import getLocalStorageKey from 'api/browser/localstorage/get';
import removeLocalStorageKey from 'api/browser/localstorage/remove';
import setLocalStorageKey from 'api/browser/localstorage/set';
import type { TelemetryFieldKey } from 'api/v5/v5';
import type { TableColumnDef } from 'components/TanStackTableView/types';
import { LOCALSTORAGE } from 'constants/localStorage';
import { OptionsMenuConfig } from 'container/OptionsMenu/types';
import { buildCompositeKey } from 'container/OptionsMenu/utils';

import { TracesTableRow } from '../TracesTable/getFieldColumn';
import { defaultSelectedColumns } from './configs';

export const LAST_COLUMN_ERROR = 'There must be at least one selected column';

const STORAGE_KEY = LOCALSTORAGE.AI_OBSERVABILITY_LIST_OPTIONS;

const columnIdOf = (field: TelemetryFieldKey): string =>
	buildCompositeKey(field.name, field.fieldContext, field.fieldDataType);

const loadSelectedFields = (): TelemetryFieldKey[] => {
	try {
		const stored = JSON.parse(getLocalStorageKey(STORAGE_KEY) ?? '');
		return Array.isArray(stored?.selectColumns) && stored.selectColumns.length
			? stored.selectColumns
			: defaultSelectedColumns;
	} catch {
		return defaultSelectedColumns;
	}
};

interface UseListViewColumns {
	selectedFields: TelemetryFieldKey[];
	fieldsSelectorConfig: OptionsMenuConfig;
	onColumnOrderChange: (cols: TableColumnDef<TracesTableRow>[]) => void;
	onColumnRemove: (columnId: string) => void;
}

export function useListViewColumns(): UseListViewColumns {
	const [selectedFields, setSelectedFields] = useState(loadSelectedFields);

	const updateSelectedFields = useCallback((next: TelemetryFieldKey[]): void => {
		// An emptied selection falls back to the defaults.
		if (!next.length) {
			removeLocalStorageKey(STORAGE_KEY);
			setSelectedFields(defaultSelectedColumns);
			return;
		}
		setLocalStorageKey(STORAGE_KEY, JSON.stringify({ selectColumns: next }));
		setSelectedFields(next);
	}, []);

	const fieldsSelectorConfig = useMemo<OptionsMenuConfig>(
		() => ({
			fieldsSelector: {
				value: selectedFields,
				onFieldsChange: updateSelectedFields,
			},
		}),
		[selectedFields, updateSelectedFields],
	);

	const onColumnOrderChange = useCallback(
		(cols: TableColumnDef<TracesTableRow>[]): void => {
			const orderIndex = new Map(cols.map((col, index) => [col.id, index]));
			updateSelectedFields(
				[...selectedFields].sort(
					(a, b) =>
						(orderIndex.get(columnIdOf(a)) ?? Infinity) -
						(orderIndex.get(columnIdOf(b)) ?? Infinity),
				),
			);
		},
		[selectedFields, updateSelectedFields],
	);

	const onColumnRemove = useCallback(
		(columnId: string): void => {
			const next = selectedFields.filter(
				(field) => columnIdOf(field) !== columnId,
			);
			if (!next.length) {
				toast.error(LAST_COLUMN_ERROR);
				return;
			}
			updateSelectedFields(next);
		},
		[selectedFields, updateSelectedFields],
	);

	return {
		selectedFields,
		fieldsSelectorConfig,
		onColumnOrderChange,
		onColumnRemove,
	};
}
