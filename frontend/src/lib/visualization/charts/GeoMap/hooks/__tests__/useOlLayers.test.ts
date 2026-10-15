import { renderHook } from '@testing-library/react';
import Feature from 'ol/Feature';
import type { StyleFunction } from 'ol/style/Style';
import type CircleStyle from 'ol/style/Circle';
import type Style from 'ol/style/Style';

import { getCountryShapes } from '../../geo/shapes';
import { GeoMapDatum, GeoMapLayer, GeoMapPoint } from '../../types';
import { OlPalette } from '../../utils/olStyles';
import { useOlLayers } from '../useOlLayers';
import { createFakeOlMap } from './fakeOlMap';

const PALETTE: OlPalette = {
	noData: '#333333',
	context: '#222222',
	border: '#000000',
	outline: '#ffffff',
	bubbleStroke: '#111111',
};
const DATA: GeoMapDatum[] = [
	{ code: 'DE', value: 4, raw: 'DE' },
	{ code: 'US', value: 9, raw: 'US' },
];
const FILLS: Record<string, string> = { DE: '#aa0000', US: '#00aa00' };

const VALUES = new Map(DATA.map((datum) => [datum.code, datum.value]));

function setup(
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

const styleOf = (fn: unknown, feature: Feature): Style =>
	(fn as StyleFunction)(feature, 1) as Style;

describe('useOlLayers', () => {
	it('loads the view’s members and context into their layers', () => {
		const { handle } = setup();
		const codes = (layer: 'members' | 'context'): unknown[] =>
			handle.layers[layer]
				.getSource()
				?.getFeatures()
				.map((feature) => feature.get('code')) ?? [];

		expect(codes('members')).toContain('DE');
		expect(codes('members')).not.toContain('US');
		expect(codes('context')).toContain('US');
	});

	it('fills members from the data, and the rest with the no-data colour', () => {
		const { handle } = setup();
		const style = handle.layers.members.getStyle();

		expect(
			styleOf(style, new Feature({ code: 'DE' }))
				.getFill()
				?.getColor(),
		).toBe('#aa0000');
		expect(
			styleOf(style, new Feature({ code: 'FR' }))
				.getFill()
				?.getColor(),
		).toBe(PALETTE.noData);
	});

	it('draws no bubbles on the regions layer', () => {
		const { handle } = setup('regions');
		expect(handle.layers.bubbles.getSource()?.getFeatures()).toHaveLength(0);
	});

	it('draws a bubble per value in view, with neutral shapes behind', () => {
		const { handle } = setup('bubbles');
		const bubbles = handle.layers.bubbles.getSource()?.getFeatures() ?? [];

		expect(bubbles.map((feature) => feature.get('code'))).toStrictEqual(['DE']);
		expect(
			styleOf(handle.layers.members.getStyle(), new Feature({ code: 'DE' }))
				.getFill()
				?.getColor(),
		).toBe(PALETTE.noData);
	});

	describe('with a size metric on the regions layer', () => {
		const bubbleCodes = (handle: ReturnType<typeof setup>['handle']): unknown[] =>
			handle.layers.bubbles
				.getSource()
				?.getFeatures()
				.map((feature) => feature.get('code')) ?? [];

		it('keeps the shapes shaded and adds a bubble sized by the size metric', () => {
			const { handle } = setup('regions', null, new Map([['DE', 50]]));
			const bubble = handle.layers.bubbles.getSource()?.getFeatures()[0];

			expect(bubbleCodes(handle)).toStrictEqual(['DE']);
			expect(
				styleOf(handle.layers.members.getStyle(), new Feature({ code: 'DE' }))
					.getFill()
					?.getColor(),
			).toBe('#aa0000');
			const image = styleOf(
				handle.layers.bubbles.getStyle(),
				bubble as Feature,
			).getImage() as CircleStyle;
			expect(image.getRadius()).toBe(100);
		});

		it('draws the bubble neutral, so colour keeps one meaning', () => {
			const { handle } = setup('regions', null, new Map([['DE', 50]]));
			const bubble = handle.layers.bubbles.getSource()?.getFeatures()[0];
			const image = styleOf(
				handle.layers.bubbles.getStyle(),
				bubble as Feature,
			).getImage() as CircleStyle;

			expect(image.getFill()?.getColor()).toStrictEqual([255, 255, 255, 0.2]);
		});

		it('draws no bubble for a location without a size', () => {
			const { handle } = setup('regions', null, new Map());
			expect(bubbleCodes(handle)).toStrictEqual([]);
		});
	});

	describe('labels', () => {
		const labelOf = (handle: ReturnType<typeof setup>['handle'], code: string) =>
			handle.layers.labels
				.getSource()
				?.getFeatures()
				.find((feature) => feature.get('code') === code) as Feature;
		const styleAt = (
			handle: ReturnType<typeof setup>['handle'],
			feature: Feature,
			resolution: number,
		): Style | undefined =>
			(handle.layers.labels.getStyle() as StyleFunction)(feature, resolution) as
				| Style
				| undefined;

		it('names a shape once it is big enough on screen, and hides it before', () => {
			const { handle } = setup();
			const germany = labelOf(handle, 'DE');

			expect(styleAt(handle, germany, 1)?.getText()?.getText()).toBe('Germany');
			expect(styleAt(handle, germany, 1e6)).toBeUndefined();
		});

		it('gives larger shapes first claim when names collide', () => {
			const { handle } = setup();
			const zIndexOf = (code: string): number | undefined =>
				styleAt(handle, labelOf(handle, code), 1)?.getZIndex();

			expect(zIndexOf('FR')).toBeLessThan(zIndexOf('BE') as number);
		});

		it('hides every label when labels are off', () => {
			const { handle } = setup('regions', null, undefined, false);
			expect(handle.layers.labels.getVisible()).toBe(false);
		});
	});

	describe('on the points layer', () => {
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
			const [small, large] =
				handle.layers.bubbles.getSource()?.getFeatures() ?? [];
			const imageOf = (feature: Feature): CircleStyle =>
				styleOf(
					handle.layers.bubbles.getStyle(),
					feature,
				).getImage() as CircleStyle;

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

	it('outlines the hovered shape', () => {
		const { handle } = setup('regions', 'DE');
		expect(handle.layers.hover.getSource()?.getFeatures()).toHaveLength(1);
	});
});
