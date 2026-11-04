import uPlot from 'uplot';

/** A bar in scale space. Unlike uPlot's own bars, each one carries its own width. */
export interface VariableWidthBar {
	x0: number;
	x1: number;
	y0: number;
	y1: number;
	/** Drawn in `hatchedFill` with the hatch pattern on top. */
	hatched: boolean;
}

/** Bars narrower than this, in CSS pixels, keep no gap between them. */
const MIN_WIDTH_FOR_GAP_PX = 3;

/**
 * Draws `[x0, x1] × [y0, y1]` rects on the `x` and `y` scales. uPlot's bar builder
 * assumes one width for every bar, which a bucket axis with uneven bounds breaks.
 *
 * `getBars` runs on every redraw, so a caller can derive the bars from the plot's
 * current state (e.g. which series are shown).
 */
export function createVariableWidthBarsPathBuilder({
	getBars,
	fill,
	hatchedFill,
	getHatchPattern,
	gapPx,
}: {
	getBars: (u: uPlot, seriesIdx: number) => VariableWidthBar[];
	fill: string;
	hatchedFill: string;
	getHatchPattern: (ctx: CanvasRenderingContext2D) => CanvasPattern | null;
	/** Space between neighbouring bars, in CSS pixels. */
	gapPx: number;
}): uPlot.Series.PathBuilder {
	return (u, seriesIdx): uPlot.Series.Paths => {
		const solidPath = new Path2D();
		const hatchedPath = new Path2D();
		const inset = (gapPx * uPlot.pxRatio) / 2;
		const minWidthForGap = MIN_WIDTH_FOR_GAP_PX * uPlot.pxRatio;
		let hasHatched = false;

		getBars(u, seriesIdx).forEach((bar) => {
			const left = u.valToPos(bar.x0, 'x', true);
			const right = u.valToPos(bar.x1, 'x', true);
			const top = u.valToPos(bar.y1, 'y', true);
			const bottom = u.valToPos(bar.y0, 'y', true);
			const width = right - left;
			const gap = width > minWidthForGap ? inset : 0;
			const path = bar.hatched ? hatchedPath : solidPath;
			path.rect(left + gap, top, width - 2 * gap, bottom - top);
			hasHatched ||= bar.hatched;
		});

		const fills = new Map<CanvasRenderingContext2D['fillStyle'], Path2D>([
			[fill, solidPath],
		]);
		if (hasHatched) {
			fills.set(hatchedFill, hatchedPath);
			const pattern = getHatchPattern(u.ctx);
			if (pattern) {
				fills.set(pattern, hatchedPath);
			}
		}

		return { stroke: null, fill: fills, clip: null, band: null, flags: 0 };
	};
}
