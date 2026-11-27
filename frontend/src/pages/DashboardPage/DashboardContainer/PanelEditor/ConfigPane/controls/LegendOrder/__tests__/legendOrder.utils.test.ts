import { setSeriesOrder } from '../legendOrder.utils';

describe('setSeriesOrder', () => {
	it('adds an index without mutating the input', () => {
		const value = { a: 1 };

		expect(setSeriesOrder(value, 'b', -2)).toStrictEqual({ a: 1, b: -2 });
		expect(value).toStrictEqual({ a: 1 });
	});

	it('starts a record when there is none', () => {
		expect(setSeriesOrder(undefined, 'a', 3)).toStrictEqual({ a: 3 });
		expect(setSeriesOrder(null, 'a', 3)).toStrictEqual({ a: 3 });
	});

	it('drops the entry when the input is cleared', () => {
		expect(setSeriesOrder({ a: 1, b: 2 }, 'a', null)).toStrictEqual({ b: 2 });
	});

	it('truncates a fractional index to an integer', () => {
		expect(setSeriesOrder({}, 'a', 2.7)).toStrictEqual({ a: 2 });
		expect(setSeriesOrder({}, 'a', -1.5)).toStrictEqual({ a: -1 });
	});
});
