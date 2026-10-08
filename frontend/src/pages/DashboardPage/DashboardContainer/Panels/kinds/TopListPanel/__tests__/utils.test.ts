import { getRowHeight } from '../utils';

// Each case: rows that fit at a density, given a 1px gap and 12px of list padding.
describe('getRowHeight', () => {
	it.each([
		{ count: 10, height: 10 * 32 + 9 + 12, expected: 32 },
		{ count: 10, height: 10 * 32 + 9 + 11, expected: 28 },
		{ count: 10, height: 10 * 28 + 9 + 12, expected: 28 },
		{ count: 10, height: 10 * 28 + 9 + 11, expected: 24 },
		{ count: 200, height: 400, expected: 24 },
	])(
		'uses $expected px rows for $count rows in $height px',
		({ count, height, expected }) => {
			expect(getRowHeight(count, height)).toBe(expected);
		},
	);

	it('falls back to the default height before the panel is measured', () => {
		expect(getRowHeight(10, 0)).toBe(28);
	});
});
