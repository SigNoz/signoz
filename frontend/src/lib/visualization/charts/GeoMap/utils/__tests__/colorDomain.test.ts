import { getRampBottom } from 'lib/visualization/colorRamp/colorScale';
import {
	ColorRampMode,
	ColorRampPalette,
	ColorRampScale,
} from 'lib/visualization/colorRamp/types';

import { GeoMapDatum } from '../../types';
import { createGeoMapColorResolver } from '../scales';

const data = (...values: number[]): GeoMapDatum[] =>
	values.map((value, index) => ({ code: `C${index}`, value, raw: `C${index}` }));

describe('createGeoMapColorResolver domain', () => {
	const colors = {
		mode: ColorRampMode.Palette,
		palette: ColorRampPalette.Lava,
		scale: ColorRampScale.Log,
		steps: 8,
		min: null,
		max: null,
		fill: '',
	};

	it('spans the data, starting a log ramp at its floor', () => {
		const resolver = createGeoMapColorResolver(data(0.5, 20, 400), colors, true);
		expect(resolver.domain.max).toBe(400);
		expect(getRampBottom(resolver.domain, colors.scale)).toBe(0.5);
	});

	it('honours an explicit clamp', () => {
		const resolver = createGeoMapColorResolver(
			data(1, 1000),
			{ ...colors, min: 10, max: 100 },
			true,
		);
		expect(resolver.domain).toMatchObject({ min: 10, max: 100 });
	});

	it('spreads negative values over the ramp instead of the bottom colour', () => {
		const linear = { ...colors, scale: ColorRampScale.Linear };
		const resolver = createGeoMapColorResolver(data(-40, -20, 0), linear, true);
		expect(resolver.domain).toMatchObject({ min: -40, max: 0 });
		expect(resolver.colorFor(-20)).not.toBe(resolver.colorFor(-40));
	});
});
