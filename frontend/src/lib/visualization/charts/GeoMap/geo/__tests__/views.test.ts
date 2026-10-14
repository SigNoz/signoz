import { GeoMapDatum } from '../../types';
import { COUNTRY_BY_ISO2 } from '../countries';
import { getViewBox, isMember, VIEW_PRESETS } from '../views';

const datum = (code: string): GeoMapDatum => ({ code, value: 1, raw: code });

describe('getViewBox', () => {
	it('crops the world at 58°S and 75°N', () => {
		expect(getViewBox('world', [])).toStrictEqual([
			[-180, -58],
			[180, 75],
		]);
	});

	it('frames a region preset by its own box', () => {
		expect(getViewBox('europe', [])).toBe(VIEW_PRESETS.europe.box);
	});

	it('fits data by mainlands, so French Guiana does not drag the frame west', () => {
		const [[west]] = getViewBox('fit', [datum('FR'), datum('DE')]);
		expect(west).toBeGreaterThan(-15);
	});

	it('falls back to the world when there is nothing to fit', () => {
		expect(getViewBox('fit', [])).toBe(VIEW_PRESETS.world.box);
	});

	it('frames the US by its lower 48, since its bounds wrap the antimeridian', () => {
		const [[west, south], [east, north]] = getViewBox('country', [], 'US');
		const us = COUNTRY_BY_ISO2.get('US');
		if (!us) {
			throw new Error('no US outline');
		}
		const [[mWest, mSouth], [mEast, mNorth]] = us.properties.mainland;
		expect([west, south, east, north]).toStrictEqual([
			mWest - 1,
			mSouth - 1,
			mEast + 1,
			mNorth + 1,
		]);
	});

	it('keeps India’s island states in the country frame', () => {
		const [[west], [east]] = getViewBox('country', [], 'IN');
		expect(west).toBeLessThan(72); // Lakshadweep
		expect(east).toBeGreaterThan(93); // Andaman and Nicobar
	});

	it('shows the world for a country view with no country', () => {
		expect(getViewBox('country', [])).toBe(VIEW_PRESETS.world.box);
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
