import { Color as DesignToken } from '@signozhq/design-tokens';
import Color from 'color';

import { getPaletteStops } from './palettes';
import {
	HeatmapColorMode,
	HeatmapColorOptions,
	HeatmapColorScale,
	HeatmapColorPalette,
} from './types';

export const MIN_COLOR_STEPS = 2;
export const MAX_COLOR_STEPS = 128;
export const DEFAULT_COLOR_STEPS = 64;

/** Without a floor, the lowest counts read as "no data". */
export const MIN_OPACITY_ALPHA = 0.1;

/** Log's bottom when the grid holds no positive count to take it from. */
const DEFAULT_LOG_FLOOR = 1;

/** Widest span a single ramp is stretched over on a log scale. */
const MAX_LOG_DECADES = 6;

/** Used when neither an explicit fill nor a series colour is available. */
export const DEFAULT_OPACITY_FILL = DesignToken.BG_ROBIN_500;

export const DEFAULT_HEATMAP_COLORS: HeatmapColorOptions = {
	mode: HeatmapColorMode.Palette,
	scale: HeatmapColorScale.Log,
	minCount: null,
	maxCount: null,
	palette: HeatmapColorPalette.Lava,
	steps: DEFAULT_COLOR_STEPS,
	fill: '',
};

export interface CountDomain {
	min: number;
	max: number;
	/** Bottom decade of the log scale: the smallest count it separates from zero.
	 *  Always positive, since log has no bottom otherwise. */
	logFloor: number;
}

/** Highest count, ignoring `null`. 0 for an empty grid. */
export function getMaxCount(counts: Array<Array<number | null>>): number {
	let max = 0;
	for (const row of counts) {
		for (const count of row) {
			if (count !== null && Number.isFinite(count) && count > max) {
				max = count;
			}
		}
	}
	return max;
}

/** Smallest count above zero, ignoring `null`. `null` for a grid without one. */
export function getSmallestPositiveCount(
	counts: Array<Array<number | null>>,
): number | null {
	let smallest: number | null = null;
	for (const row of counts) {
		for (const count of row) {
			if (
				count !== null &&
				Number.isFinite(count) &&
				count > 0 &&
				(smallest === null || count < smallest)
			) {
				smallest = count;
			}
		}
	}
	return smallest;
}

/**
 * The grid's own resolution: whole counts floor at 1, while a heatmap of rates or
 * ratios can live entirely below it, where a fixed floor of 1 would flatten every
 * cell onto the bottom colour. Capped at `MAX_LOG_DECADES` so one stray tiny cell
 * cannot stretch the ramp over a range nothing else occupies.
 */
function resolveLogFloor(
	counts: Array<Array<number | null>>,
	max: number,
): number {
	const smallest = getSmallestPositiveCount(counts) ?? DEFAULT_LOG_FLOOR;
	return Math.max(smallest, max / 10 ** MAX_LOG_DECADES);
}

/** Explicit clamps win; otherwise 0 to the grid's highest count. */
export function resolveCountDomain(
	options: Pick<HeatmapColorOptions, 'minCount' | 'maxCount'>,
	counts: Array<Array<number | null>>,
): CountDomain {
	const min = options.minCount ?? 0;
	const max = options.maxCount ?? getMaxCount(counts);
	const logFloor = resolveLogFloor(counts, max);
	return max > min ? { min, max, logFloor } : { min, max: min, logFloor };
}

/** Position on the colour scale, 0..1. A degenerate domain collapses to 0 so an
 *  all-zero grid renders at the bottom rather than disappearing. */
