import { normalizeSubdivision } from '../normalizeSubdivision';
import { loadSubdivisions, SubdivisionSet } from '../subdivisions';

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
		expect(normalizeSubdivision(india, 'IN', 'Punjab')).toBe('IN-PB');
	});

	it.each([['ZZ'], [''], [null], [undefined], ['constructor'], ['toString']])(
		'leaves %p unplaced',
		(region) => {
			expect(normalizeSubdivision(us, 'US', region)).toBeNull();
		},
	);
});
