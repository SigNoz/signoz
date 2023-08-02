import { DragSourceMonitor, DropTargetMonitor } from 'react-dnd';

export function dropHandler(monitor: DropTargetMonitor): { isOver: boolean } {
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
