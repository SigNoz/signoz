import { DragSourceMonitor, DropTargetMonitor } from 'react-dnd';

export function dropHandler(
	monitor: DropTargetMonitor,
	index: number,
): { isOver: boolean } | Record<string, unknown> {
	const { index: draggedId }: never = monitor.getItem();

	if (draggedId === index) {
		return {};
	}
	return {
		isOver: monitor.isOver(),
	};
}

export function dragHandler(
	monitor: DragSourceMonitor,
): { isDragging: boolean } {
	return {
		isDragging: monitor.isDragging(),
	};
}
