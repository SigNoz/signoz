import { get as getProjection, fromLonLat, toLonLat } from 'ol/proj';

import { toOlProjection } from '../olProjections';

describe('toOlProjection', () => {
	it('keeps Mercator on Web Mercator', () => {
		expect(toOlProjection('mercator')).toBe('EPSG:3857');
	});

	it.each(['equal_earth', 'natural_earth'] as const)(
		'registers %s once, round-tripping lon/lat',
		(projection) => {
			const code = toOlProjection(projection);
			expect(toOlProjection(projection)).toBe(code);
			expect(getProjection(code)?.getUnits()).toBe('m');

			const [lon, lat] = toLonLat(fromLonLat([139.7, 35.7], code), code);
			expect(lon).toBeCloseTo(139.7, 6);
			expect(lat).toBeCloseTo(35.7, 6);
		},
	);
});
