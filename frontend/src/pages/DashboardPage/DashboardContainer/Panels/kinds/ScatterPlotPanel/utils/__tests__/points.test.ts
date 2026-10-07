import {
	DEFAULT_POINTS,
	resolvePointOpacity,
	resolvePointSize,
} from '../points';

describe('scatter plot points', () => {
	it('draws unset points at the defaults', () => {
		expect(resolvePointSize(undefined)).toStrictEqual({
			fixed: DEFAULT_POINTS.size,
			min: DEFAULT_POINTS.minSize,
			max: DEFAULT_POINTS.maxSize,
		});
		expect(resolvePointOpacity(undefined)).toBe(DEFAULT_POINTS.opacity);
	});

	it('takes each set field and defaults the rest, null included', () => {
		expect(
			resolvePointSize({ size: 10, minSize: null, maxSize: 30 }),
		).toStrictEqual({ fixed: 10, min: DEFAULT_POINTS.minSize, max: 30 });
		expect(resolvePointOpacity({ opacity: 0.1 })).toBe(0.1);
	});
});
