import { Color } from '@signozhq/design-tokens';
import { themeColors } from 'constants/theme';
import uPlot from 'uplot';

import {
	DistributionPercentile,
	formatPercentileBadge,
	formatPercentileValue,
} from './percentiles';

const MARKER_DASH: [number, number] = [3, 3];
const MARKER_FONT_SIZE_PX = 9;
/** Space between a badge's name and its diamond's edges. */
const MARKER_BADGE_PADDING_PX = 2;
const MARKER_BADGE_GAP_PX = 2;
const MARKER_VALUE_FONT_SIZE_PX = 11;
/** How far from a marker line the cursor still hovers it, in CSS pixels. */
export const MARKER_HIT_PX = 4;
const MARKER_PILL_PADDING_X_PX = 6;
const MARKER_PILL_PADDING_Y_PX = 3;
const MARKER_PILL_RADIUS_PX = 4;
/** Height of the pill's notch pointing up at the line; also its gap from the axis. */
const MARKER_PILL_POINTER_PX = 4;

interface HitRect {
	left: number;
	right: number;
	top: number;
	bottom: number;
}

/** A drawn marker's hover targets, in CSS pixels relative to the plot. */
export interface PercentileMarkerHitArea {
	x: number;
	badges: HitRect[];
}

/**
 * The marker under `(x, y)`: one whose badge it is over, else the line nearest
 * `x` within `tolerance`. `null` when none is.
 */
export function resolveHoveredMarker(
	areas: PercentileMarkerHitArea[],
	x: number,
	y: number,
	tolerance: number,
): number | null {
	const overBadge = areas.findIndex(({ badges }) =>
		badges.some(
			(badge) =>
				x >= badge.left && x <= badge.right && y >= badge.top && y <= badge.bottom,
		),
	);
	if (overBadge !== -1) {
		return overBadge;
	}
	let nearest: number | null = null;
	let nearestDistance = tolerance;
	areas.forEach((area, index) => {
		const distance = Math.abs(area.x - x);
		if (distance <= nearestDistance) {
			nearest = index;
			nearestDistance = distance;
		}
	});
	return nearest;
}

/**
 * Stacks marker badges into rows so none overlap: each goes in the first row whose
 * last badge ends before it starts. Input and output are in the same pixel space.
 */
export function layoutMarkerLabels(
	labels: Array<{ x: number; width: number }>,
	gap: number,
): number[] {
	const rowEnds: number[] = [];
	const order = labels
		.map((label, index) => ({ ...label, index }))
		.sort((a, b) => a.x - b.x);
	const rows = new Array<number>(labels.length).fill(0);

	order.forEach(({ x, width, index }) => {
		let row = rowEnds.findIndex((end) => x >= end + gap);
		if (row === -1) {
			row = rowEnds.length;
			rowEnds.push(0);
		}
		rowEnds[row] = x + width;
		rows[index] = row;
	});

	return rows;
}

/** A square diamond centred on `(x, y)` with half-diagonal `r`, filled then outlined. */
function drawDiamond(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	r: number,
	fill: string,
	stroke: string,
): void {
	ctx.beginPath();
	ctx.moveTo(x, y - r);
	ctx.lineTo(x + r, y);
	ctx.lineTo(x, y + r);
	ctx.lineTo(x - r, y);
	ctx.closePath();
	ctx.fillStyle = fill;
	ctx.fill();
	ctx.strokeStyle = stroke;
	ctx.stroke();
}

/**
 * Dashed lines across the plot with a diamond badge at each end naming the
 * percentile, one per group on the same spot; badges stack into rows so none overlap. The hovered marker is
 * emphasised and shows its value on the x axis. Returns each marker's hover targets.
 */