export function normalizeCount({
	count,
	domain,
	scale,
}: {
	count: number;
	domain: CountDomain;
	scale: HeatmapColorScale;
}): number {
	const { min, max } = domain;
	if (!(max > min)) {
		return 0;
	}

	const clamped = Math.min(Math.max(count, min), max);

	if (scale === HeatmapColorScale.Log) {
		// Anything at or below the floor sits at the bottom; log cannot place it.
		const bottom = Math.max(min, domain.logFloor);
		const logMin = Math.log10(bottom);
		const logMax = Math.log10(max);
		if (logMax > logMin) {
			return (Math.log10(Math.max(clamped, bottom)) - logMin) / (logMax - logMin);
		}
		// The floor already reaches the top of the domain, so there is no span to
		// spread logarithmically. Fall through rather than flatten the whole grid.
	}

	const linear = (clamped - min) / (max - min);
	return scale === HeatmapColorScale.Sqrt ? Math.sqrt(linear) : linear;
}

export function clampColorSteps(steps: number): number {
	if (!Number.isFinite(steps)) {
		return DEFAULT_COLOR_STEPS;
	}
	return Math.min(Math.max(Math.round(steps), MIN_COLOR_STEPS), MAX_COLOR_STEPS);
}

/** Colour at `t` (0..1) along a multi-stop ramp. */
function sampleStops(stops: string[], t: number): string {
	if (stops.length === 0) {
		return 'transparent';
	}
	if (stops.length === 1) {
		return stops[0];
	}
	const scaled = Math.min(Math.max(t, 0), 1) * (stops.length - 1);
	const lower = Math.min(Math.floor(scaled), stops.length - 2);
	return Color(stops[lower])
		.mix(Color(stops[lower + 1]), scaled - lower)
		.hex();
}

/**
 * Colour the densest cells are drawn with — the palette's extreme, or the opacity
 * fill at full strength. Depends only on the options, not on the data, so callers
 * can read it before a grid exists.
 */
export function resolveExtremeColor({
	options,
	isDarkMode,
	seriesColor,
}: {
	options: HeatmapColorOptions;
	isDarkMode: boolean;
	seriesColor: string;
}): string {
	if (options.mode === HeatmapColorMode.Opacity) {
		return options.fill || seriesColor || DEFAULT_OPACITY_FILL;
	}
	const stops = getPaletteStops(options.palette, isDarkMode);
	return stops[stops.length - 1] ?? DEFAULT_OPACITY_FILL;
}

export interface HeatmapColorResolver {
	/** `null` for a `null` count, which must be hatched. */
	colorFor: (count: number | null) => string | null;
	/** 0..1, or `null` for a `null` count. */
	positionOf: (count: number | null) => number | null;
	/** Low to high. The colour bar renders exactly these. */
	ramp: string[];
	domain: CountDomain;
}

/** Palette mode walks a sequential ramp; opacity mode varies the alpha of one
 *  fill, so the grid matches its group's legend swatch. */
export function createHeatmapColorResolver({
	options,
	domain,
	isDarkMode,
	seriesColor,
}: {
	options: HeatmapColorOptions;
	domain: CountDomain;
	isDarkMode: boolean;
	/** Opacity-mode fill when `options.fill` is empty. */
	seriesColor: string;
}): HeatmapColorResolver {
	const steps = clampColorSteps(options.steps);
	const positions = Array.from({ length: steps }, (_, index) =>
		steps === 1 ? 0 : index / (steps - 1),
	);

	let ramp: string[];
	if (options.mode === HeatmapColorMode.Opacity) {
		const base = Color(options.fill || seriesColor || DEFAULT_OPACITY_FILL);
		ramp = positions.map((t) =>
			base
				.alpha(MIN_OPACITY_ALPHA + t * (1 - MIN_OPACITY_ALPHA))
				.rgb()
				.string(),
		);
	} else {
		const stops = getPaletteStops(options.palette, isDarkMode);
		ramp = positions.map((t) => sampleStops(stops, t));
	}

	const positionOf = (count: number | null): number | null => {
		if (count === null || !Number.isFinite(count)) {
			return null;
		}
		return normalizeCount({ count, domain, scale: options.scale });
	};

	return {
		positionOf,
		colorFor: (count): string | null => {
			const t = positionOf(count);
			if (t === null) {
				return null;
			}
			const index = Math.min(Math.floor(t * steps), steps - 1);
			return ramp[index];
		},
		ramp,
		domain,
	};
}
