import type Feature from 'ol/Feature';
import type CircleStyle from 'ol/style/Circle';
import { renderHook } from 'tests/test-utils';

import { getCountryShapes } from '../../geo/shapes';
import { GeoMapPoint } from '../../types';
import { useOlLayers } from '../useOlLayers';
import { createFakeOlMap } from './fakeOlMap';
import { PALETTE, styleOf } from './olLayersSetup';

const POINTS: GeoMapPoint[] = [
	{ id: 'p1', lat: 52.52, lon: 13.4, value: 4, label: 'Berlin' },
	{ id: 'p2', lat: 48.86, lon: 2.35, value: 9, label: 'Paris' },
];
const pointSizes = new Map([
	['p1', 1.5],
	['p2', 9],
]);

function setupPoints(hoveredCode: string | null = null) {
	const fake = createFakeOlMap();
	renderHook(() =>
		useOlLayers({
			handle: fake.handle,
			shapes: getCountryShapes('europe'),
			projection: 'mercator',
			data: [],
			points: POINTS,
			// No WebGL in jsdom: the canvas fallback.
			pointsLayer: { layer: null, status: 'unsupported' },
			layer: 'points',
			palette: PALETTE,
			fillFor: () => '#aa0000',
			sizeByCode: pointSizes,
			radiusFor: (size) => size * 2,
			hoveredCode,
		}),
	);
	return fake;
}

describe('useOlLayers on the points layer', () => {
	it('draws one circle per point, keyed by its id', () => {
		const { handle } = setupPoints();
		const codes = handle.layers.bubbles
			.getSource()
			?.getFeatures()
			.map((feature) => feature.get('code'));
		expect(codes).toStrictEqual(['p1', 'p2']);
	});

	it('drops the outline from small points, so dense clusters read as density', () => {
		const { handle } = setupPoints();
		const [small, large] = handle.layers.bubbles.getSource()?.getFeatures() ?? [];
		const imageOf = (feature: Feature): CircleStyle =>
			styleOf(handle.layers.bubbles.getStyle(), feature).getImage() as CircleStyle;

		// Radii are size × 2: 3 px and 18 px.
		expect(imageOf(small).getStroke()).toBeNull();
		expect(imageOf(large).getStroke()).not.toBeNull();
	});

	it('rings the hovered point just outside its circle', () => {
		const { handle } = setupPoints('p2');
		const [ring] = handle.layers.hover.getSource()?.getFeatures() ?? [];
		const image = styleOf(
			handle.layers.hover.getStyle(),
			ring,
		).getImage() as CircleStyle;
		expect(image.getRadius()).toBe(9 * 2 + 2);
	});
});
