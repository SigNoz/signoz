import Color from 'color';
import { themeColors } from 'constants/theme';
import { generateColor } from 'lib/uPlotLib/utils/generateColor';
import { FlamegraphSpan } from 'types/api/trace/getTraceFlamegraph';

import {
	EVENT_DOT_SIZE,
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
	ctx.roundRect(x, spanY, width, SPAN_BAR_HEIGHT, 6);
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
}
