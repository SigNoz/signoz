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

/** Area grows with |value|, floored at `min` so the smallest stays hoverable. */
export function createRadiusScale(
	data: GeoMapDatum[],
	[min, max]: [number, number],
): (value: number) => number {
	const maxAbs = Math.max(0, ...data.map((datum) => Math.abs(datum.value)));
	return (value: number): number => {
		if (maxAbs === 0) {
			return min;
		}
		const share = Math.abs(value) / maxAbs;
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
