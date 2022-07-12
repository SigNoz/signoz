import { isOrder, isOrderParams } from './utils';

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

	test('Valid Order', () => {
		expect(isOrder('ascending')).toBe(true);
		expect(isOrder('descending')).toBe(true);
	});

	test('Invalid Order', () => {
		expect(isOrder('invalid')).toBe(false);
		expect(isOrder(null)).toBe(false);
		expect(isOrder('')).toBe(false);
	});
});
