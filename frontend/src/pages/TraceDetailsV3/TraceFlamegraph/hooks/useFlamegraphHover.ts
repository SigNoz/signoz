import {
	Dispatch,
	MouseEvent as ReactMouseEvent,
	MutableRefObject,
	RefObject,
	SetStateAction,
	useCallback,
	useRef,
	useState,
} from 'react';
import { useTraceContext } from 'pages/TraceDetailsV3/contexts/TraceContext';
import { RESERVED_PREVIEW_KEYS } from 'pages/TraceDetailsV3/SpanHoverCard/SpanHoverCard';
import { getSpanAttribute } from 'pages/TraceDetailsV3/utils';
import { FlamegraphSpan } from 'types/api/trace/getTraceFlamegraph';

import { EventRect, SpanRect } from '../types';
import { ITraceMetadata } from '../types';
import {
	getFlamegraphServiceName,
	getFlamegraphSpanGroupValue,
	getSpanColor,
} from '../utils';

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

function findEventAtPosition(
	cssX: number,
	cssY: number,
	eventRects: EventRect[],
): EventRect | null {
	for (let i = eventRects.length - 1; i >= 0; i--) {
		const r = eventRects[i];
		// Manhattan distance check for diamond shape with padding
		if (Math.abs(r.cx - cssX) + Math.abs(r.cy - cssY) <= r.halfSize * 1.5) {
			return r;
		}
	}
	return null;
}

export interface EventTooltipData {
	name: string;
	timeOffsetMs: number;
	isError: boolean;
	attributeMap: Record<string, string>;
}

export interface SpanPreviewRowData {
	key: string;
	value: string;
}

export interface TooltipContent {
	serviceName: string;
	spanName: string;
	status: 'ok' | 'warning' | 'error';
	startMs: number;
	durationMs: number;
	clientX: number;
	clientY: number;
	spanColor: string;
	previewRows?: SpanPreviewRowData[];
	event?: EventTooltipData;
}

interface UseFlamegraphHoverArgs {
	canvasRef: RefObject<HTMLCanvasElement>;
	spanRectsRef: MutableRefObject<SpanRect[]>;
	eventRectsRef: MutableRefObject<EventRect[]>;
	traceMetadata: ITraceMetadata;
	viewStartTs: number;
	viewEndTs: number;
	isDraggingRef: MutableRefObject<boolean>;
	onSpanClick: (spanId: string) => void;
	isDarkMode: boolean;
}

interface UseFlamegraphHoverResult {
	hoveredSpanId: string | null;
	setHoveredSpanId: Dispatch<SetStateAction<string | null>>;
	hoveredEventKey: string | null;
	handleHoverMouseMove: (e: ReactMouseEvent) => void;
	handleHoverMouseLeave: () => void;
	handleMouseDownForClick: (e: ReactMouseEvent) => void;
	handleClick: (e: ReactMouseEvent) => void;
	tooltipContent: TooltipContent | null;
}

