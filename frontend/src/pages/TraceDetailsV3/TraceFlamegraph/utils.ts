import { themeColors } from 'constants/theme';
import { convertTimeToRelevantUnit } from 'container/TraceDetail/utils';
import { generateColor } from 'lib/uPlotLib/utils/generateColor';
import { FlamegraphSpan } from 'types/api/trace/getTraceFlamegraph';

import {
	DASHED_BORDER_LINE_DASH,
	EVENT_DOT_SIZE_RATIO,
	LABEL_FONT,
	LABEL_PADDING_X,
	MAX_EVENT_DOT_SIZE,
	MAX_SPAN_BAR_HEIGHT,
	MIN_EVENT_DOT_SIZE,
	MIN_SPAN_BAR_HEIGHT,
	MIN_WIDTH_FOR_NAME,
	MIN_WIDTH_FOR_NAME_AND_DURATION,
	SPAN_BAR_HEIGHT_RATIO,
} from './constants';
import { SpanRect } from './types';

export function clamp(v: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, v));
}

export function findSpanById(
	spans: FlamegraphSpan[][],
	spanId: string,
): { span: FlamegraphSpan; levelIndex: number } | null {
	for (let levelIndex = 0; levelIndex < spans.length; levelIndex++) {
		const span = spans[levelIndex]?.find((s) => s.spanId === spanId);
		if (span) {
			return { span, levelIndex };
		}
	}
	return null;
}

export interface FlamegraphRowMetrics {
	ROW_HEIGHT: number;
	SPAN_BAR_HEIGHT: number;
	SPAN_BAR_Y_OFFSET: number;
	EVENT_DOT_SIZE: number;
}

export function getFlamegraphRowMetrics(
	rowHeight: number,
): FlamegraphRowMetrics {
	const spanBarHeight = clamp(
		Math.round(rowHeight * SPAN_BAR_HEIGHT_RATIO),
		MIN_SPAN_BAR_HEIGHT,
		MAX_SPAN_BAR_HEIGHT,
	);
	const spanBarYOffset = Math.floor((rowHeight - spanBarHeight) / 2);
	const eventDotSize = clamp(
		Math.round(spanBarHeight * EVENT_DOT_SIZE_RATIO),
		MIN_EVENT_DOT_SIZE,
		MAX_EVENT_DOT_SIZE,
	);

	return {
		ROW_HEIGHT: rowHeight,
		SPAN_BAR_HEIGHT: spanBarHeight,
		SPAN_BAR_Y_OFFSET: spanBarYOffset,
		EVENT_DOT_SIZE: eventDotSize,
	};
}

interface GetSpanColorArgs {
	span: FlamegraphSpan;
	isDarkMode: boolean;
}

export function getSpanColor(args: GetSpanColorArgs): string {
	const { span, isDarkMode } = args;
	let color = generateColor(span.serviceName, themeColors.chartcolors);

	if (span.hasError) {
		color = isDarkMode ? 'rgb(239, 68, 68)' : 'rgb(220, 38, 38)';
	}

	return color;
}

interface DrawEventDotArgs {
	ctx: CanvasRenderingContext2D;
	x: number;
	y: number;
	isError: boolean;
	isDarkMode: boolean;
	eventDotSize: number;
}

export function drawEventDot(args: DrawEventDotArgs): void {
	const { ctx, x, y, isError, isDarkMode, eventDotSize } = args;

	ctx.save();
	ctx.translate(x, y);
	ctx.rotate(Math.PI / 4);

	if (isError) {
		ctx.fillStyle = isDarkMode ? 'rgb(239, 68, 68)' : 'rgb(220, 38, 38)';
		ctx.strokeStyle = isDarkMode ? 'rgb(185, 28, 28)' : 'rgb(153, 27, 27)';
	} else {
		ctx.fillStyle = isDarkMode ? 'rgb(14, 165, 233)' : 'rgb(6, 182, 212)';
		ctx.strokeStyle = isDarkMode ? 'rgb(2, 132, 199)' : 'rgb(8, 145, 178)';
	}

	ctx.lineWidth = 1;
	const half = eventDotSize / 2;
	ctx.fillRect(-half, -half, eventDotSize, eventDotSize);
	ctx.strokeRect(-half, -half, eventDotSize, eventDotSize);
	ctx.restore();
}

interface DrawSpanBarArgs {
	ctx: CanvasRenderingContext2D;
	span: FlamegraphSpan;
	x: number;
	y: number;
	width: number;
	levelIndex: number;
	spanRectsArray: SpanRect[];
	color: string;
	isDarkMode: boolean;
	metrics: FlamegraphRowMetrics;
	selectedSpanId?: string | null;
	hoveredSpanId?: string | null;
}

