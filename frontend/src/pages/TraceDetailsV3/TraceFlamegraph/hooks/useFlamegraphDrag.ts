import {
	Dispatch,
	MouseEvent as ReactMouseEvent,
	MutableRefObject,
	RefObject,
	SetStateAction,
	useCallback,
	useRef,
} from 'react';

import { ITraceMetadata } from '../types';
import { clamp } from '../utils';

interface UseFlamegraphDragArgs {
	canvasRef: RefObject<HTMLCanvasElement>;
	containerRef: RefObject<HTMLDivElement>;
	traceMetadata: ITraceMetadata;
	viewStartRef: MutableRefObject<number>;
	viewEndRef: MutableRefObject<number>;
	setViewStartTs: Dispatch<SetStateAction<number>>;
	setViewEndTs: Dispatch<SetStateAction<number>>;
	scrollTopRef: MutableRefObject<number>;
	setScrollTop: Dispatch<SetStateAction<number>>;
	totalHeight: number;
}

interface UseFlamegraphDragResult {
	handleMouseDown: (e: ReactMouseEvent) => void;
	handleMouseMove: (e: ReactMouseEvent) => void;
	handleMouseUp: () => void;
	handleDragMouseLeave: () => void;
	isDraggingRef: MutableRefObject<boolean>;
}

export function useFlamegraphDrag(
	args: UseFlamegraphDragArgs,
): UseFlamegraphDragResult {
	const {
		canvasRef,
		containerRef,
		traceMetadata,
		viewStartRef,
		viewEndRef,
		setViewStartTs,
		setViewEndTs,
		scrollTopRef,
		setScrollTop,
		totalHeight,
	} = args;

	const isDraggingRef = useRef(false);
	const dragStartRef = useRef<{ x: number; y: number } | null>(null);
	const dragDistanceRef = useRef(0);

	const clampScrollTop = useCallback(
		(next: number): number => {
			const container = containerRef.current;
			if (!container) {
				return 0;
			}
			const viewportHeight = container.clientHeight;
			const maxScroll = Math.max(0, totalHeight - viewportHeight);
			return clamp(next, 0, maxScroll);
		},
		[containerRef, totalHeight],
	);

	const handleMouseDown = useCallback(
		(event: ReactMouseEvent): void => {
			if (event.button !== 0) {
				return;
			}
			event.preventDefault();

			isDraggingRef.current = true;
			dragStartRef.current = { x: event.clientX, y: event.clientY };
			dragDistanceRef.current = 0;

			const canvas = canvasRef.current;
			if (canvas) {
				canvas.style.cursor = 'grabbing';
			}
		},
		[canvasRef],
	);

	const handleMouseMove = useCallback(
		(event: ReactMouseEvent): void => {
			if (!isDraggingRef.current || !dragStartRef.current) {
				return;
			}

			const canvas = canvasRef.current;
			if (!canvas) {
				return;
			}

			const rect = canvas.getBoundingClientRect();
			const deltaX = event.clientX - dragStartRef.current.x;
			const deltaY = event.clientY - dragStartRef.current.y;

			dragDistanceRef.current = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

			// --- Horizontal pan ---
			const timeSpan = viewEndRef.current - viewStartRef.current;
			const deltaTime = (deltaX / rect.width) * timeSpan;

			const newStart = viewStartRef.current - deltaTime;
			const clampedStart = clamp(
				newStart,
				traceMetadata.startTime,
				traceMetadata.endTime - timeSpan,
			);
			const clampedEnd = clampedStart + timeSpan;

			viewStartRef.current = clampedStart;
			viewEndRef.current = clampedEnd;
			setViewStartTs(clampedStart);
			setViewEndTs(clampedEnd);

			// --- Vertical scroll pan ---
			const nextScrollTop = clampScrollTop(scrollTopRef.current - deltaY);
			scrollTopRef.current = nextScrollTop;
			setScrollTop(nextScrollTop);

			dragStartRef.current = { x: event.clientX, y: event.clientY };
		},
		[
			canvasRef,
			traceMetadata,
			viewStartRef,
			viewEndRef,
			setViewStartTs,
			setViewEndTs,
			scrollTopRef,
			setScrollTop,
			clampScrollTop,
		],
	);

	const handleMouseUp = useCallback((): void => {
		isDraggingRef.current = false;
		dragStartRef.current = null;
		dragDistanceRef.current = 0;

		const canvas = canvasRef.current;
		if (canvas) {
			canvas.style.cursor = 'grab';
		}
	}, [canvasRef]);

	// const handleDragMouseLeave = useCallback((): void => {
	// 	isDraggingRef.current = false;
	// 	dragStartRef.current = null;
	// 	dragDistanceRef.current = 0;

	// 	const canvas = canvasRef.current;
	// 	if (canvas) {
	// 		canvas.style.cursor = 'grab';
	// 	}
	// }, [canvasRef]);

	return {
		handleMouseDown,
		handleMouseMove,
		handleMouseUp,
		handleDragMouseLeave: handleMouseUp, // Same logic for mouse up and leaving the canvas
		isDraggingRef,
	};
}
