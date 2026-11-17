import { createRadiusScale } from '../scales';

describe('createRadiusScale', () => {
	const radius = createRadiusScale([0, 25, 100], [3, 30]);

	it('floors the smallest value at the minimum radius', () => {
		expect(radius(0)).toBe(3);
	});

	it('gives the largest value the maximum radius', () => {
		expect(radius(100)).toBe(30);
	});

	it('grows area, not radius, with the value', () => {
		const area = (value: number): number => radius(value) ** 2 - 3 ** 2;
		expect(area(25) / area(100)).toBeCloseTo(0.25, 6);
	});

	it('sizes negative values by magnitude', () => {
		expect(radius(-100)).toBe(30);
	});

	it('keeps every bubble at the minimum when all values are zero', () => {
		expect(createRadiusScale([0, 0], [3, 30])(0)).toBe(3);
	});
});
