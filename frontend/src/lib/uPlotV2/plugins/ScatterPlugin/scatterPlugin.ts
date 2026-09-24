import uPlot, { Series } from 'uplot';

import { DEFAULT_FOCUS_PROXIMITY_VALUE } from '../../constants';
import { PlotMode } from '../../config/types';
import type { UPlotConfigBuilder } from '../../config/UPlotConfigBuilder';
import { Quadtree } from '../../utils/quadtree';
import {
	resolveHit,
	resolvePointDiameter,
	resolveSizeDomain,
	SizeDomain,
} from './geometry';
import {
	DEFAULT_HOVER_TOLERANCE_PX,
	DEFAULT_SCATTER_POINT_SIZE,
	ScatterHit,
	ScatterPluginOptions,
	ScatterSeriesData,
} from './types';

/** Every scatter series reads its own x and y columns against the shared scales. */
export const SCATTER_FACETS: Series.Facet[] = [
	{ scale: 'x', auto: true },
	{ scale: 'y', auto: true },
];

const HIDDEN_BBOX: uPlot.BBox = { left: -10, top: -10, width: 0, height: 0 };

const TWO_PI = 2 * Math.PI;

/** uPlot caches built paths on the series; the field is internal to it. */
type SeriesWithPaths = Series & { _paths?: Series.Paths | null };

export interface ScatterPlugin {
	/** Draws every point of a series as one path and indexes the discs for hover. */
	pathBuilder: Series.PathBuilder;
	/** Hover by disc rather than by nearest x: mode 2 has no shared x to scan. */
	cursor: uPlot.Cursor;
	hooks: {
		drawClear: (u: uPlot) => void;
		destroy: (u: uPlot) => void;
	};
	getHit: () => ScatterHit | null;
}

export function createScatterPlugin({
	pointSize = DEFAULT_SCATTER_POINT_SIZE,
	hoverTolerance = DEFAULT_HOVER_TOLERANCE_PX,
}: ScatterPluginOptions = {}): ScatterPlugin {
	let tree: Quadtree<ScatterHit> | null = null;
	let hit: ScatterHit | null = null;

	// The domain spans every series, so it is resolved once per dataset rather than
	// once per series path.
	let cachedData: uPlot.AlignedData | null = null;
	let cachedDomain: SizeDomain | null = null;

	function getSizeDomain(u: uPlot): SizeDomain | null {
		if (cachedData !== u.data) {
			cachedDomain = resolveSizeDomain(u.data);
			cachedData = u.data;
		}
		return cachedDomain;
	}

	const pathBuilder: Series.PathBuilder = (u, seriesIdx, idx0, idx1) => {
		const path = new Path2D();
		const sizes = (u.data[seriesIdx] as unknown as ScatterSeriesData)[2];
		const domain = getSizeDomain(u);
		const { pxRatio } = uPlot;

		uPlot.orient(
			u,
			seriesIdx,
			(
				_series,
				dataX,
				dataY,
				scaleX,
				scaleY,
				valToPosX,
				valToPosY,
				xOff,
				yOff,
				xDim,
				yDim,
				_moveTo,
				_lineTo,
				_rect,
				arc,
			) => {
				const xMin = scaleX.min ?? -Infinity;
				const xMax = scaleX.max ?? Infinity;
				const yMin = scaleY.min ?? -Infinity;
				const yMax = scaleY.max ?? Infinity;

				for (let i = idx0; i <= idx1; i++) {
					const x = dataX[i];
					const y = dataY[i];
					if (
						x == null ||
						y == null ||
						x < xMin ||
						x > xMax ||
						y < yMin ||
						y > yMax
					) {
						continue;
					}

					const diameter =
						resolvePointDiameter(sizes?.[i], domain, pointSize) * pxRatio;
					const radius = diameter / 2;
					const cx = valToPosX(x, scaleX, xDim, xOff);
					const cy = valToPosY(y, scaleY, yDim, yOff);

					path.moveTo(cx + radius, cy);
					arc(path, cx, cy, radius, 0, TWO_PI);

					tree?.add({
						x: cx - radius - u.bbox.left,
						y: cy - radius - u.bbox.top,
						w: diameter,
						h: diameter,
						seriesIndex: seriesIdx,
						dataIndex: i,
					});
				}
			},
		);

		return { stroke: path, fill: path, clip: null };
	};

	const cursor: uPlot.Cursor = {
		// Selection would set the dashboard time range; neither axis is time here.
		drag: { x: false, y: false, setScale: false },
		dataIdx: (u, seriesIdx): number | null => {
			// uPlot asks series 1..n in order on every cursor move; resolve once.
			if (seriesIdx === 1) {
				const { left = -1, top = -1 } = u.cursor;
				const { pxRatio } = uPlot;
				hit =
					tree && left >= 0 && top >= 0
						? resolveHit(
								tree,
								left * pxRatio,
								top * pxRatio,
								hoverTolerance * pxRatio,
							)
						: null;
			}
			return hit?.seriesIndex === seriesIdx ? hit.dataIndex : null;
		},
		points: {
			bbox: (_u, seriesIdx): uPlot.BBox => {
				if (hit?.seriesIndex !== seriesIdx) {
					return HIDDEN_BBOX;
				}
				const { pxRatio } = uPlot;
				return {
					left: hit.x / pxRatio,
					top: hit.y / pxRatio,
					width: hit.w / pxRatio,
					height: hit.h / pxRatio,
				};
			},
		},
		// uPlot only measures series that returned a data index, i.e. the hit one.
		focus: { prox: DEFAULT_FOCUS_PROXIMITY_VALUE, dist: (): number => 0 },
	};

	return {
		pathBuilder,
		cursor,
		hooks: {
			drawClear: (u: uPlot): void => {
				tree = new Quadtree<ScatterHit>(0, 0, u.bbox.width, u.bbox.height);
				// The tree only knows what the path builder last drew, so cached paths
				// must be rebuilt alongside it.
				u.series.forEach((series, index) => {
					if (index > 0) {
						(series as SeriesWithPaths)._paths = null;
					}
				});
			},
			destroy: (): void => {
				tree = null;
				hit = null;
				cachedData = null;
				cachedDomain = null;
			},
		},
		getHit: (): ScatterHit | null => hit,
	};
}

export function applyScatterPlugin(
	builder: UPlotConfigBuilder,
	plugin: ScatterPlugin,
): void {
	builder.setMode(PlotMode.Faceted);
	builder.setCursor(plugin.cursor);
	builder.addHook('drawClear', plugin.hooks.drawClear);
	builder.addHook('destroy', plugin.hooks.destroy);
}
