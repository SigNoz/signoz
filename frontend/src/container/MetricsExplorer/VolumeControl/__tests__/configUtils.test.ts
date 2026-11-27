import { formatCompact, formatUsd } from '../configUtils';

describe('VolumeControl configUtils', () => {
	describe('formatCompact', () => {
		it('formats values below 1,000 as-is', () => {
			expect(formatCompact(0)).toBe('0');
			expect(formatCompact(42)).toBe('42');
			expect(formatCompact(999)).toBe('999');
		});

		it('formats K, M, and B ranges with one decimal place', () => {
			expect(formatCompact(1_000)).toBe('1.0K');
			expect(formatCompact(1_500_000)).toBe('1.5M');
			expect(formatCompact(2_500_000_000)).toBe('2.5B');
		});

		it('promotes to the next unit when rounding reaches 1,000', () => {
			expect(formatCompact(999_949)).toBe('999.9K');
			expect(formatCompact(999_960)).toBe('1.0M');
			expect(formatCompact(999_949_999)).toBe('999.9M');
			expect(formatCompact(999_960_000)).toBe('1.0B');
		});

		it('stays in B for values at or above 1,000B', () => {
			expect(formatCompact(2_500_000_000_000)).toBe('2500.0B');
		});
	});

	describe('formatUsd', () => {
		it('formats values below $1,000 with two decimals', () => {
			expect(formatUsd(0)).toBe('$0.00');
			expect(formatUsd(12.345)).toBe('$12.35');
			expect(formatUsd(999.99)).toBe('$999.99');
		});

		it('promotes sub-1,000 values when two-decimal rounding hits 1,000', () => {
			expect(formatUsd(999.996)).toBe('$1.0K');
		});

		it('formats USD in K, M, and B and promotes across unit boundaries', () => {
			expect(formatUsd(1_000)).toBe('$1.0K');
			expect(formatUsd(999_960)).toBe('$1.0M');
			expect(formatUsd(2_500_000)).toBe('$2.5M');
			expect(formatUsd(999_960_000)).toBe('$1.0B');
			expect(formatUsd(1_500_000_000)).toBe('$1.5B');
		});
	});
});
