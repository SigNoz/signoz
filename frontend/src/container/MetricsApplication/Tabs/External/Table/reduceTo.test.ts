/* eslint-disable sonarjs/no-duplicate-string */
import {
	avg,
	latest,
	max,
	min,
	p50,
	p90,
	p95,
	p99,
	quantile,
} from './reduceTo';

describe('min', () => {
	it('should throw an error if the array is empty', () => {
		expect(() => min([])).toThrowError();
	});

	it('should return the minimum', () => {
		expect(min([-1])).toBe(-1);
		expect(min([1, 3, 2])).toBe(1);
	});

	it('should handle big arrays', () => {
		const ns = Array.from(Array(1_000_000)).map((_, i) => i - 42);
		expect(min(ns)).toBe(-42);
	});
});

describe('max', () => {
	it('should throw an error if the array is empty', () => {
		expect(() => max([])).toThrowError();
	});

	it('should return the maximum', () => {
		expect(max([1])).toBe(1);
		expect(max([1, 3, 2])).toBe(3);
	});

	it('should handle big arrays', () => {
		const ns = Array.from(Array(1_000_000)).map((_, i) => i - 42);
		expect(max(ns)).toBe(999_957);
	});
});

describe('avg', () => {
	it('should throw an error if the array is empty', () => {
		expect(() => avg([])).toThrowError();
	});

	it('should return the average', () => {
		expect(avg([1])).toBe(1);
		expect(avg([1, 3, 2])).toBe(2);
	});

	it('should handle big arrays', () => {
		const ns = Array.from(Array(1_000_000)).map((_, i) => i - 42);
		expect(avg(ns)).toBe(499_957.5);
	});
});

describe('quantile', () => {
	it('should throw an error if the array is empty', () => {
		expect(() => quantile([], 0.5)).toThrowError();
	});

	it('should throw an error if the quantile is not between 0 and 1', () => {
		expect(() => quantile([1], -1)).toThrowError();
		expect(() => quantile([1], 2)).toThrowError();
	});

	it('should return the quantile', () => {
		expect(quantile([1], 0.5)).toBe(1);
		expect(quantile([1, 3, 2], 0.5)).toBe(2);
		expect(quantile([1, 3, 2, 2443, 43], 0.1)).toBeCloseTo(1.4);

		const ns = Array.from(Array(1_000)).map((_, i) => i - 42);
		expect(quantile(ns, 0.1)).toBeCloseTo(57.9);
		expect(quantile(ns, 0.2)).toBeCloseTo(157.8);
		expect(quantile(ns, 0.3)).toBeCloseTo(257.7);
		expect(quantile(ns, 0.4)).toBeCloseTo(357.6);
		expect(quantile(ns, 0.5)).toBeCloseTo(457.5);
		expect(quantile(ns, 0.6)).toBeCloseTo(557.4);
		expect(quantile(ns, 0.7)).toBeCloseTo(657.3);
		expect(quantile(ns, 0.8)).toBeCloseTo(757.2);
		expect(quantile(ns, 0.9)).toBeCloseTo(857.1);
		expect(quantile(ns, 0.95)).toBeCloseTo(907.05);
		expect(quantile(ns, 0.99)).toBeCloseTo(947.01);
		expect(quantile(ns, 1)).toBeCloseTo(957);
	});

	it('should handle big arrays', () => {
		const ns = Array.from(Array(1_000_000)).map((_, i) => i - 42);
		expect(quantile(ns, 0.8)).toBeCloseTo(799957.2);
	});
});

describe('p50', () => {
	it('should return the 50th percentile', () => {
		expect(p50([1])).toBe(1);
		expect(p50([1, 3, 2])).toBe(2);
		expect(p50([1, 3, 2, 2443, 43])).toBe(3);
	});
});

describe('p90', () => {
	it('should return the 90th percentile', () => {
		expect(p90([1])).toBe(1);
		expect(p90([1, 3, 2])).toBeCloseTo(2.8);
		expect(p90([1, 3, 2, 2443, 43])).toBeCloseTo(1483);
	});
});

describe('p95', () => {
	it('should return the 95th percentile', () => {
		expect(p95([1])).toBe(1);
		expect(p95([1, 3, 2])).toBe(2.9);
		expect(p95([1, 3, 2, 2443, 43])).toBeCloseTo(1962.9999);
	});
});

describe('p99', () => {
	it('should return the 99th percentile', () => {
		expect(p99([1])).toBe(1);
		expect(p99([1, 3, 2])).toBe(2.98);
		expect(p99([1, 3, 2, 2443, 43])).toBeCloseTo(2346.9999);
	});
});

describe('latest', () => {
	it('should throw an error if the array is empty', () => {
		expect(() => latest([])).toThrowError();
	});

	it('should return the latest value', () => {
		expect(latest([1])).toBe(1);
		expect(latest([1, 3, 2])).toBe(2);
		expect(latest([1, 3, 2, 2443, 43])).toBe(43);
	});
});
