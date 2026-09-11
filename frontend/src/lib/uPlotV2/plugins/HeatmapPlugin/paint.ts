import { Color } from '@signozhq/design-tokens';
import uPlot from 'uplot';

import { HeatmapColorResolver } from './colorScale';
import { HeatmapYAxis } from './types';

/** Cells at least this wide/tall keep a hairline separator. */
const MIN_CELL_SIZE_FOR_GAP = 4;
const HATCH_TILE_SIZE = 6;
const OVERFLOW_DASH: [number, number] = [4, 3];

/** Hatch for `null` cells: a gap must never share the bottom-of-scale fill, or a
 *  scrape outage reads as a quiet period. */
export function createHatchPattern(
	ctx: CanvasRenderingContext2D,
	isDarkMode: boolean,
): CanvasPattern | null {
	const pxRatio = uPlot.pxRatio;
	const size = Math.max(2, Math.round(HATCH_TILE_SIZE * pxRatio));
	const tile = document.createElement('canvas');
	tile.width = size;
	tile.height = size;

	const tileCtx = tile.getContext('2d');
	if (!tileCtx) {
		return null;
	}
	tileCtx.strokeStyle = isDarkMode
		? `${Color.BG_VANILLA_400}59`
		: `${Color.BG_INK_300}40`;
	tileCtx.lineWidth = Math.max(1, pxRatio);
	tileCtx.beginPath();
	// Three strokes keep the pattern continuous across tile seams.
	tileCtx.moveTo(0, size);
	tileCtx.lineTo(size, 0);
	tileCtx.moveTo(-size / 2, size / 2);
	tileCtx.lineTo(size / 2, -size / 2);
	tileCtx.moveTo(size / 2, size * 1.5);
	tileCtx.lineTo(size * 1.5, size / 2);
	tileCtx.stroke();

	return ctx.createPattern(tile, 'repeat');
}

/** One canvas pass. Offscreen columns are skipped rather than clipped. */
// eslint-disable-next-line sonarjs/cognitive-complexity
export function drawCells({
	u,
	yAxis,
	step,
	resolver,
	hatchPattern,
}: {
	u: uPlot;
	yAxis: HeatmapYAxis;
	step: number;
	resolver: HeatmapColorResolver;
	hatchPattern: CanvasPattern | null;
}): void {
	const { ctx } = u;
	const timestamps = u.data[0] as ArrayLike<number>;
	const { rows, edges } = yAxis;
	const pxRatio = uPlot.pxRatio;

	const xMin = u.scales.x.min ?? timestamps[0];
	const xMax = u.scales.x.max ?? timestamps[timestamps.length - 1] + step;
	const rowEdgePositions = edges.map((edge) => u.valToPos(edge, 'y', true));

	for (let column = 0; column < timestamps.length; column += 1) {
		const columnStart = timestamps[column];
		const columnEnd = columnStart + step;
		if (columnEnd < xMin || columnStart > xMax) {
			continue;
		}

		const left = u.valToPos(columnStart, 'x', true);
		const rawWidth = u.valToPos(columnEnd, 'x', true) - left;
		const gapX = rawWidth > MIN_CELL_SIZE_FOR_GAP * pxRatio ? pxRatio : 0;
		const width = Math.max(1, rawWidth - gapX);

		for (let row = 0; row < rows.length; row += 1) {
			const top = rowEdgePositions[row + 1];
			const rawHeight = rowEdgePositions[row] - top;
			const gapY = rawHeight > MIN_CELL_SIZE_FOR_GAP * pxRatio ? pxRatio : 0;

			const count = (u.data[row + 1] as Array<number | null> | undefined)?.[
				column
			];
			const fill = resolver.colorFor(count ?? null);

			if (fill === null && hatchPattern === null) {
				continue;
			}
			ctx.fillStyle = fill ?? (hatchPattern as CanvasPattern);
			ctx.fillRect(left, top, width, Math.max(1, rawHeight - gapY));
		}
	}
}

/** The `+Inf` row is unbounded, so its height is a drawing convenience and
 *  should not be compared with the real buckets. */
export function drawOverflowBoundary({
	u,
	yAxis,
	isDarkMode,
}: {
	u: uPlot;
	yAxis: HeatmapYAxis;
	isDarkMode: boolean;
}): void {
	const overflowIndex = yAxis.rows.length - 1;
	if (overflowIndex < 1 || !yAxis.rows[overflowIndex].isOverflow) {
		return;
	}

	const { ctx } = u;
	const y = Math.round(u.valToPos(yAxis.edges[overflowIndex], 'y', true));

	ctx.save();
	ctx.setLineDash(OVERFLOW_DASH);
	ctx.lineWidth = Math.max(1, uPlot.pxRatio);
	ctx.strokeStyle = isDarkMode ? Color.BG_VANILLA_400 : Color.BG_INK_300;
	ctx.beginPath();
	ctx.moveTo(u.bbox.left, y);
	ctx.lineTo(u.bbox.left + u.bbox.width, y);
	ctx.stroke();
	ctx.restore();
}
