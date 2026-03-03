import Color from 'color';
import { themeColors } from 'constants/theme';
import { convertTimeToRelevantUnit } from 'container/TraceDetail/utils';
import { generateColor } from 'lib/uPlotLib/utils/generateColor';
import { FlamegraphSpan } from 'types/api/trace/getTraceFlamegraph';

import {
	EVENT_DOT_SIZE,
	LABEL_FONT,
	LABEL_PADDING_X,
	MIN_WIDTH_FOR_DURATION,
	MIN_WIDTH_FOR_NAME,
	SPAN_BAR_HEIGHT,
	SPAN_BAR_Y_OFFSET,
} from './constants';
import { SpanRect } from './types';

export function clamp(v: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, v));
}

interface GetSpanColorArgs {
	span: FlamegraphSpan;
	selectedSpanId: string | undefined;
	hoveredSpanId: string;
	isDarkMode: boolean;
}

export function getSpanColor(args: GetSpanColorArgs): string {
	const { span, selectedSpanId, hoveredSpanId, isDarkMode } = args;
	let color = generateColor(span.serviceName, themeColors.traceDetailColors);

	if (span.hasError) {
		color = isDarkMode ? 'rgb(239, 68, 68)' : 'rgb(220, 38, 38)';
	}

	if (selectedSpanId === span.spanId || hoveredSpanId === span.spanId) {
		const colorObj = Color(color);
		color = isDarkMode ? colorObj.lighten(0.7).hex() : colorObj.darken(0.7).hex();
	}

	return color;
}

interface DrawEventDotArgs {
	ctx: CanvasRenderingContext2D;
	x: number;
	y: number;
	isError: boolean;
	isDarkMode: boolean;
}

export function drawEventDot(args: DrawEventDotArgs): void {
	const { ctx, x, y, isError, isDarkMode } = args;

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
	const half = EVENT_DOT_SIZE / 2;
	ctx.fillRect(-half, -half, EVENT_DOT_SIZE, EVENT_DOT_SIZE);
	ctx.strokeRect(-half, -half, EVENT_DOT_SIZE, EVENT_DOT_SIZE);
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
	} = args;

	const spanY = y + SPAN_BAR_Y_OFFSET;

	ctx.fillStyle = color;
	ctx.beginPath();
	ctx.roundRect(x, spanY, width, SPAN_BAR_HEIGHT, 2);
	ctx.fill();

	spanRectsArray.push({
		span,
		x,
		y: spanY,
		width,
		height: SPAN_BAR_HEIGHT,
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
		const eventY = spanY + SPAN_BAR_HEIGHT / 2;

		drawEventDot({
			ctx,
			x: eventX,
			y: eventY,
			isError: event.isError,
			isDarkMode,
		});
	});

	drawSpanLabel({ ctx, span, x, y: spanY, width, isDarkMode });
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
	isDarkMode: boolean;
}

function drawSpanLabel(args: DrawSpanLabelArgs): void {
	const { ctx, span, x, y, width, isDarkMode } = args;

	if (width < MIN_WIDTH_FOR_DURATION) {
		return;
	}

	const duration = formatDuration(span.durationNano);
	const name = span.name;

	ctx.save();

	// Clip text to span bar bounds
	ctx.beginPath();
	ctx.rect(x, y, width, SPAN_BAR_HEIGHT);
	ctx.clip();

	ctx.font = LABEL_FONT;
	ctx.fillStyle = isDarkMode ? 'rgba(0, 0, 0, 0.9)' : 'rgba(255, 255, 255, 0.9)';
	ctx.textBaseline = 'middle';

	const textY = y + SPAN_BAR_HEIGHT / 2;
	const leftX = x + LABEL_PADDING_X;
	const rightX = x + width - LABEL_PADDING_X;
	const availableWidth = width - LABEL_PADDING_X * 2;

	const durationWidth = ctx.measureText(duration).width;

	if (width >= MIN_WIDTH_FOR_NAME) {
		const minGap = 6;
		const nameSpace = availableWidth - durationWidth - minGap;

		// Duration right-aligned
		ctx.textAlign = 'right';
		ctx.fillText(duration, rightX, textY);

		// Name left-aligned, truncated to fit remaining space
		if (nameSpace > 20) {
			ctx.textAlign = 'left';
			const truncatedName = truncateText(ctx, name, nameSpace);
			ctx.fillText(truncatedName, leftX, textY);
		}
	} else {
		ctx.textAlign = 'right';
		ctx.fillText(duration, rightX, textY);
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