export function drawPercentileMarkers(
	u: uPlot,
	markers: DistributionPercentile[][],
	formatBound: (value: number) => string,
	isDarkMode: boolean,
	hovered: number | null,
): PercentileMarkerHitArea[] {
	if (markers.length === 0) {
		return [];
	}
	const { ctx, bbox } = u;
	const { pxRatio } = uPlot;
	const color = isDarkMode ? themeColors.white : themeColors.black;
	const background = isDarkMode ? Color.BG_INK_400 : Color.BG_VANILLA_100;
	const bottom = bbox.top + bbox.height;

	ctx.save();
	ctx.font = `600 ${MARKER_FONT_SIZE_PX * pxRatio}px Inter, sans-serif`;
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';

	const named = markers.map((group) => {
		const text = formatPercentileBadge(group);
		return { text, width: ctx.measureText(text).width };
	});
	// One square diamond for all, fitting the widest name's box: |dx| + |dy| ≤ r at
	// its corners. Cap height stands in for the text's height.
	const r =
		(Math.max(...named.map(({ width }) => width)) +
			MARKER_FONT_SIZE_PX * pxRatio * 0.7) /
			2 +
		MARKER_BADGE_PADDING_PX * pxRatio;
	const badges = markers.map((group, index) => ({
		text: named[index].text,
		x: u.valToPos(group[0].axisValue, 'x', true),
	}));
	const rows = layoutMarkerLabels(
		badges.map(({ x }) => ({ x: x - r, width: 2 * r })),
		MARKER_BADGE_GAP_PX * pxRatio,
	);
	const rowStep = 2 * r + MARKER_BADGE_GAP_PX * pxRatio;
	const badgeCentres = (index: number): [number, number] => {
		const offset = r + rows[index] * rowStep;
		return [bbox.top + offset, bottom - offset];
	};

	const drawMarker = (index: number): void => {
		const { text, x } = badges[index];
		const isHovered = index === hovered;

		ctx.globalAlpha = isHovered ? 1 : 0.55;
		ctx.strokeStyle = color;
		ctx.lineWidth = pxRatio;
		ctx.setLineDash(MARKER_DASH.map((dash) => dash * pxRatio));
		ctx.beginPath();
		ctx.moveTo(x, bbox.top);
		ctx.lineTo(x, bottom);
		ctx.stroke();

		ctx.globalAlpha = 1;
		ctx.setLineDash([]);
		badgeCentres(index).forEach((y) => {
			drawDiamond(ctx, x, y, r, isHovered ? color : background, color);
			ctx.fillStyle = isHovered ? background : color;
			ctx.fillText(text, x, y);
		});

		if (!isHovered) {
			return;
		}
		// The value sits on the x axis under the line, over the tick labels, in a pill
		// whose notch points up at the line.
		ctx.font = `500 ${MARKER_VALUE_FONT_SIZE_PX * pxRatio}px Inter, sans-serif`;
		const value = formatPercentileValue(markers[index], formatBound);
		const padX = MARKER_PILL_PADDING_X_PX * pxRatio;
		const padY = MARKER_PILL_PADDING_Y_PX * pxRatio;
		const pointer = MARKER_PILL_POINTER_PX * pxRatio;
		const width = ctx.measureText(value).width + 2 * padX;
		const height = MARKER_VALUE_FONT_SIZE_PX * pxRatio + 2 * padY;
		const left = Math.min(Math.max(x - width / 2, 0), ctx.canvas.width - width);
		const top = bottom + 2 * pointer;
		const notchX = Math.min(
			Math.max(x, left + pointer + MARKER_PILL_RADIUS_PX * pxRatio),
			left + width - pointer - MARKER_PILL_RADIUS_PX * pxRatio,
		);
		// A halo in the chart's background hides the tick labels it overlaps.
		ctx.fillStyle = background;
		ctx.fillRect(left - padX, top, width + 2 * padX, height + 2 * padY);
		ctx.fillStyle = isDarkMode ? Color.BG_SLATE_400 : Color.BG_INK_400;
		ctx.beginPath();
		ctx.roundRect(left, top, width, height, MARKER_PILL_RADIUS_PX * pxRatio);
		ctx.moveTo(notchX - pointer, top);
		ctx.lineTo(notchX, top - pointer);
		ctx.lineTo(notchX + pointer, top);
		ctx.closePath();
		ctx.fill();
		ctx.fillStyle = Color.BG_VANILLA_100;
		ctx.fillText(value, left + width / 2, top + height / 2);
	};

	// The hovered one last, so it draws over its neighbours.
	badges.forEach((_, index) => index !== hovered && drawMarker(index));
	if (hovered !== null && hovered < badges.length) {
		drawMarker(hovered);
	}
	ctx.restore();

	return badges.map(({ x }, index) => {
		const toPlot = (value: number, origin: number): number =>
			(value - origin) / pxRatio;
		return {
			x: toPlot(x, bbox.left),
			badges: badgeCentres(index).map((y) => ({
				left: toPlot(x - r, bbox.left),
				right: toPlot(x + r, bbox.left),
				top: toPlot(y - r, bbox.top),
				bottom: toPlot(y + r, bbox.top),
			})),
		};
	});
}
