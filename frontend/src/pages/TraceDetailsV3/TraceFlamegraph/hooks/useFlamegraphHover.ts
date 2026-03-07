import {
	Dispatch,
	MouseEvent as ReactMouseEvent,
	MutableRefObject,
	RefObject,
	SetStateAction,
	useCallback,
	useState,
} from 'react';
import { FlamegraphSpan } from 'types/api/trace/getTraceFlamegraph';

import { SpanRect } from '../types';
import { ITraceMetadata } from '../types';
import { getSpanColor } from '../utils';

function getCanvasPointer(
	canvas: HTMLCanvasElement,
	clientX: number,
	clientY: number,
): { cssX: number; cssY: number } | null {
	const rect = canvas.getBoundingClientRect();
	const dpr = window.devicePixelRatio || 1;
	const cssWidth = canvas.width / dpr;
	const cssHeight = canvas.height / dpr;
	const cssX = (clientX - rect.left) * (cssWidth / rect.width);
	const cssY = (clientY - rect.top) * (cssHeight / rect.height);
	return { cssX, cssY };
}

function findSpanAtPosition(
	cssX: number,
	cssY: number,
	spanRects: SpanRect[],
): FlamegraphSpan | null {
	for (let i = spanRects.length - 1; i >= 0; i--) {
		const r = spanRects[i];
		if (
			cssX >= r.x &&
			cssX <= r.x + r.width &&
			cssY >= r.y &&
			cssY <= r.y + r.height
		) {
			return r.span;
		}
	}
	return null;
}

export interface TooltipContent {
	spanName: string;
	status: 'ok' | 'warning' | 'error';
	startMs: number;
	durationMs: number;
	clientX: number;
	clientY: number;
	spanColor: string;
}

interface UseFlamegraphHoverArgs {
	canvasRef: RefObject<HTMLCanvasElement>;
	spanRectsRef: MutableRefObject<SpanRect[]>;
	traceMetadata: ITraceMetadata;
	viewStartTs: number;
	viewEndTs: number;
	isDraggingRef: MutableRefObject<boolean>;
	suppressClickRef: MutableRefObject<boolean>;
	onSpanClick: (spanId: string) => void;
	isDarkMode: boolean;
}

interface UseFlamegraphHoverResult {
	hoveredSpanId: string | null;
	setHoveredSpanId: Dispatch<SetStateAction<string | null>>;
	handleHoverMouseMove: (e: ReactMouseEvent) => void;
	handleHoverMouseLeave: () => void;
	handleClick: (e: ReactMouseEvent) => void;
	tooltipContent: TooltipContent | null;
}

export function useFlamegraphHover(
	args: UseFlamegraphHoverArgs,
): UseFlamegraphHoverResult {
	const {
		canvasRef,
		spanRectsRef,
		traceMetadata,
		viewStartTs,
		viewEndTs,
		isDraggingRef,
		suppressClickRef,
		onSpanClick,
		isDarkMode,
	} = args;

	const [hoveredSpanId, setHoveredSpanId] = useState<string | null>(null);
	const [tooltipContent, setTooltipContent] = useState<TooltipContent | null>(
		null,
	);

	const isZoomed =
		viewStartTs !== traceMetadata.startTime ||
		viewEndTs !== traceMetadata.endTime;

	const updateCursor = useCallback(
		(canvas: HTMLCanvasElement, span: FlamegraphSpan | null): void => {
			if (span) {
				canvas.style.cursor = 'pointer';
			} else if (isZoomed) {
				canvas.style.cursor = 'grab';
			} else {
				canvas.style.cursor = 'default';
			}
		},
		[isZoomed],
	);

	const handleHoverMouseMove = useCallback(
		(e: ReactMouseEvent): void => {
			if (isDraggingRef.current) {
				return;
			}

			const canvas = canvasRef.current;
			if (!canvas) {
				return;
			}

			const pointer = getCanvasPointer(canvas, e.clientX, e.clientY);
			if (!pointer) {
				return;
			}

			const span = findSpanAtPosition(
				pointer.cssX,
				pointer.cssY,
				spanRectsRef.current,
			);

			if (span) {
				setHoveredSpanId(span.spanId);
				setTooltipContent({
					spanName: span.name || 'unknown',
					status: span.hasError ? 'error' : 'ok',
					startMs: span.timestamp - traceMetadata.startTime,
					durationMs: span.durationNano / 1e6,
					clientX: e.clientX,
					clientY: e.clientY,
					spanColor: getSpanColor({ span, isDarkMode }),
				});
				updateCursor(canvas, span);
			} else {
				setHoveredSpanId(null);
				setTooltipContent(null);
				updateCursor(canvas, null);
			}
		},
		[
			canvasRef,
			spanRectsRef,
			traceMetadata.startTime,
			isDraggingRef,
			updateCursor,
			isDarkMode,
		],
	);

	const handleHoverMouseLeave = useCallback((): void => {
		setHoveredSpanId(null);
		setTooltipContent(null);

		const canvas = canvasRef.current;
		if (canvas) {
			updateCursor(canvas, null);
		}
	}, [canvasRef, updateCursor]);

	const handleClick = useCallback(
		(e: ReactMouseEvent): void => {
			if (suppressClickRef.current) {
				return;
			}

			const canvas = canvasRef.current;
			if (!canvas) {
				return;
			}

			const pointer = getCanvasPointer(canvas, e.clientX, e.clientY);
			if (!pointer) {
				return;
			}

			const span = findSpanAtPosition(
				pointer.cssX,
				pointer.cssY,
				spanRectsRef.current,
			);

			if (span) {
				onSpanClick(span.spanId);
			}
		},
		[canvasRef, spanRectsRef, suppressClickRef, onSpanClick],
	);

	return {
		hoveredSpanId,
		setHoveredSpanId,
		handleHoverMouseMove,
		handleHoverMouseLeave,
		handleClick,
		tooltipContent,
	};
}
