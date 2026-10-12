import { isRangeInverted } from '../utils';

describe('isRangeInverted', () => {
	it.each([
		[23, 12, true],
		[12, 23, false],
		[5, 5, false],
		[-10, -20, true],
		[null, 12, false],
		[23, undefined, false],
	])('min %p, max %p → %p', (min, max, expected) => {
		expect(isRangeInverted(min, max)).toBe(expected);
	});
});
