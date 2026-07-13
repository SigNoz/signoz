/* eslint-disable sonarjs/cognitive-complexity */
import { convertTimeToRelevantUnit } from 'container/TraceDetail/utils';
import { getSpanAttribute } from 'pages/TraceDetailsV3/utils';
import {
	ColorPair,
	darkenHex,
	generateColorPair,
	RESERVED_ERROR,
} from 'pages/TraceDetailsV3/utils/generateColorPair';
import { SpantypesFlamegraphSpanDTO as FlamegraphSpan } from 'api/generated/services/sigNoz.schemas';
import { TelemetryFieldKey } from 'types/api/v5/queryRange';

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
import { EventRect, SpanRect } from './types';

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

/**
 * Resolve the displayed service.name for a flamegraph span. Used by tooltips
 * (service identity, independent of the active colour-by field). Reads
 * `resource['service.name']`.
 */
export function getFlamegraphServiceName(
	span: Partial<Pick<FlamegraphSpan, 'resource' | 'attributes'>>,
): string {
	return getSpanAttribute(span, 'service.name') || '';
}

/**
 * Resolve the value used to bucket a flamegraph span by colour for the given
 * field. Prefers `resource[field.name]` (contract from `selectFields`), falling
 * back to `'unknown'`.
 */
export function getFlamegraphSpanGroupValue(
	span: Partial<Pick<FlamegraphSpan, 'resource' | 'attributes'>>,
	field: TelemetryFieldKey,
): string {
	return getSpanAttribute(span, field.name) || 'unknown';
}

interface GetSpanColorArgs {
	span: FlamegraphSpan;
	isDarkMode: boolean;
	groupValue: string;
}

export function getSpanColor(args: GetSpanColorArgs): ColorPair {
	const { span, groupValue } = args;
	if (span.hasError) {
		return { color: RESERVED_ERROR, colorDark: RESERVED_ERROR };
	}
	return generateColorPair(groupValue);
}

export interface EventDotColor {
	fill: string;
	stroke: string;
}

/** Derive event dot colors from parent span color. Error events always use red. */
export function getEventDotColor(
	spanColor: string,
	isError: boolean,
	isDarkMode: boolean,
): EventDotColor {
	if (isError) {
		return {
			fill: RESERVED_ERROR,
			stroke: darkenHex(RESERVED_ERROR, 0.22),
		};
	}

	// Parse the span color (hex or rgb) to darken it for the event dot
	let r: number | undefined;
	let g: number | undefined;
	let b: number | undefined;

	const rgbMatch = spanColor.match(
		/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*[\d.]+)?\s*\)/,
	);
	const hexMatch = spanColor.match(
		/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i,
	);

	if (rgbMatch) {
		r = parseInt(rgbMatch[1], 10);
		g = parseInt(rgbMatch[2], 10);
		b = parseInt(rgbMatch[3], 10);
	} else if (hexMatch) {
		r = parseInt(hexMatch[1], 16);
		g = parseInt(hexMatch[2], 16);
		b = parseInt(hexMatch[3], 16);
	}

	if (r !== undefined && g !== undefined && b !== undefined) {
		// Darken by 20% for fill, 40% for stroke
		const darken = (v: number, factor: number): number =>
			Math.round(v * (1 - factor));
		return {
			fill: `rgb(${darken(r, 0.2)}, ${darken(g, 0.2)}, ${darken(b, 0.2)})`,
			stroke: `rgb(${darken(r, 0.4)}, ${darken(g, 0.4)}, ${darken(b, 0.4)})`,
		};
	}

	// Fallback to original cyan/blue
	return {
		fill: isDarkMode ? 'rgb(14, 165, 233)' : 'rgb(6, 182, 212)',
		stroke: isDarkMode ? 'rgb(2, 132, 199)' : 'rgb(8, 145, 178)',
	};
}

interface DrawEventDotArgs {
	ctx: CanvasRenderingContext2D;
	x: number;
	y: number;
	color: EventDotColor;
	eventDotSize: number;
}

