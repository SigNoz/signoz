import React, { RefObject, useCallback, useRef } from 'react';
import { FlamegraphSpan } from 'types/api/trace/getTraceFlamegraph';

import { SpanRect } from '../types';
import {
	clamp,
	drawSpanBar,
	FlamegraphRowMetrics,
	getFlamegraphRowMetrics,
	getSpanColor,
} from '../utils';

interface UseFlamegraphDrawArgs {
	canvasRef: RefObject<HTMLCanvasElement>;
	containerRef: RefObject<HTMLDivElement>;
	spans: FlamegraphSpan[][];
	viewStartTs: number;
	viewEndTs: number;
	scrollTop: number;
	rowHeight: number;
	selectedSpanId: string | undefined;
	hoveredSpanId: string;
	isDarkMode: boolean;
	spanRectsRef?: React.MutableRefObject<SpanRect[]>;
}

interface UseFlamegraphDrawResult {
	drawFlamegraph: () => void;
	spanRectsRef: RefObject<SpanRect[]>;
}

const OVERSCAN_ROWS = 4;

interface DrawLevelArgs {
	ctx: CanvasRenderingContext2D;
	levelSpans: FlamegraphSpan[];
	levelIndex: number;
	y: number;
	viewStartTs: number;
	timeSpan: number;
	cssWidth: number;
	selectedSpanId: string | undefined;
	hoveredSpanId: string;
	isDarkMode: boolean;
	spanRectsArray: SpanRect[];
	metrics: FlamegraphRowMetrics;
}

function drawLevel(args: DrawLevelArgs): void {
	const {
		ctx,
		levelSpans,
		levelIndex,
		y,
		viewStartTs,
		timeSpan,
		cssWidth,
		selectedSpanId,
		hoveredSpanId,
		isDarkMode,
		spanRectsArray,
		metrics,
	} = args;

	const viewEndTs = viewStartTs + timeSpan;

	for (let i = 0; i < levelSpans.length; i++) {
		const span = levelSpans[i];
		const spanStartMs = span.timestamp;
		const spanEndMs = span.timestamp + span.durationNano / 1e6;

		// Time culling -- skip spans entirely outside the visible time window
		if (spanEndMs < viewStartTs || spanStartMs > viewEndTs) {
			continue;
		}

		const leftOffset = ((spanStartMs - viewStartTs) / timeSpan) * cssWidth;
		const rightEdge = ((spanEndMs - viewStartTs) / timeSpan) * cssWidth;
		let width = rightEdge - leftOffset;

		// Clamp to visible x-range
		if (leftOffset < 0) {
			width += leftOffset;
			if (width <= 0) {
				continue;
			}
		}
		if (rightEdge > cssWidth) {
			width = cssWidth - Math.max(0, leftOffset);
			if (width <= 0) {
				continue;
			}
		}

		// Minimum 1px width so tiny spans remain visible
		width = clamp(width, 1, Infinity);

		const color = getSpanColor({ span, isDarkMode });

		drawSpanBar({
			ctx,
			span,
			x: Math.max(0, leftOffset),
			y,
			width,
			levelIndex,
			spanRectsArray,
			color,
			isDarkMode,
			metrics,
			selectedSpanId,
			hoveredSpanId,
		});
	}
}

export function useFlamegraphDraw(
	args: UseFlamegraphDrawArgs,
): UseFlamegraphDrawResult {
	const {
		canvasRef,
		containerRef,
		spans,
		viewStartTs,
		viewEndTs,
		scrollTop,
		rowHeight,
		selectedSpanId,
		hoveredSpanId,
		isDarkMode,
		spanRectsRef: spanRectsRefProp,
	} = args;

	const spanRectsRefInternal = useRef<SpanRect[]>([]);
	const spanRectsRef = spanRectsRefProp ?? spanRectsRefInternal;

	const drawFlamegraph = useCallback(() => {
		const canvas = canvasRef.current;
		const container = containerRef.current;
		if (!canvas || !container) {
			return;
		}

		const ctx = canvas.getContext('2d');
		if (!ctx) {
			return;
		}

		const dpr = window.devicePixelRatio || 1;
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

		const timeSpan = viewEndTs - viewStartTs;
		if (timeSpan <= 0) {
			return;
		}

		const cssWidth = canvas.width / dpr;
		const metrics = getFlamegraphRowMetrics(rowHeight);

		// ---- Vertical clipping window ----
		const viewportHeight = container.clientHeight;

		//starts drawing OVERSCAN_ROWS(4) rows above the visible area.
		const firstLevel = Math.max(
			0,
			Math.floor(scrollTop / metrics.ROW_HEIGHT) - OVERSCAN_ROWS,
		);
		// adds 2*OVERSCAN_ROWS extra rows above and below the visible area.
		const visibleLevelCount =
			Math.ceil(viewportHeight / metrics.ROW_HEIGHT) + 2 * OVERSCAN_ROWS;

		const lastLevel = Math.min(spans.length - 1, firstLevel + visibleLevelCount);

		ctx.clearRect(0, 0, cssWidth, viewportHeight);

		const spanRectsArray: SpanRect[] = [];

		// ---- Draw only visible levels ----
		for (let levelIndex = firstLevel; levelIndex <= lastLevel; levelIndex++) {
			const levelSpans = spans[levelIndex];
			if (!levelSpans) {
				continue;
			}

			drawLevel({
				ctx,
				levelSpans,
				levelIndex,
				y: levelIndex * metrics.ROW_HEIGHT - scrollTop,
				viewStartTs,
				timeSpan,
				cssWidth,
				selectedSpanId,
				hoveredSpanId,
				isDarkMode,
				spanRectsArray,
				metrics,
			});
		}

		spanRectsRef.current = spanRectsArray;
	}, [
		canvasRef,
		containerRef,
		spanRectsRef,
		spans,
		viewStartTs,
		viewEndTs,
		scrollTop,
		rowHeight,
		selectedSpanId,
		hoveredSpanId,
		isDarkMode,
	]);

	// TODO: spanRectsRef is a flat array — hover scans all visible rects O(N).
	// Upgrade to per-level buckets: spanRects[levelIndex] = [...] so hover can
	// compute level from mouseY / ROW_HEIGHT and scan only that row.
	// Further: binary search within a level by x (spans are sorted by start time)
	// to reduce hover cost from O(N) to O(log N).
	return { drawFlamegraph, spanRectsRef };
}
