import uPlot from 'uplot';

import {
	createHeatmapColorResolver,
	HeatmapColorResolver,
	resolveCountDomain,
} from './colorScale';
import { resolveColumnIndex, resolveRowIndex } from './geometry';
import {
	createHoverOverlay,
	HeatmapHoverOverlay,
	showHoverOverlay,
} from './hoverOverlay';
import { createHatchPattern, drawCells, drawOverflowBoundary } from './paint';
import { HeatmapCell, HeatmapColorOptions, HeatmapYAxis } from './types';

export interface HeatmapRenderOptions {
	yAxis: HeatmapYAxis;
	/** Column width in seconds. */
	step: number;
	colors: HeatmapColorOptions;
	isDarkMode: boolean;
	/** Opacity-mode fill when `colors.fill` is empty. */
	seriesColor: string;
	/** Default true. */
	dimOnHover?: boolean;
	/** `null` when the cursor leaves. */
	onHoverChange?: (cell: HeatmapCell | null) => void;
}

/**
 * Registered through `UPlotConfigBuilder.addHook`, not as a `uPlot.Plugin`: uPlot
 * appends plugin hooks *after* the hook arrays, and `setCursor` must run before
 * TooltipPlugin's so the focused row is resolved when the tooltip positions
 * itself. As a plugin it trails a frame and the tooltip flashes at the origin.
 */
export interface HeatmapHooks {
	init: (u: uPlot) => void;
	draw: (u: uPlot) => void;
	setCursor: (u: uPlot) => void;
	destroy: (u: uPlot) => void;
}

export function createHeatmapHooks({
	yAxis,
	step,
	colors,
	isDarkMode,
	seriesColor,
	dimOnHover = true,
	onHoverChange,
}: HeatmapRenderOptions): HeatmapHooks {
	let overlay: HeatmapHoverOverlay | null = null;
	let hovered: HeatmapCell | null = null;
	let hatchPattern: CanvasPattern | null = null;

	// On auto, the domain comes from the data, but these hooks are captured once at
	// config-build time. Resolving lazily keeps a refetch on uPlot's `setData` path
	// rather than forcing a rebuild.
	let cachedData: uPlot.AlignedData | null = null;
	let cachedResolver: HeatmapColorResolver | null = null;

	function getResolver(u: uPlot): HeatmapColorResolver {
		if (cachedResolver && cachedData === u.data) {
			return cachedResolver;
		}
		cachedResolver = createHeatmapColorResolver({
			options: colors,
			domain: resolveCountDomain(
				colors,
				u.data.slice(1) as Array<Array<number | null>>,
			),
			isDarkMode,
			seriesColor,
		});
		cachedData = u.data;
		return cachedResolver;
	}

	function clearHover(u: uPlot): void {
		if (overlay) {
			overlay.container.style.display = 'none';
		}
		if (hovered === null) {
			return;
		}
		hovered = null;
		u.setSeries(null, { focus: true });
		onHoverChange?.(null);
	}

	return {
		init: (u: uPlot): void => {
			overlay = createHoverOverlay(isDarkMode);
			u.over.appendChild(overlay.container);
		},

		draw: (u: uPlot): void => {
			const timestamps = u.data[0] as ArrayLike<number> | undefined;
			if (!timestamps?.length || yAxis.rows.length === 0) {
				return;
			}
			const { ctx } = u;
			hatchPattern ??= createHatchPattern(ctx, isDarkMode);

			ctx.save();
			ctx.beginPath();
			ctx.rect(u.bbox.left, u.bbox.top, u.bbox.width, u.bbox.height);
			ctx.clip();
			drawCells({ u, yAxis, step, resolver: getResolver(u), hatchPattern });
			ctx.restore();

			drawOverflowBoundary({ u, yAxis, isDarkMode });
		},

		setCursor: (u: uPlot): void => {
			const { left = -10, top = -10 } = u.cursor;
			if (left < 0 || top < 0) {
				clearHover(u);
				return;
			}

			const column = resolveColumnIndex(
				u.data[0] as ArrayLike<number>,
				u.posToVal(left, 'x'),
				step,
			);
			const row = resolveRowIndex(yAxis.edges, u.posToVal(top, 'y'));
			if (column === null || row === null) {
				clearHover(u);
				return;
			}
			if (hovered?.row === row && hovered?.column === column) {
				return;
			}

			hovered = {
				row,
				column,
				count:
					(u.data[row + 1] as Array<number | null> | undefined)?.[column] ?? null,
			};
			// Drives TooltipPlugin, which only shows a tooltip for a focused series.
			// uPlot's own focus is disabled here: it picks the series nearest in value
			// space, and a heatmap's value is a colour, not a y coordinate.
			u.setSeries(row + 1, { focus: true });
			if (overlay) {
				showHoverOverlay({
					overlay,
					u,
					yAxis,
					step,
					row,
					column,
					dim: dimOnHover,
				});
			}
			onHoverChange?.(hovered);
		},

		destroy: (): void => {
			overlay?.container.remove();
			overlay = null;
			hovered = null;
			hatchPattern = null;
			cachedData = null;
			cachedResolver = null;
		},
	};
}
