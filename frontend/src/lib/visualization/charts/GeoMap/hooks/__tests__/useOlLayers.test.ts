import Feature from 'ol/Feature';
import { renderHook } from 'tests/test-utils';

import { GeoMapShapes, getCountryShapes } from '../../geo/shapes';
import { useOlLayers } from '../useOlLayers';
import { OlLayers } from '../useOlMap';
import { createFakeOlMap } from './fakeOlMap';
import { DATA, FILLS, PALETTE, setup, styleOf, VALUES } from './olLayersSetup';

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

	it('clears the previous view while the next one’s shapes are unavailable', () => {
		const fake = createFakeOlMap();
		const { rerender } = renderHook(
			({ shapes }: { shapes: GeoMapShapes | null }) =>
				useOlLayers({
					handle: fake.handle,
					shapes,
					projection: 'mercator',
					data: DATA,
					layer: 'bubbles',
					palette: PALETTE,
					fillFor: (code) => FILLS[code] ?? null,
					sizeByCode: VALUES,
					radiusFor: (size) => size * 2,
					hoveredCode: null,
				}),
			{
				initialProps: {
					shapes: getCountryShapes('europe') as GeoMapShapes | null,
				},
			},
		);
		const count = (layer: keyof OlLayers): number =>
			fake.handle.layers[layer].getSource()?.getFeatures().length ?? 0;
		expect(count('members')).toBeGreaterThan(0);
		expect(count('bubbles')).toBeGreaterThan(0);

		rerender({ shapes: null });

		expect(count('members')).toBe(0);
		expect(count('context')).toBe(0);
		expect(count('labels')).toBe(0);
		expect(count('bubbles')).toBe(0);
	});

	it('outlines the hovered shape', () => {
		const { handle } = setup('regions', 'DE');
		expect(handle.layers.hover.getSource()?.getFeatures()).toHaveLength(1);
	});
});
