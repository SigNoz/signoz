import {
	ColorRampMode,
	ColorRampPalette,
	ColorRampScale,
} from 'lib/visualization/colorRamp/types';

import { GeoMapDatum } from '../../types';
import { createGeoMapColorResolver } from '../scales';

const data = (...values: number[]): GeoMapDatum[] =>
	values.map((value, index) => ({ code: `C${index}`, value, raw: `C${index}` }));

describe('createGeoMapColorResolver ramp', () => {
	const colors = {
		mode: ColorRampMode.Palette,
		palette: ColorRampPalette.Lava,
		scale: ColorRampScale.Log,
		steps: 8,
		min: null,
		max: null,
		fill: '',
	};

	it('quantises into the requested steps', () => {
		expect(
			createGeoMapColorResolver(data(1, 10), colors, true).ramp,
		).toHaveLength(8);
	});

	it('fades one fill in opacity mode, the default when none is set', () => {
		const opacity = { ...colors, mode: ColorRampMode.Opacity };
		const own = createGeoMapColorResolver(
			data(1, 10),
			{ ...opacity, fill: '#F1575F' },
			true,
		);
		const fallback = createGeoMapColorResolver(data(1, 10), opacity, true);

		expect(own.colorFor(10)).toBe('rgb(241, 87, 95)');
		expect(own.colorFor(1)).not.toBe(own.colorFor(10));
		expect(fallback.colorFor(10)).not.toBe(own.colorFor(10));
	});

	it('colours zero from the ramp, not the panel surface', () => {
		const resolver = createGeoMapColorResolver(data(0, 10), colors, true);
		expect(resolver.colorFor(0)).toBe(resolver.ramp[0]);
	});

	it.each([true, false])(
		'keeps the lowest value off the near-background end (dark mode: %s)',
		(isDarkMode) => {
			const { ramp } = createGeoMapColorResolver(data(1, 10), colors, isDarkMode);
			expect(ramp[0]).not.toMatch(/^#(000004|fcfdbf)$/i);
		},
	);
});
