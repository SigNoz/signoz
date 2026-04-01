import { act, renderHook } from '@testing-library/react';
import { DEFAULT_TIME_RANGE } from 'container/TopNav/DateTimeSelectionV2/constants';

import { useGlobalTimeStore } from '../globalTimeStore';
import { GlobalTimeSelectedTime } from '../types';
import { createCustomTimeRange, NANO_SECOND_MULTIPLIER } from '../utils';

describe('globalTimeStore', () => {
	beforeEach(() => {
		const { result } = renderHook(() => useGlobalTimeStore());
		act(() => {
			result.current.setSelectedTime(DEFAULT_TIME_RANGE, 0);
		});
	});

	describe('initial state', () => {
		it(`should have default selectedTime of ${DEFAULT_TIME_RANGE}`, () => {
			const { result } = renderHook(() => useGlobalTimeStore());
			expect(result.current.selectedTime).toBe(DEFAULT_TIME_RANGE);
		});

		it('should have isRefreshEnabled as false by default', () => {
			const { result } = renderHook(() => useGlobalTimeStore());
			expect(result.current.isRefreshEnabled).toBe(false);
		});

		it('should have refreshInterval as 0 by default', () => {
			const { result } = renderHook(() => useGlobalTimeStore());
			expect(result.current.refreshInterval).toBe(0);
		});
	});

	describe('setSelectedTime', () => {
		it('should update selectedTime', () => {
			const { result } = renderHook(() => useGlobalTimeStore());

			act(() => {
				result.current.setSelectedTime('15m');
			});

			expect(result.current.selectedTime).toBe('15m');
		});

		it('should update refreshInterval when provided', () => {
			const { result } = renderHook(() => useGlobalTimeStore());

			act(() => {
				result.current.setSelectedTime('15m', 5000);
			});

			expect(result.current.refreshInterval).toBe(5000);
		});

		it('should keep existing refreshInterval when not provided', () => {
			const { result } = renderHook(() => useGlobalTimeStore());

			act(() => {
				result.current.setSelectedTime('15m', 5000);
			});

			act(() => {
				result.current.setSelectedTime('1h');
			});

			expect(result.current.refreshInterval).toBe(5000);
		});

		it('should enable refresh for relative time with refreshInterval > 0', () => {
			const { result } = renderHook(() => useGlobalTimeStore());

			act(() => {
				result.current.setSelectedTime('15m', 5000);
			});

			expect(result.current.isRefreshEnabled).toBe(true);
		});

		it('should disable refresh for relative time with refreshInterval = 0', () => {
			const { result } = renderHook(() => useGlobalTimeStore());

			act(() => {
				result.current.setSelectedTime('15m', 0);
			});

			expect(result.current.isRefreshEnabled).toBe(false);
		});

		it('should disable refresh for custom time range even with refreshInterval > 0', () => {
			const { result } = renderHook(() => useGlobalTimeStore());
			const customTime = createCustomTimeRange(1000000000, 2000000000);

			act(() => {
				result.current.setSelectedTime(customTime, 5000);
			});

			expect(result.current.isRefreshEnabled).toBe(false);
			expect(result.current.refreshInterval).toBe(5000);
		});

		it('should handle various relative time formats', () => {
			const { result } = renderHook(() => useGlobalTimeStore());
			const timeFormats: GlobalTimeSelectedTime[] = [
				'1m',
				'5m',
				'15m',
				'30m',
				'1h',
				'3h',
				'6h',
				'1d',
				'1w',
			];

			timeFormats.forEach((time) => {
				act(() => {
					result.current.setSelectedTime(time, 10000);
				});

				expect(result.current.selectedTime).toBe(time);
				expect(result.current.isRefreshEnabled).toBe(true);
			});
		});
	});

	describe('getMinMaxTime', () => {
		beforeEach(() => {
			jest.useFakeTimers();
			jest.setSystemTime(new Date('2024-01-15T12:00:00.000Z'));
		});

		afterEach(() => {
			jest.useRealTimers();
		});

		it('should return min/max time for custom time range', () => {
			const { result } = renderHook(() => useGlobalTimeStore());
			const minTime = 1000000000;
			const maxTime = 2000000000;
			const customTime = createCustomTimeRange(minTime, maxTime);

			act(() => {
				result.current.setSelectedTime(customTime);
			});

			const {
				minTime: resultMin,
				maxTime: resultMax,
			} = result.current.getMinMaxTime();
			expect(resultMin).toBe(minTime);
			expect(resultMax).toBe(maxTime);
		});

		it('should compute fresh min/max time for relative time', () => {
			const { result } = renderHook(() => useGlobalTimeStore());

			act(() => {
				result.current.setSelectedTime('15m');
			});

			const { minTime, maxTime } = result.current.getMinMaxTime();
			const now = Date.now() * NANO_SECOND_MULTIPLIER;
			const fifteenMinutesNs = 15 * 60 * 1000 * NANO_SECOND_MULTIPLIER;

			expect(maxTime).toBe(now);
			expect(minTime).toBe(now - fifteenMinutesNs);
		});

		it('should return different values on subsequent calls for relative time', () => {
			const { result } = renderHook(() => useGlobalTimeStore());

			act(() => {
				result.current.setSelectedTime('15m');
			});

			const first = result.current.getMinMaxTime();

			// Advance time by 1 second
			act(() => {
				jest.advanceTimersByTime(1000);
			});

			const second = result.current.getMinMaxTime();

			// maxTime should be different (1 second later)
			expect(second.maxTime).toBe(first.maxTime + 1000 * NANO_SECOND_MULTIPLIER);
			expect(second.minTime).toBe(first.minTime + 1000 * NANO_SECOND_MULTIPLIER);
		});
	});

	describe('store isolation', () => {
		it('should share state between multiple hook instances', () => {
			const { result: result1 } = renderHook(() => useGlobalTimeStore());
			const { result: result2 } = renderHook(() => useGlobalTimeStore());

			act(() => {
				result1.current.setSelectedTime('1h', 10000);
			});

			expect(result2.current.selectedTime).toBe('1h');
			expect(result2.current.refreshInterval).toBe(10000);
			expect(result2.current.isRefreshEnabled).toBe(true);
		});
	});
});
