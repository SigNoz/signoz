import { isOrderParams } from './utils';

describe('Error utils', () => {
	test('Valid OrderBy Params', () => {
		expect(isOrderParams('serviceName')).toBe(true);
		expect(isOrderParams('exceptionCount')).toBe(true);
		expect(isOrderParams('lastSeen')).toBe(true);
		expect(isOrderParams('firstSeen')).toBe(true);
		expect(isOrderParams('exceptionType')).toBe(true);
	});

	test('Invalid OrderBy Params', () => {
		expect(isOrderParams('invalid')).toBe(false);
		expect(isOrderParams(null)).toBe(false);
		expect(isOrderParams('')).toBe(false);
	});
});
