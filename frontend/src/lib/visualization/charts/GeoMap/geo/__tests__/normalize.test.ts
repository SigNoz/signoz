import { normalizeCountry } from '../normalizeCountry';
import { SubdivisionCountry } from '../../types';
import { normalizeSubdivision } from '../normalizeSubdivision';
import { getSubdivisionShapes } from '../shapes';
import { loadSubdivisions, SubdivisionSet } from '../subdivisions';

describe('normalizeCountry', () => {
	it.each([
		['DE', 'DE'],
		[' de ', 'DE'],
		['us', 'US'],
	])('reads alpha-2 %p in any case or padding', (raw, expected) => {
		expect(normalizeCountry(raw)).toBe(expected);
	});

	it.each([
		['DEU', 'DE'],
		['usa', 'US'],
		['IND', 'IN'],
	])('maps alpha-3 %p', (raw, expected) => {
		expect(normalizeCountry(raw)).toBe(expected);
	});

	it.each([
		['Brazil', 'BR'],
		['united states of america', 'US'],
		['Czech Republic', 'CZ'],
	])('maps English name %p', (raw, expected) => {
		expect(normalizeCountry(raw)).toBe(expected);
	});

	it.each([
		['UK', 'GB'],
		['GF', 'FR'],
		['SU', 'RU'],
		['XK', 'XK'],
	])('resolves territory and retired code %p', (raw, expected) => {
		expect(normalizeCountry(raw)).toBe(expected);
	});

	it.each([['A1'], ['EU'], ['ZZ'], [''], ['   '], [null], [undefined], [42]])(
		'leaves %p unplaced',
		(raw) => {
			expect(normalizeCountry(raw)).toBeNull();
		},
	);
});

describe('normalizeSubdivision', () => {
	let us: SubdivisionSet;
	let india: SubdivisionSet;

	beforeAll(async () => {
		us = await loadSubdivisions('US');
		india = await loadSubdivisions('IN');
	});

	it('joins a bare GeoIP region code with its country column', () => {
		expect(normalizeSubdivision(us, 'US', 'CA')).toBe('US-CA');
		expect(normalizeSubdivision(us, 'United States', 'tx')).toBe('US-TX');
	});

	it('assumes the viewed country when there is no country column', () => {
		expect(normalizeSubdivision(us, null, 'NY')).toBe('US-NY');
	});

	it('reads a full ISO 3166-2 code', () => {
		expect(normalizeSubdivision(us, null, 'us-ny')).toBe('US-NY');
	});

	it('maps an English name', () => {
		expect(normalizeSubdivision(us, 'US', 'Texas')).toBe('US-TX');
		expect(normalizeSubdivision(india, 'IN', 'kerala')).toBe('IN-KL');
	});

	it.each([
		['TS', 'IN-TG'],
		['UK', 'IN-UT'],
		['CG', 'IN-CT'],
	])('resolves India’s newer code %p to the shape’s %p', (region, expected) => {
		expect(normalizeSubdivision(india, 'IN', region)).toBe(expected);
	});

	// The OpenTelemetry geoipprocessor reports MaxMind's most specific subdivision.
	it.each([
		['FR', '75', 'FR-75'],
		['IT', 'MI', 'IT-MI'],
		['ES', 'M', 'ES-M'],
		['GB', 'WSM', 'GB-WSM'],
		['IE', 'D', 'IE-D'],
		['BE', 'VAN', 'BE-VAN'],
	])(
		'places %s’s most specific region %p as %p',
		async (country, region, expected) => {
			const set = await loadSubdivisions(country as SubdivisionCountry);
			expect(normalizeSubdivision(set, country, region)).toBe(expected);
		},
	);

	it('places Northern Ireland’s 2015 councils, and their retired districts', async () => {
		const gb = await loadSubdivisions('GB');
		expect(normalizeSubdivision(gb, 'GB', 'ABC')).toBe('GB-ABC');
		expect(normalizeSubdivision(gb, 'GB', 'ARM')).toBe('GB-ABC');
		expect(getSubdivisionShapes(gb).nameOf('GB-ABC')).toBe(
			'Armagh City, Banbridge and Craigavon',
		);
	});

	it('places Metro Manila by its current region code', async () => {
		const ph = await loadSubdivisions('PH');
		expect(normalizeSubdivision(ph, 'PH', '00')).toBe('PH-MNL');
	});

	it('refuses a region of another country', () => {
		expect(normalizeSubdivision(us, 'CA', 'ON')).toBeNull();
		expect(normalizeSubdivision(us, null, 'IN-MH')).toBeNull();
	});

	it.each([['ZZ'], [''], [null], [undefined]])(
		'leaves %p unplaced',
		(region) => {
			expect(normalizeSubdivision(us, 'US', region)).toBeNull();
		},
	);
});
