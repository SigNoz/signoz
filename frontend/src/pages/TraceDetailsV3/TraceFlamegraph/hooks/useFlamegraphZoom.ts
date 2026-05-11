import {
	Dispatch,
	MutableRefObject,
	RefObject,
	SetStateAction,
	useCallback,
	useEffect,
	useRef,
} from 'react';

import {
	DEFAULT_ROW_HEIGHT,
	MAX_ROW_HEIGHT,
	MIN_ROW_HEIGHT,
	MIN_VISIBLE_SPAN_MS,
	PINCH_ZOOM_INTENSITY_H,
	PINCH_ZOOM_INTENSITY_V,
	SCROLL_ZOOM_INTENSITY_H,
	SCROLL_ZOOM_INTENSITY_V,
} from '../constants';
import { ITraceMetadata } from '../types';
import { clamp } from '../utils';

interface UseFlamegraphZoomArgs {
	canvasRef: RefObject<HTMLCanvasElement>;
	traceMetadata: ITraceMetadata;
	viewStartRef: MutableRefObject<number>;
	viewEndRef: MutableRefObject<number>;
	rowHeightRef: MutableRefObject<number>;
	setViewStartTs: Dispatch<SetStateAction<number>>;
	setViewEndTs: Dispatch<SetStateAction<number>>;
	setRowHeight: Dispatch<SetStateAction<number>>;
}

interface UseFlamegraphZoomResult {
	handleResetZoom: () => void;
	isOverFlamegraphRef: MutableRefObject<boolean>;
}

function getCanvasPointer(
	canvasRef: RefObject<HTMLCanvasElement>,
	clientX: number,
): { cssX: number; cssWidth: number } | null {
	const canvas = canvasRef.current;
	if (!canvas) {
		return null;
	}

	const rect = canvas.getBoundingClientRect();
	const dpr = window.devicePixelRatio || 1;
	const cssWidth = canvas.width / dpr;
	const cssX = (clientX - rect.left) * (cssWidth / rect.width);

	return { cssX, cssWidth };
}

export function useFlamegraphZoom(
	args: UseFlamegraphZoomArgs,
): UseFlamegraphZoomResult {
	const {
		canvasRef,
		traceMetadata,
		viewStartRef,
		viewEndRef,
		rowHeightRef,
		setViewStartTs,
		setViewEndTs,
		setRowHeight,
	} = args;

	const isOverFlamegraphRef = useRef(false);
	const wheelDeltaRef = useRef(0);
	const rafRef = useRef<number | null>(null);
	const lastCursorXRef = useRef(0);
	const lastCssWidthRef = useRef(1);
	const lastIsPinchRef = useRef(false);
	const lastWheelClientXRef = useRef<number | null>(null);

	// Prevent browser zoom when pinching over the flamegraph
	useEffect(() => {
		const onWheel = (e: WheelEvent): void => {
			if (isOverFlamegraphRef.current && e.ctrlKey) {
				e.preventDefault();
			}
		};

		window.addEventListener('wheel', onWheel, { passive: false, capture: true });

		return (): void => {
			window.removeEventListener('wheel', onWheel, {
				capture: true,
			} as EventListenerOptions);
		};
	}, []);

	const applyWheelZoom = useCallback(() => {
		rafRef.current = null;

		const cssWidth = lastCssWidthRef.current || 1;
		const cursorX = lastCursorXRef.current;
		const fullSpanMs = traceMetadata.endTime - traceMetadata.startTime;

		const oldStart = viewStartRef.current;
		const oldEnd = viewEndRef.current;
		const oldSpan = oldEnd - oldStart;

		const deltaY = wheelDeltaRef.current;
		wheelDeltaRef.current = 0;
		if (deltaY === 0) {
			return;
		}

		const zoomH = lastIsPinchRef.current
			? PINCH_ZOOM_INTENSITY_H
			: SCROLL_ZOOM_INTENSITY_H;
		const zoomV = lastIsPinchRef.current
			? PINCH_ZOOM_INTENSITY_V
			: SCROLL_ZOOM_INTENSITY_V;

		const factorH = Math.exp(deltaY * zoomH);
		const factorV = Math.exp(deltaY * zoomV);

		// --- Horizontal zoom ---
		const desiredSpan = oldSpan * factorH;
		const minSpanMs = Math.max(
			MIN_VISIBLE_SPAN_MS,
			oldSpan / Math.max(cssWidth, 1),
		);
		const clampedSpan = clamp(desiredSpan, minSpanMs, fullSpanMs);

		const cursorRatio = clamp(cursorX / cssWidth, 0, 1);
		const anchorTs = oldStart + cursorRatio * oldSpan;

		let nextStart = anchorTs - cursorRatio * clampedSpan;
		nextStart = clamp(
			nextStart,
			traceMetadata.startTime,
			traceMetadata.endTime - clampedSpan,
		);
		const nextEnd = nextStart + clampedSpan;

		// --- Vertical zoom (row height) ---
		const desiredRow = rowHeightRef.current * (1 / factorV);
		const nextRow = clamp(desiredRow, MIN_ROW_HEIGHT, MAX_ROW_HEIGHT);

		// Write refs immediately so rapid wheel events read fresh values
		viewStartRef.current = nextStart;
		viewEndRef.current = nextEnd;
		rowHeightRef.current = nextRow;

		setViewStartTs(nextStart);
		setViewEndTs(nextEnd);
		setRowHeight(nextRow);
	}, [
		traceMetadata,
		viewStartRef,
		viewEndRef,
		rowHeightRef,
		setViewStartTs,
		setViewEndTs,
		setRowHeight,
	]);

	// Native wheel listener on the canvas (passive: false for reliable preventDefault)
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) {
			return (): void => {};
		}

		const onWheel = (e: WheelEvent): void => {
			e.preventDefault();

			const pointer = getCanvasPointer(canvasRef, e.clientX);
			if (!pointer) {
				return;
			}

			// Flush accumulated delta if cursor moved significantly
			if (lastWheelClientXRef.current !== null) {
				const moved = Math.abs(e.clientX - lastWheelClientXRef.current);
				if (moved > 6) {
					wheelDeltaRef.current = 0;
				}
			}
			lastWheelClientXRef.current = e.clientX;

			lastIsPinchRef.current = e.ctrlKey;
			lastCssWidthRef.current = pointer.cssWidth;
			lastCursorXRef.current = pointer.cssX;
			wheelDeltaRef.current += e.deltaY;

			if (rafRef.current == null) {
				rafRef.current = requestAnimationFrame(applyWheelZoom);
			}
		};

		canvas.addEventListener('wheel', onWheel, { passive: false });

		return (): void => {
			canvas.removeEventListener('wheel', onWheel);
		};
	}, [canvasRef, applyWheelZoom]);

	const handleResetZoom = useCallback(() => {
		viewStartRef.current = traceMetadata.startTime;
		viewEndRef.current = traceMetadata.endTime;
		rowHeightRef.current = DEFAULT_ROW_HEIGHT;

		setViewStartTs(traceMetadata.startTime);
		setViewEndTs(traceMetadata.endTime);
		setRowHeight(DEFAULT_ROW_HEIGHT);
	}, [
		traceMetadata,
		viewStartRef,
		viewEndRef,
		rowHeightRef,
		setViewStartTs,
		setViewEndTs,
		setRowHeight,
	]);

	return { handleResetZoom, isOverFlamegraphRef };
}
