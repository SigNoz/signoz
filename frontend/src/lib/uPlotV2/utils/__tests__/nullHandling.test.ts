import { nullToUndefThreshold } from '../nullHandling';

describe('nullToUndefThreshold', () => {
	it('converts short null gaps to undefined', () => {
		const xs = [0, 10, 20, 30, 40];
		const ys: Array<number | null | undefined> = [1, null, null, 2, 3];

		const result = nullToUndefThreshold(xs, ys, 25);

		expect(result).toEqual([1, undefined, undefined, 2, 3]);
	});

	it('keeps long null gaps as null', () => {
		const xs = [0, 10, 100, 200];
		const ys: Array<number | null | undefined> = [1, null, null, 2];

		const result = nullToUndefThreshold(xs, ys, 50);

		expect(result).toEqual([1, null, null, 2]);
	});

	it('leaves leading and trailing nulls as-is', () => {
		const xs = [0, 10, 20, 30];
		const ys: Array<number | null | undefined> = [null, null, 1, null];

		const result = nullToUndefThreshold(xs, ys, 50);

		expect(result).toEqual([null, null, 1, null]);
	});

	it('is a no-op when there are no nulls', () => {
		const xs = [0, 10, 20];
		const ys: Array<number | null | undefined> = [1, 2, 3];

		const result = nullToUndefThreshold(xs, ys, 50);

		expect(result).toEqual([1, 2, 3]);
	});
});
