import Feature from 'ol/Feature';
import type CircleStyle from 'ol/style/Circle';

import { PALETTE, setup, SetupHandle, styleOf } from './olLayersSetup';

const bubbleCodes = (handle: SetupHandle): unknown[] =>
	handle.layers.bubbles
		.getSource()
		?.getFeatures()
		.map((feature) => feature.get('code')) ?? [];

describe('useOlLayers bubbles', () => {
	it('draws a bubble per value in view, with neutral shapes behind', () => {
		const { handle } = setup('bubbles');

		expect(bubbleCodes(handle)).toStrictEqual(['DE']);
		expect(
			styleOf(handle.layers.members.getStyle(), new Feature({ code: 'DE' }))
				.getFill()
				?.getColor(),
		).toBe(PALETTE.noData);
	});

	describe('with a size metric on the regions layer', () => {
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
});