export function useFlamegraphHover(
	args: UseFlamegraphHoverArgs,
): UseFlamegraphHoverResult {
	const {
		canvasRef,
		spanRectsRef,
		eventRectsRef,
		traceMetadata,
		viewStartTs,
		viewEndTs,
		isDraggingRef,
		onSpanClick,
		isDarkMode,
	} = args;

	const [hoveredSpanId, setHoveredSpanId] = useState<string | null>(null);
	const [hoveredEventKey, setHoveredEventKey] = useState<string | null>(null);
	const [tooltipContent, setTooltipContent] = useState<TooltipContent | null>(
		null,
	);

	const { colorByField, previewFields } = useTraceContext();

	const buildPreviewRows = useCallback(
		(span: FlamegraphSpan): SpanPreviewRowData[] =>
			previewFields
				.filter((field) => !RESERVED_PREVIEW_KEYS.has(field.key))
				.map((field) => {
					const value = getSpanAttribute(
						{ resource: span.resource, attributes: span.attributes },
						field.key,
					);
					return value !== undefined && value !== ''
						? { key: field.key, value: String(value) }
						: null;
				})
				.filter((r): r is SpanPreviewRowData => r !== null),
		[previewFields],
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

			// Check event dots first — they're drawn on top of spans
			const eventRect = findEventAtPosition(
				pointer.cssX,
				pointer.cssY,
				eventRectsRef.current,
			);

			if (eventRect) {
				const { event, span } = eventRect;
				const eventTimeMs = event.timeUnixNano / 1e6;
				setHoveredEventKey(`${span.spanId}-${event.name}-${event.timeUnixNano}`);
				setHoveredSpanId(span.spanId);
				setTooltipContent({
					serviceName: getFlamegraphServiceName(span),
					spanName: span.name || 'unknown',
					status: span.hasError ? 'error' : 'ok',
					startMs: span.timestamp - traceMetadata.startTime,
					durationMs: span.durationNano / 1e6,
					clientX: e.clientX,
					clientY: e.clientY,
					spanColor: getSpanColor({
						span,
						isDarkMode,
						groupValue: getFlamegraphSpanGroupValue(span, colorByField),
					}),
					event: {
						name: event.name,
						timeOffsetMs: eventTimeMs - span.timestamp,
						isError: event.isError,
						attributeMap: event.attributeMap || {},
					},
				});
				updateCursor(canvas, eventRect.span);
				return;
			}

			const span = findSpanAtPosition(
				pointer.cssX,
				pointer.cssY,
				spanRectsRef.current,
			);

			if (span) {
				setHoveredEventKey(null);
				setHoveredSpanId(span.spanId);
				setTooltipContent({
					serviceName: getFlamegraphServiceName(span),
					spanName: span.name || 'unknown',
					status: span.hasError ? 'error' : 'ok',
					startMs: span.timestamp - traceMetadata.startTime,
					durationMs: span.durationNano / 1e6,
					clientX: e.clientX,
					clientY: e.clientY,
					spanColor: getSpanColor({
						span,
						isDarkMode,
						groupValue: getFlamegraphSpanGroupValue(span, colorByField),
					}),
					previewRows: buildPreviewRows(span),
				});
				updateCursor(canvas, span);
			} else {
				setHoveredEventKey(null);
				setHoveredSpanId(null);
				setTooltipContent(null);
				updateCursor(canvas, null);
			}
		},
		[
			canvasRef,
			spanRectsRef,
			eventRectsRef,
			traceMetadata.startTime,
			isDraggingRef,
			updateCursor,
			isDarkMode,
			colorByField,
			buildPreviewRows,
		],
	);

	const handleHoverMouseLeave = useCallback((): void => {
		setHoveredEventKey(null);
		setHoveredSpanId(null);
		setTooltipContent(null);

		const canvas = canvasRef.current;
		if (canvas) {
			updateCursor(canvas, null);
		}
	}, [canvasRef, updateCursor]);

	const mouseDownPosRef = useRef<{ x: number; y: number } | null>(null);
	const CLICK_THRESHOLD = 5;

	const handleMouseDownForClick = useCallback((e: ReactMouseEvent): void => {
		mouseDownPosRef.current = { x: e.clientX, y: e.clientY };
	}, []);

	const handleClick = useCallback(
		(e: ReactMouseEvent): void => {
			// Detect drag: if mouse moved more than threshold, skip click
			if (mouseDownPosRef.current) {
				const dx = e.clientX - mouseDownPosRef.current.x;
				const dy = e.clientY - mouseDownPosRef.current.y;
				if (Math.sqrt(dx * dx + dy * dy) > CLICK_THRESHOLD) {
					mouseDownPosRef.current = null;
					return;
				}
			}
			mouseDownPosRef.current = null;

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
		[canvasRef, spanRectsRef, onSpanClick],
	);

	return {
		hoveredSpanId,
		setHoveredSpanId,
		hoveredEventKey,
		handleHoverMouseMove,
		handleHoverMouseLeave,
		handleMouseDownForClick,
		handleClick,
		tooltipContent,
	};
}
