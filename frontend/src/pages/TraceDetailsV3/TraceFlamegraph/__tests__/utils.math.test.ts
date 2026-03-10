import {
	clamp,
	findSpanById,
	formatDuration,
	getFlamegraphRowMetrics,
} from '../utils';
import { MOCK_SPANS } from './testUtils';

jest.mock('container/TraceDetail/utils', () => ({
	convertTimeToRelevantUnit: (
		valueMs: number,
	): { time: number; timeUnitName: string } => {
		if (valueMs === 0) {
			return { time: 0, timeUnitName: 'ms' };
		}
		if (valueMs < 1) {
			return { time: valueMs, timeUnitName: 'ms' };
		}
		if (valueMs < 1000) {
			return { time: valueMs, timeUnitName: 'ms' };
		}
		if (valueMs < 60_000) {
			return { time: valueMs / 1000, timeUnitName: 's' };
		}
		if (valueMs < 3_600_000) {
			return { time: valueMs / 60_000, timeUnitName: 'm' };
		}
		return { time: valueMs / 3_600_000, timeUnitName: 'hr' };
	},
}));

describe('Pure Math and Data Utils', () => {
	describe('clamp', () => {
		it('returns value when within range', () => {
			expect(clamp(5, 0, 10)).toBe(5);
			expect(clamp(-3, -5, 5)).toBe(-3);
		});

		it('returns min when value is below min', () => {
			expect(clamp(-1, 0, 10)).toBe(0);
			expect(clamp(2, 5, 10)).toBe(5);
		});

		it('returns max when value is above max', () => {
			expect(clamp(11, 0, 10)).toBe(10);
			expect(clamp(100, 0, 50)).toBe(50);
		});

		it('handles min === max', () => {
			expect(clamp(5, 7, 7)).toBe(7);
			expect(clamp(7, 7, 7)).toBe(7);
		});
	});

	describe('findSpanById', () => {
		it('finds span in first level', () => {
			const result = findSpanById(MOCK_SPANS, 'root');
			expect(result).not.toBeNull();
			expect(result?.span.spanId).toBe('root');
			expect(result?.levelIndex).toBe(0);
		});

		it('finds span in nested level', () => {
			const result = findSpanById(MOCK_SPANS, 'grandchild');
			expect(result).not.toBeNull();
			expect(result?.span.spanId).toBe('grandchild');
			expect(result?.levelIndex).toBe(2);
		});

		it('returns null when span not found', () => {
			expect(findSpanById(MOCK_SPANS, 'nonexistent')).toBeNull();
		});

		it('handles empty spans', () => {
			expect(findSpanById([], 'root')).toBeNull();
			expect(findSpanById([[], []], 'root')).toBeNull();
		});
	});

	describe('getFlamegraphRowMetrics', () => {
		it('computes normal row height metrics (24px)', () => {
			const m = getFlamegraphRowMetrics(24);
			expect(m.ROW_HEIGHT).toBe(24);
			expect(m.SPAN_BAR_HEIGHT).toBe(22);
			expect(m.SPAN_BAR_Y_OFFSET).toBe(1);
			expect(m.EVENT_DOT_SIZE).toBe(6);
		});

		it('clamps span bar height to max for large row heights', () => {
			const m = getFlamegraphRowMetrics(100);
			expect(m.SPAN_BAR_HEIGHT).toBe(22);
			expect(m.SPAN_BAR_Y_OFFSET).toBe(39);
		});

		it('clamps span bar height to min for small row heights', () => {
			const m = getFlamegraphRowMetrics(6);
			expect(m.SPAN_BAR_HEIGHT).toBe(8);
			// spanBarYOffset = floor((6-8)/2) = -1 when bar exceeds row height
			expect(m.SPAN_BAR_Y_OFFSET).toBe(-1);
		});

		it('clamps event dot size within min/max', () => {
			const mSmall = getFlamegraphRowMetrics(6);
			expect(mSmall.EVENT_DOT_SIZE).toBe(4);

			const mLarge = getFlamegraphRowMetrics(24);
			expect(mLarge.EVENT_DOT_SIZE).toBe(6);
		});
	});

	describe('formatDuration', () => {
		it('formats nanos as ms', () => {
			// 1e6 nanos = 1ms
			expect(formatDuration(1_000_000)).toBe('1ms');
		});

		it('formats larger durations as s/m/hr', () => {
			// 2e9 nanos = 2000ms = 2s
			expect(formatDuration(2_000_000_000)).toBe('2s');
		});

		it('formats zero duration', () => {
			expect(formatDuration(0)).toBe('0ms');
		});

		it('formats very small values', () => {
			// 1000 nanos = 0.001ms → mock returns { time: 0.001, timeUnitName: 'ms' }
			expect(formatDuration(1000)).toBe('0ms');
		});

		it('formats decimal seconds correctly', () => {
			expect(formatDuration(1_500_000_000)).toBe('1.5s');
		});
	});
});
