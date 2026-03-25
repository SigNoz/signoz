import { useCallback, useEffect, useMemo, useState } from 'react';
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

	const [orderedColumns, setOrderedColumns] = useState<OrderedColumn[]>(
		baseColumns,
	);
	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: { distance: 4 },
		}),
	);

	useEffect(() => {
		setOrderedColumns((previousColumns) => {
			const previousIds = previousColumns.map((column) => getColumnId(column));
			const baseIds = baseColumns.map((column) => getColumnId(column));

			// Same columns, different order: `baseColumns` reflects persisted / URL order
			// after navigation. The merge path below would keep the stale in-memory order.
			if (
				previousIds.length === baseIds.length &&
				[...previousIds].sort().join('|') === [...baseIds].sort().join('|') &&
				previousIds.join('|') !== baseIds.join('|')
			) {
				return baseColumns;
			}

			const baseColumnsById = new Map(
				baseColumns.map((column) => [getColumnId(column), column] as const),
			);
			const previousIdsSet = new Set(previousIds);
			const orderedFromPrevious = previousColumns
				.map((column) => baseColumnsById.get(getColumnId(column)))
				.filter(Boolean) as OrderedColumn[];
			const appendedNewColumns = baseColumns.filter(
				(column) => !previousIdsSet.has(getColumnId(column)),
			);
			const nextColumns = [...orderedFromPrevious, ...appendedNewColumns];

			if (nextColumns.length !== previousColumns.length) {
				return nextColumns;
			}

			const hasReferenceChange = nextColumns.some(
				(column, index) => column !== previousColumns[index],
			);

			return hasReferenceChange ? nextColumns : previousColumns;
		});
	}, [baseColumns]);

	const handleDragEnd = useCallback(
		(event: DragEndEvent): void => {
			const { active, over } = event;
			if (!over || active.id === over.id) {
				return;
			}

			setOrderedColumns((previousColumns) => {
				const oldIndex = previousColumns.findIndex(
					(column) => getColumnId(column) === String(active.id),
				);
				const newIndex = previousColumns.findIndex(
					(column) => getColumnId(column) === String(over.id),
				);
				if (oldIndex === -1 || newIndex === -1) {
					return previousColumns;
				}

				const nextColumns = arrayMove(previousColumns, oldIndex, newIndex);
				onColumnOrderChange(nextColumns as unknown[]);

				return nextColumns;
			});
		},
		[onColumnOrderChange],
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

	return {
		orderedColumns,
		orderedColumnIds,
		hasSingleColumn,
		handleDragEnd,
		sensors,
	};
};
