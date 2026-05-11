import React, { RefObject, useCallback, useMemo, useRef } from 'react';
import { themeColors } from 'constants/theme';
import { generateColor } from 'lib/uPlotLib/utils/generateColor';
import { FlamegraphSpan } from 'types/api/trace/getTraceFlamegraph';

import { ConnectorLine } from '../computeVisualLayout';
import { EventRect, SpanRect } from '../types';
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
	connectors: ConnectorLine[];
	viewStartTs: number;
	viewEndTs: number;
	scrollTop: number;
	rowHeight: number;
	selectedSpanId: string | undefined;
	hoveredSpanId: string;
	isDarkMode: boolean;
	spanRectsRef?: React.MutableRefObject<SpanRect[]>;
	eventRectsRef?: React.MutableRefObject<EventRect[]>;
	hoveredEventKey?: string | null;
	filteredSpanIds?: string[];
	isFilterActive?: boolean;
}

interface UseFlamegraphDrawResult {
	drawFlamegraph: () => void;
	spanRectsRef: RefObject<SpanRect[]>;
	eventRectsRef: RefObject<EventRect[]>;
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
	eventRectsArray: EventRect[];
	metrics: FlamegraphRowMetrics;
	hoveredEventKey?: string | null;
	filteredSpanIdsSet?: Set<string> | null;
	isFilterActive?: boolean;
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
		eventRectsArray,
		metrics,
		hoveredEventKey,
		filteredSpanIdsSet,
		isFilterActive: isFilterActiveInLevel,
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

		const isDimmedByFilter =
			!!isFilterActiveInLevel &&
			!!filteredSpanIdsSet &&
			!filteredSpanIdsSet.has(span.spanId);

		drawSpanBar({
			ctx,
			span,
			x: Math.max(0, leftOffset),
			y,
			width,
			levelIndex,
			spanRectsArray,
			eventRectsArray,
			color,
			isDarkMode,
			metrics,
			selectedSpanId,
			hoveredSpanId,
			hoveredEventKey,
			isDimmedByFilter,
		});
	}
}

interface DrawConnectorLinesArgs {
	ctx: CanvasRenderingContext2D;
	connectors: ConnectorLine[];
	scrollTop: number;
	viewStartTs: number;
	timeSpan: number;
	cssWidth: number;
	viewportHeight: number;
	metrics: FlamegraphRowMetrics;
}

function drawConnectorLines(args: DrawConnectorLinesArgs): void {
	const {
		ctx,
		connectors,
		scrollTop,
		viewStartTs,
		timeSpan,
		cssWidth,
		viewportHeight,
		metrics,
	} = args;

	ctx.save();
	ctx.lineWidth = 1;
	ctx.globalAlpha = 0.6;

	for (const conn of connectors) {
		const xFrac = (conn.timestampMs - viewStartTs) / timeSpan;
		if (xFrac < -0.01 || xFrac > 1.01) {
			continue;
		}

		const parentY =
			conn.parentRow * metrics.ROW_HEIGHT -
			scrollTop +
			metrics.SPAN_BAR_Y_OFFSET +
			metrics.SPAN_BAR_HEIGHT;
		const childY =
			conn.childRow * metrics.ROW_HEIGHT - scrollTop + metrics.SPAN_BAR_Y_OFFSET;

		// Skip if entirely outside viewport
		if (parentY > viewportHeight || childY < 0) {
			continue;
		}

		const color = generateColor(
			conn.serviceName,
			themeColors.traceDetailColorsV3,
		);
		ctx.strokeStyle = color;

		const x = clamp(xFrac * cssWidth, 0, cssWidth);
		ctx.beginPath();
		ctx.moveTo(x, parentY);
		ctx.lineTo(x, childY);
		ctx.stroke();
	}

	ctx.restore();
}

export function useFlamegraphDraw(
	args: UseFlamegraphDrawArgs,
): UseFlamegraphDrawResult {
	const {
		canvasRef,
		containerRef,
		spans,
		connectors,
		viewStartTs,
		viewEndTs,
		scrollTop,
		rowHeight,
		selectedSpanId,
		hoveredSpanId,
		isDarkMode,
		spanRectsRef: spanRectsRefProp,
		eventRectsRef: eventRectsRefProp,
		hoveredEventKey,
		filteredSpanIds,
		isFilterActive,
	} = args;

	const spanRectsRefInternal = useRef<SpanRect[]>([]);
	const spanRectsRef = spanRectsRefProp ?? spanRectsRefInternal;
	const eventRectsRefInternal = useRef<EventRect[]>([]);
	const eventRectsRef = eventRectsRefProp ?? eventRectsRefInternal;

	const filteredSpanIdsSet = useMemo(
		() =>
			isFilterActive && filteredSpanIds && filteredSpanIds.length > 0
				? new Set(filteredSpanIds)
				: null,
		[filteredSpanIds, isFilterActive],
	);

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

		// ---- Draw connector lines (behind span bars) ----
		drawConnectorLines({
			ctx,
			connectors,
			scrollTop,
			viewStartTs,
			timeSpan,
			cssWidth,
			viewportHeight,
			metrics,
		});

		const spanRectsArray: SpanRect[] = [];
		const eventRectsArray: EventRect[] = [];
		const currentHoveredEventKey = hoveredEventKey ?? null;

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
				eventRectsArray,
				metrics,
				hoveredEventKey: currentHoveredEventKey,
				filteredSpanIdsSet,
				isFilterActive,
			});
		}

		spanRectsRef.current = spanRectsArray;
		eventRectsRef.current = eventRectsArray;
	}, [
		canvasRef,
		containerRef,
		spanRectsRef,
		eventRectsRef,
		spans,
		connectors,
		viewStartTs,
		viewEndTs,
		scrollTop,
		rowHeight,
		selectedSpanId,
		hoveredSpanId,
		hoveredEventKey,
		isDarkMode,
		filteredSpanIdsSet,
		isFilterActive,
	]);

	return { drawFlamegraph, spanRectsRef, eventRectsRef };
}
