import {
	ColorRampResolver,
	createColorRampResolver,
	resolveColorDomain,
} from 'lib/visualization/colorRamp/colorScale';
import { ColorRampMode } from 'lib/visualization/colorRamp/types';

import { GeoMapColors, GeoMapDatum } from '../types';

/** Enough of the palette's background-coloured end to skip that the lowest
 *  value stays apart from the map's background and no-data fill in either theme. */
const PALETTE_START = 0.25;

export interface GeoMapRank {
	rank: number;
	share: number;
}

/**
 * What a datum's bubble is sized by: its value, or with a size metric its
 * `size`, where a missing, non-finite or non-positive size draws no bubble.
 */
export function bubbleSizeOf(
	datum: GeoMapDatum,
	hasSizeMetric: boolean,
): number | null {
	if (!hasSizeMetric) {
		return datum.value;
	}
	const { size } = datum;
	return size != null && Number.isFinite(size) && size > 0 ? size : null;
}

/** The size legend's reference values: the largest size, and a quarter of it. */
export function getSizeLegendSteps(maxSize: number): number[] {
	return maxSize > 0 ? [maxSize, maxSize / 4] : [];
}

/** Area grows with |size|, floored at `min` so the smallest stays hoverable. */
export function createRadiusScale(
	sizes: number[],
	[min, max]: [number, number],
): (size: number) => number {
	const maxAbs = Math.max(0, ...sizes.map((size) => Math.abs(size)));
	return (size: number): number => {
		if (maxAbs === 0) {
			return min;
		}
		const share = Math.abs(size) / maxAbs;
		return Math.sqrt(min * min + (max * max - min * min) * share);
	};
}

export function rankData(data: GeoMapDatum[]): Map<string, GeoMapRank> {
	const total = data.reduce((sum, datum) => sum + Math.max(datum.value, 0), 0);
	const sorted = [...data].sort((a, b) => b.value - a.value);
	return new Map(
		sorted.map((datum, index) => [
			datum.code,
			{ rank: index + 1, share: total > 0 ? datum.value / total : 0 },
		]),
	);
}

/** The shared colour ramp, fed the map's values as a single row. */
export function createGeoMapColorResolver(
	data: GeoMapDatum[],
	colors: GeoMapColors,
	isDarkMode: boolean,
): ColorRampResolver {
	const options = {
		mode: ColorRampMode.Palette,
		palette: colors.palette,
		scale: colors.scale,
		steps: colors.steps,
		min: colors.min,
		max: colors.max,
		fill: '',
	};
	return createColorRampResolver({
		options,
		domain: resolveColorDomain(options, [data.map((datum) => datum.value)]),
		isDarkMode,
		seriesColor: '',
		paletteStart: PALETTE_START,
		// Zero is a measured value; the surface colour would read as ocean.
		fillZero: false,
	});
}
