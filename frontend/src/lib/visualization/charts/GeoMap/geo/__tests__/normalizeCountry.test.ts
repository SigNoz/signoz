import { normalizeCountry } from '../normalizeCountry';

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

	it.each([
		['A1'],
		['EU'],
		['ZZ'],
		[''],
		['   '],
		[null],
		[undefined],
		[42],
		['constructor'],
		['toString'],
	])('leaves %p unplaced', (raw) => {
		expect(normalizeCountry(raw)).toBeNull();
	});
});
