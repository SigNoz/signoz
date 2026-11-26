import Feature from 'ol/Feature';
import type { StyleFunction } from 'ol/style/Style';
import type Style from 'ol/style/Style';
import { renderHook } from 'tests/test-utils';

import { getCountryShapes } from '../../geo/shapes';
import { GeoMapDatum, GeoMapLayer } from '../../types';
import { OlPalette } from '../../utils/olStyles';
import { useOlLayers } from '../useOlLayers';
import { createFakeOlMap } from './fakeOlMap';

export const PALETTE: OlPalette = {
	noData: '#333333',
	context: '#222222',
	border: '#000000',
	outline: '#ffffff',
	bubbleStroke: '#111111',
};
export const DATA: GeoMapDatum[] = [
	{ code: 'DE', value: 4, raw: 'DE' },
	{ code: 'US', value: 9, raw: 'US' },
];
export const FILLS: Record<string, string> = { DE: '#aa0000', US: '#00aa00' };

export const VALUES = new Map(DATA.map((datum) => [datum.code, datum.value]));

export function setup(
	layer: GeoMapLayer = 'regions',
	hoveredCode: string | null = null,
	sizeMetric?: Map<string, number>,
	showLabels = true,
) {
	const fake = createFakeOlMap();
	const shapes = getCountryShapes('europe');
	renderHook(() =>
		useOlLayers({
			handle: fake.handle,
			shapes,
			projection: 'mercator',
			data: DATA,
			layer,
			palette: PALETTE,
			fillFor: (code) => FILLS[code] ?? null,
			sizeByCode: sizeMetric ?? VALUES,
			radiusFor: (size) => size * 2,
			hasSizeMetric: Boolean(sizeMetric),
			showLabels,
			hoveredCode,
		}),
	);
	return { ...fake, shapes };
}

export type SetupHandle = ReturnType<typeof setup>['handle'];

export const styleOf = (fn: unknown, feature: Feature): Style =>
	(fn as StyleFunction)(feature, 1) as Style;
