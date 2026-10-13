import { Color as DesignToken } from '@signozhq/design-tokens';
import Color from 'color';

import { DEFAULT_COLOR_RAMP_PALETTE, getPaletteStops } from './palettes';
import { ColorRampMode, ColorRampOptions, ColorRampScale } from './types';

export const MIN_COLOR_STEPS = 2;
export const MAX_COLOR_STEPS = 128;
export const DEFAULT_COLOR_STEPS = 64;

/** Without a floor, the lowest values read as "no data". */
export const MIN_OPACITY_ALPHA = 0.1;

/** Log's bottom when the values hold no positive one to take it from. */
const DEFAULT_LOG_FLOOR = 1;

/** Widest span a single ramp is stretched over on a log scale. */
const MAX_LOG_DECADES = 6;

/** Used when neither an explicit fill nor a series colour is available. */
export const DEFAULT_OPACITY_FILL = DesignToken.BG_ROBIN_500;

/** Zero takes the panel surface so an empty stretch recedes, leaving the ramp's
 *  bottom to the smallest value that did occur — on a log scale the two collapse. */
const ZERO_FILL: Record<'dark' | 'light', string> = {
	dark: DesignToken.BG_INK_500,
	light: DesignToken.BG_VANILLA_100,
};

export const DEFAULT_COLOR_RAMP_OPTIONS: ColorRampOptions = {
	mode: ColorRampMode.Palette,
	scale: ColorRampScale.Log,
	min: null,
	max: null,
	palette: DEFAULT_COLOR_RAMP_PALETTE,
	steps: DEFAULT_COLOR_STEPS,
	fill: '',
};

export interface ColorRampDomain {
	min: number;
	max: number;
	/** Bottom decade of the log scale: the smallest value it separates from zero.
	 *  Always positive, since log has no bottom otherwise. */
	logFloor: number;
}

/** Highest value, ignoring `null`. 0 when there is none. */
export function getMaxValue(values: Array<Array<number | null>>): number {
	let max = 0;
	for (const row of values) {
		for (const value of row) {
			if (value !== null && Number.isFinite(value) && value > max) {
				max = value;
			}
		}
	}
	return max;
}

/** Smallest value above zero, ignoring `null`. `null` when there is none. */
export function getSmallestPositiveValue(
	values: Array<Array<number | null>>,
): number | null {
	let smallest: number | null = null;
	for (const row of values) {
		for (const value of row) {
			if (
				value !== null &&
				Number.isFinite(value) &&
				value > 0 &&
				(smallest === null || value < smallest)
			) {
				smallest = value;
			}
		}
	}
	return smallest;
}

/**
 * The values' own resolution: whole counts floor at 1, while rates or ratios can
 * live entirely below it, where a fixed floor of 1 would flatten every value onto
 * the bottom colour. Capped at `MAX_LOG_DECADES` so one stray tiny value cannot
 * stretch the ramp over a range nothing else occupies.
 */
function resolveLogFloor(
	values: Array<Array<number | null>>,
	max: number,
): number {
	const smallest = getSmallestPositiveValue(values) ?? DEFAULT_LOG_FLOOR;
	return Math.max(smallest, max / 10 ** MAX_LOG_DECADES);
}

/** Explicit clamps win; otherwise 0 to the highest value. */
export function resolveColorDomain(
	options: Pick<ColorRampOptions, 'min' | 'max'>,
	values: Array<Array<number | null>>,
): ColorRampDomain {
	const min = options.min ?? 0;
	const max = options.max ?? getMaxValue(values);
	const logFloor = resolveLogFloor(values, max);
	return max > min ? { min, max, logFloor } : { min, max: min, logFloor };
}

/**
 * Lowest value the ramp distinguishes, for its legend's bottom label. Log cannot
 * place 0, so its ramp starts at the floor rather than the domain's minimum.
 */
export function getRampBottom(
	domain: ColorRampDomain,
	scale: ColorRampScale,
): number {
	return scale === ColorRampScale.Log
		? Math.max(domain.min, domain.logFloor)
		: domain.min;
}

/** Position on the colour scale, 0..1. A degenerate domain collapses to 0 so
 *  all-zero values render at the bottom rather than disappearing. */
export function normalizeColorValue({
	value,
	domain,
	scale,
}: {
	value: number;
	domain: ColorRampDomain;
	scale: ColorRampScale;
}): number {
	const { min, max } = domain;
	if (!(max > min)) {
		return 0;
	}

	const clamped = Math.min(Math.max(value, min), max);

	if (scale === ColorRampScale.Log) {
		// Anything at or below the floor sits at the bottom; log cannot place it.
		const bottom = getRampBottom(domain, scale);
		const logMin = Math.log10(bottom);
		const logMax = Math.log10(max);
		if (logMax > logMin) {
			return (Math.log10(Math.max(clamped, bottom)) - logMin) / (logMax - logMin);
		}
		// The floor already reaches the top of the domain, so there is no span to
		// spread logarithmically. Fall through rather than flatten every value.
	}

	const linear = (clamped - min) / (max - min);
	return scale === ColorRampScale.Sqrt ? Math.sqrt(linear) : linear;
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
 * Colour the highest values are drawn with — the palette's extreme, or the opacity
 * fill at full strength. Depends only on the options, not on the data, so callers
 * can read it before any values exist.
 */
export function resolveExtremeColor({
	options,
	isDarkMode,
	seriesColor,
}: {
	options: ColorRampOptions;
	isDarkMode: boolean;
	seriesColor: string;
}): string {
	if (options.mode === ColorRampMode.Opacity) {
		return options.fill || seriesColor || DEFAULT_OPACITY_FILL;
	}
	const stops = getPaletteStops(options.palette, isDarkMode);
	return stops[stops.length - 1] ?? DEFAULT_OPACITY_FILL;
}

export interface ColorRampResolver {
	/** `null` for a `null` value, which the caller draws as no data. */
	colorFor: (value: number | null) => string | null;
	/** 0..1, or `null` for a `null` value. */
	positionOf: (value: number | null) => number | null;
	/** Low to high. The colour bar renders exactly these. */
	ramp: string[];
	domain: ColorRampDomain;
}

/** Palette mode walks a sequential ramp; opacity mode varies the alpha of one
 *  fill, so a heatmap grid matches its group's legend swatch. */
export function createColorRampResolver({
	options,
	domain,
	isDarkMode,
	seriesColor,
}: {
	options: ColorRampOptions;
	domain: ColorRampDomain;
	isDarkMode: boolean;
	/** Opacity-mode fill when `options.fill` is empty. */
	seriesColor: string;
}): ColorRampResolver {
	const steps = clampColorSteps(options.steps);
	const positions = Array.from({ length: steps }, (_, index) =>
		steps === 1 ? 0 : index / (steps - 1),
	);

	let ramp: string[];
	if (options.mode === ColorRampMode.Opacity) {
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

	const positionOf = (value: number | null): number | null => {
		if (value === null || !Number.isFinite(value)) {
			return null;
		}
		return normalizeColorValue({ value, domain, scale: options.scale });
	};

	// An explicit `min` above zero makes it a clamped value like any other.
	const zeroFill =
		domain.min <= 0 ? ZERO_FILL[isDarkMode ? 'dark' : 'light'] : null;

	return {
		positionOf,
		colorFor: (value): string | null => {
			if (value === 0 && zeroFill !== null) {
				return zeroFill;
			}
			const t = positionOf(value);
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
