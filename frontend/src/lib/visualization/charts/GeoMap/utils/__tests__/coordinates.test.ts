import { formatCoordinates } from '../coordinates';

describe('formatCoordinates', () => {
	it.each([
		[48.8566, 2.3522, '48.86° N, 2.35° E'],
		[-33.8688, 151.2093, '33.87° S, 151.21° E'],
		[40.7128, -74.006, '40.71° N, 74.01° W'],
		[0, 0, '0.00° N, 0.00° E'],
	])('formats %p, %p as %p', (lat, lon, expected) => {
		expect(formatCoordinates(lat, lon)).toBe(expected);
	});
});