export function drawEventDot(args: DrawEventDotArgs): void {
	const { ctx, x, y, color, eventDotSize } = args;

	ctx.save();
	ctx.translate(x, y);
	ctx.rotate(Math.PI / 4);

	ctx.fillStyle = color.fill;
	ctx.strokeStyle = color.stroke;

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
	eventRectsArray: EventRect[];
	color: string;
	// Darkened variant used as foreground (stroke + label) on light mode
	// hover/selected, where the base color sits against a near-white panel.
	colorDark: string;
	isDarkMode: boolean;
	metrics: FlamegraphRowMetrics;
	selectedSpanId?: string | null;
	hoveredSpanId?: string | null;
	hoveredEventKey?: string | null;
	isDimmedByFilter?: boolean;
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
		eventRectsArray,
		color,
		colorDark,
		isDarkMode,
		metrics,
		selectedSpanId,
		hoveredSpanId,
		hoveredEventKey,
		isDimmedByFilter,
	} = args;

	const spanY = y + metrics.SPAN_BAR_Y_OFFSET;
	const isSelected = selectedSpanId === span.spanId;
	const isHovered = hoveredSpanId === span.spanId;
	const isSelectedOrHovered = isSelected || isHovered;
	const shouldDim = isDimmedByFilter && !isSelectedOrHovered;

	// Dim non-matching spans when filter is active (matches waterfall's .dimmed-span { opacity: 0.4 }).
	// Alpha is applied to bar + events only; label is drawn after restoring alpha to 1
	// so text stays readable against the faded bar.
	if (shouldDim) {
		ctx.globalAlpha = 0.15;
	}

	ctx.beginPath();
	ctx.roundRect(x, spanY, width, metrics.SPAN_BAR_HEIGHT, 2);

	if (isSelectedOrHovered) {
		// Solid fill matching --l2-background token (dark: #16181d, light: #f9f9fb)
		ctx.fillStyle = isDarkMode ? '#16181d' : '#f9f9fb';
		ctx.fill();
		if (isSelected) {
			ctx.setLineDash(DASHED_BORDER_LINE_DASH);
		}
		ctx.strokeStyle = isDarkMode ? color : colorDark;
		ctx.lineWidth = isSelected ? 2 : 1;
		ctx.stroke();
		if (isSelected) {
			ctx.setLineDash([]);
		}
	} else {
		// Light mode uses the darkened variant as fill so bars contrast against
		// the white panel background; dark mode keeps the bright base.
		ctx.fillStyle = isDarkMode ? color : colorDark;
		ctx.fill();
		// Subtle outline to match spec: 1px semi-transparent black border at rest
		ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
		ctx.lineWidth = 1;
		ctx.stroke();
	}

	spanRectsArray.push({
		span,
		x,
		y: spanY,
		width,
		height: metrics.SPAN_BAR_HEIGHT,
		level: levelIndex,
		// Resting group color (selected/hovered bars override the fill, but this
		// still reflects the colour-by grouping — used by the e2e colour-by hook).
		color: isDarkMode ? color : colorDark,
	});

	span.event?.forEach((event) => {
		const spanDurationMs = span.durationNano / 1e6;
		if (spanDurationMs <= 0) {
			return;
		}

		const eventTimeMs = (event.timeUnixNano ?? 0) / 1e6;
		const eventOffsetPercent =
			((eventTimeMs - span.timestamp) / spanDurationMs) * 100;
		const clampedOffset = clamp(eventOffsetPercent, 1, 99);
		const eventX = x + (clampedOffset / 100) * width;
		const eventY = spanY + metrics.SPAN_BAR_HEIGHT / 2;

		// Event dots derive from the effective bar color so they track the
		// light/dark variant the bar is rendered with.
		const parentBarColor = isDarkMode ? color : colorDark;
		const dotColor = getEventDotColor(
			parentBarColor,
			event.isError ?? false,
			isDarkMode,
		);
		const eventKey = `${span.spanId}-${event.name}-${event.timeUnixNano}`;
		const isEventHovered = hoveredEventKey === eventKey;
		const dotSize = isEventHovered
			? Math.round(metrics.EVENT_DOT_SIZE * 1.5)
			: metrics.EVENT_DOT_SIZE;

		drawEventDot({
			ctx,
			x: eventX,
			y: eventY,
			color: dotColor,
			eventDotSize: dotSize,
		});

		eventRectsArray.push({
			event,
			span,
			cx: eventX,
			cy: eventY,
			halfSize: metrics.EVENT_DOT_SIZE / 2,
		});
	});

	// Restore alpha before drawing label so text is legible on dimmed bars
	if (shouldDim) {
		ctx.globalAlpha = 1;
	}

	drawSpanLabel({
		ctx,
		span,
		x,
		y: spanY,
		width,
		color,
		colorDark,
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
	colorDark: string;
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
		colorDark,
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
	const hoverLabelColor = isDarkMode ? color : colorDark;
	ctx.fillStyle = isSelectedOrHovered
		? hoverLabelColor
		: isDarkMode
			? 'rgba(0, 0, 0, 0.7)'
			: 'rgba(255, 255, 255, 0.95)';
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
