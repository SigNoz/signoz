import { useCallback, useMemo } from 'react';
import {
	DragEndEvent,
	PointerSensor,
	useSensor,
	useSensors,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { getDraggedColumns } from 'hooks/useDragColumns/utils';

import { OrderedColumn, TableRecord } from './types';
import { getColumnId } from './utils';

type UseOrderedColumnsProps = {
	columns: unknown[];
	draggedColumns: unknown[];
	onColumnOrderChange: (columns: unknown[]) => void;
};

type UseOrderedColumnsResult = {
	orderedColumns: OrderedColumn[];
	orderedColumnIds: string[];
	hasSingleColumn: boolean;
	handleDragEnd: (event: DragEndEvent) => void;
	sensors: ReturnType<typeof useSensors>;
};

export const useOrderedColumns = ({
	columns,
	draggedColumns,
	onColumnOrderChange,
}: UseOrderedColumnsProps): UseOrderedColumnsResult => {
	const baseColumns = useMemo<OrderedColumn[]>(
		() =>
			getDraggedColumns<TableRecord>(
				columns as never[],
				draggedColumns as never[],
			).filter(
				(column): column is OrderedColumn =>
					typeof column.key === 'string' || typeof column.key === 'number',
			),
		[columns, draggedColumns],
	);

	const orderedColumns = useMemo(() => {
		const stateIndicatorIndex = baseColumns.findIndex(
			(column) => column.key === 'state-indicator',
		);
		if (stateIndicatorIndex <= 0) {
			return baseColumns;
		}
		const pinned = baseColumns[stateIndicatorIndex];
		const rest = baseColumns.filter((_, i) => i !== stateIndicatorIndex);
		return [pinned, ...rest];
	}, [baseColumns]);

	const handleDragEnd = useCallback(
		(event: DragEndEvent): void => {
			const { active, over } = event;
			if (!over || active.id === over.id) {
				return;
			}

			// Don't allow moving the state-indicator column
			if (String(active.id) === 'state-indicator') {
				return;
			}

			const oldIndex = orderedColumns.findIndex(
				(column) => getColumnId(column) === String(active.id),
			);
			const newIndex = orderedColumns.findIndex(
				(column) => getColumnId(column) === String(over.id),
			);
			if (oldIndex === -1 || newIndex === -1) {
				return;
			}

			const nextColumns = arrayMove(orderedColumns, oldIndex, newIndex);
			onColumnOrderChange(nextColumns as unknown[]);
		},
		[onColumnOrderChange, orderedColumns],
	);

	const orderedColumnIds = useMemo(
		() => orderedColumns.map((column) => getColumnId(column)),
		[orderedColumns],
	);
	const hasSingleColumn = useMemo(
		() =>
			orderedColumns.filter((column) => column.key !== 'state-indicator')
				.length === 1,
		[orderedColumns],
	);
	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: { distance: 4 },
		}),
	);

	return {
		orderedColumns,
		orderedColumnIds,
		hasSingleColumn,
		handleDragEnd,
		sensors,
	};
};
