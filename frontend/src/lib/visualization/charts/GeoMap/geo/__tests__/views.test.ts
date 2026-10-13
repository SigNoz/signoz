import { geoBounds } from 'd3-geo';

import { GeoMapDatum } from '../../types';
import { COUNTRY_BY_ISO2 } from '../countries';
import { getGeoMapFit, isMember } from '../views';

const datum = (code: string): GeoMapDatum => ({ code, value: 1, raw: code });

const lonRange = (view: Parameters<typeof getGeoMapFit>): [number, number] => {
	const [[west], [east]] = geoBounds(getGeoMapFit(...view).object);
	return [west, east];
};

describe('getGeoMapFit', () => {
	it('frames the world in Mercator, centred so Chukotka stays with Russia', () => {
		const fit = getGeoMapFit('world', []);
		expect(fit.projection).toBe('mercator');
		expect(fit.rotate).toStrictEqual([-10, 0]);
	});

	it('crops the world at 58°S and 75°N', () => {
		const [[, south], [, north]] = geoBounds(getGeoMapFit('world', []).object);
		expect(south).toBeCloseTo(-58, 0);
		expect(north).toBeCloseTo(75, 0);
	});

	it('fits a region preset to its own box', () => {
		const [west, east] = lonRange(['europe', []]);
		expect(west).toBeCloseTo(-25, 0);
		expect(east).toBeCloseTo(45, 0);
	});

	it('fits data by mainlands, so French Guiana does not drag the frame west', () => {
		const [west] = lonRange(['fit', [datum('FR'), datum('DE')]]);
		expect(west).toBeGreaterThan(-15);
	});

	it('falls back to the world when there is nothing to fit', () => {
		expect(getGeoMapFit('fit', []).rotate).toStrictEqual([-10, 0]);
	});

	it('draws the US with Albers USA, fitted to the country itself', () => {
		const fit = getGeoMapFit('country', [], 'US');
		expect(fit.projection).toBe('albersUsa');
		expect(fit.object).toBe(COUNTRY_BY_ISO2.get('US'));
	});

	it('keeps India’s island states in the country frame', () => {
		const fit = getGeoMapFit('country', [], 'IN');
		const [west, east] = lonRange(['country', [], 'IN']);
		expect(fit.projection).toBe('mercator');
		expect(west).toBeLessThan(72); // Lakshadweep
		expect(east).toBeGreaterThan(93); // Andaman and Nicobar
	});

	it('shows the world for a country view with no country', () => {
		expect(getGeoMapFit('country', []).projection).toBe('mercator');
		expect(getGeoMapFit('country', []).rotate).toStrictEqual([-10, 0]);
	});
});

describe('isMember', () => {
	const country = (
		code: string,
	): NonNullable<ReturnType<typeof COUNTRY_BY_ISO2.get>> =>
		COUNTRY_BY_ISO2.get(code) as NonNullable<
			ReturnType<typeof COUNTRY_BY_ISO2.get>
		>;

	it('counts every country on the world and fit views', () => {
		expect(isMember(country('FJ'), 'world')).toBe(true);
		expect(isMember(country('FJ'), 'fit')).toBe(true);
	});

	it('puts transcontinental countries in both regions', () => {
		expect(isMember(country('TR'), 'europe')).toBe(true);
		expect(isMember(country('TR'), 'asia')).toBe(true);
		expect(isMember(country('RU'), 'europe')).toBe(true);
	});

	it('leaves neighbours outside a region', () => {
		expect(isMember(country('MA'), 'europe')).toBe(false);
	});
});
