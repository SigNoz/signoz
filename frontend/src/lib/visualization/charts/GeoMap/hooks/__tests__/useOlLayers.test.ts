import { renderHook } from '@testing-library/react';
import Feature from 'ol/Feature';
import type { StyleFunction } from 'ol/style/Style';
import type CircleStyle from 'ol/style/Circle';
import type Style from 'ol/style/Style';

import { getCountryShapes } from '../../geo/shapes';
import { GeoMapDatum, GeoMapLayer } from '../../types';
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

	it('outlines the hovered shape', () => {
		const { handle } = setup('regions', 'DE');
		expect(handle.layers.hover.getSource()?.getFeatures()).toHaveLength(1);
	});
});
