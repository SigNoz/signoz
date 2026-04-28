import { useCallback, useMemo } from 'react';
import {
	DragEndEvent,
	PointerSensor,
	useSensor,
	useSensors,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';

import { TableColumnDef } from './types';

export interface UseColumnDndOptions<TData> {
	columns: TableColumnDef<TData>[];
	onColumnOrderChange: (columns: TableColumnDef<TData>[]) => void;
}

export interface UseColumnDndResult {
	sensors: ReturnType<typeof useSensors>;
	columnIds: string[];
	handleDragEnd: (event: DragEndEvent) => void;
}

/**
 * Sets up drag-and-drop for column reordering.
 */
export function useColumnDnd<TData>({
	columns,
	onColumnOrderChange,
}: UseColumnDndOptions<TData>): UseColumnDndResult {
	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
	);

	const columnIds = useMemo(() => columns.map((c) => c.id), [columns]);

	const handleDragEnd = useCallback(
		(event: DragEndEvent): void => {
			const { active, over } = event;
			if (!over || active.id === over.id) {
				return;
			}
			const activeCol = columns.find((c) => c.id === String(active.id));
			const overCol = columns.find((c) => c.id === String(over.id));
			if (
				!activeCol ||
				!overCol ||
				activeCol.pin != null ||
				overCol.pin != null ||
				activeCol.enableMove === false
			) {
				return;
			}
			const oldIndex = columns.findIndex((c) => c.id === String(active.id));
			const newIndex = columns.findIndex((c) => c.id === String(over.id));
			if (oldIndex === -1 || newIndex === -1) {
				return;
			}
			onColumnOrderChange(arrayMove(columns, oldIndex, newIndex));
		},
		[columns, onColumnOrderChange],
	);

	return { sensors, columnIds, handleDragEnd };
}
