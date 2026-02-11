import { findMinMaxThresholdValues } from '../threshold';

describe('findMinMaxThresholdValues', () => {
	it('returns [null, null] when thresholds array is empty or missing', () => {
		expect(findMinMaxThresholdValues([], 'ms')).toEqual([null, null]);
	});

	it('returns min and max from thresholdValue when units are not provided', () => {
		const thresholds = [
			{ thresholdValue: 5 },
			{ thresholdValue: 1 },
			{ thresholdValue: 10 },
		];

		const [min, max] = findMinMaxThresholdValues(thresholds);

		expect(min).toBe(1);
		expect(max).toBe(10);
	});

	it('ignores thresholds without a value or with unconvertible units', () => {
		const thresholds = [
			// Should be ignored: convertValue returns null for unknown unit
			{ thresholdValue: 100, thresholdUnit: 'unknown-unit' },
			// Should be used
			{ thresholdValue: 4 },
		];

		const [min, max] = findMinMaxThresholdValues(thresholds, 'ms');

		expect(min).toBe(4);
		expect(max).toBe(4);
	});
});