export function drawSpanBar(args: DrawSpanBarArgs): void {
	const {
		ctx,
		span,
		x,
		y,
		width,
		levelIndex,
		spanRectsArray,
		color,
		isDarkMode,
		metrics,
		selectedSpanId,
		hoveredSpanId,
	} = args;

	const spanY = y + metrics.SPAN_BAR_Y_OFFSET;
	const isSelected = selectedSpanId === span.spanId;
	const isHovered = hoveredSpanId === span.spanId;
	const isSelectedOrHovered = isSelected || isHovered;

	ctx.beginPath();
	ctx.roundRect(x, spanY, width, metrics.SPAN_BAR_HEIGHT, 2);

	if (isSelectedOrHovered) {
		// Transparent background, border in same color as span
		// Selected: dashed border, 2px; hovered: solid border, 1px
		if (isSelected) {
			ctx.setLineDash(DASHED_BORDER_LINE_DASH);
		}
		ctx.strokeStyle = color;
		ctx.lineWidth = isSelected ? 2 : 1;
		ctx.stroke();
		if (isSelected) {
			ctx.setLineDash([]);
		}
	} else {
		ctx.fillStyle = color;
		ctx.fill();
	}

	spanRectsArray.push({
		span,
		x,
		y: spanY,
		width,
		height: metrics.SPAN_BAR_HEIGHT,
		level: levelIndex,
	});

	span.event?.forEach((event) => {
		const spanDurationMs = span.durationNano / 1e6;
		if (spanDurationMs <= 0) {
			return;
		}

		const eventTimeMs = event.timeUnixNano / 1e6;
		const eventOffsetPercent =
			((eventTimeMs - span.timestamp) / spanDurationMs) * 100;
		const clampedOffset = clamp(eventOffsetPercent, 1, 99);
		const eventX = x + (clampedOffset / 100) * width;
		const eventY = spanY + metrics.SPAN_BAR_HEIGHT / 2;

		drawEventDot({
			ctx,
			x: eventX,
			y: eventY,
			isError: event.isError,
			isDarkMode,
			eventDotSize: metrics.EVENT_DOT_SIZE,
		});
	});

	drawSpanLabel({
		ctx,
		span,
		x,
		y: spanY,
		width,
		color,
		isSelectedOrHovered,
		isDarkMode,
		spanBarHeight: metrics.SPAN_BAR_HEIGHT,
	});
}

export function formatDuration(durationNano: number): string {
	const durationMs = durationNano / 1e6;
	const { time, timeUnitName } = convertTimeToRelevantUnit(durationMs);
	return `${parseFloat(time.toFixed(2))}${timeUnitName}`;
}

interface DrawSpanLabelArgs {
	ctx: CanvasRenderingContext2D;
	span: FlamegraphSpan;
	x: number;
	y: number;
	width: number;
	color: string;
	isSelectedOrHovered: boolean;
	isDarkMode: boolean;
	spanBarHeight: number;
}

function drawSpanLabel(args: DrawSpanLabelArgs): void {
	const {
		ctx,
		span,
		x,
		y,
		width,
		color,
		isSelectedOrHovered,
		isDarkMode,
		spanBarHeight,
	} = args;

	if (width < MIN_WIDTH_FOR_NAME) {
		return;
	}

	const name = span.name;

	ctx.save();

	// Clip text to span bar bounds
	ctx.beginPath();
	ctx.rect(x, y, width, spanBarHeight);
	ctx.clip();

	ctx.font = LABEL_FONT;
	ctx.fillStyle = isSelectedOrHovered
		? color
		: isDarkMode
		? 'rgba(0, 0, 0, 0.9)'
		: 'rgba(255, 255, 255, 0.9)';
	ctx.textBaseline = 'middle';

	const textY = y + spanBarHeight / 2;
	const leftX = x + LABEL_PADDING_X;
	const rightX = x + width - LABEL_PADDING_X;
	const availableWidth = width - LABEL_PADDING_X * 2;

	if (width >= MIN_WIDTH_FOR_NAME_AND_DURATION) {
		const duration = formatDuration(span.durationNano);
		const durationWidth = ctx.measureText(duration).width;
		const minGap = 6;
		const nameSpace = availableWidth - durationWidth - minGap;

		// Duration right-aligned
		ctx.textAlign = 'right';
		ctx.fillText(duration, rightX, textY);

		// Name left-aligned, truncated to fit remaining space
		if (nameSpace > 20) {
			ctx.textAlign = 'left';
			ctx.fillText(truncateText(ctx, name, nameSpace), leftX, textY);
		}
	} else {
		// Name only, truncated to fit
		ctx.textAlign = 'left';
		ctx.fillText(truncateText(ctx, name, availableWidth), leftX, textY);
	}

	ctx.restore();
}

function truncateText(
	ctx: CanvasRenderingContext2D,
	text: string,
	maxWidth: number,
): string {
	const ellipsis = '...';
	const ellipsisWidth = ctx.measureText(ellipsis).width;

	if (ctx.measureText(text).width <= maxWidth) {
		return text;
	}

	let lo = 0;
	let hi = text.length;
	while (lo < hi) {
		const mid = Math.ceil((lo + hi) / 2);
		if (ctx.measureText(text.slice(0, mid)).width + ellipsisWidth <= maxWidth) {
			lo = mid;
		} else {
			hi = mid - 1;
		}
	}

	return lo > 0 ? `${text.slice(0, lo)}${ellipsis}` : ellipsis;
}
