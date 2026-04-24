import { act, renderHook } from '@testing-library/react';
import { ReactNode } from 'react';
import { DEFAULT_TIME_RANGE } from 'container/TopNav/DateTimeSelectionV2/constants';

import { createGlobalTimeStore, useGlobalTimeStore } from '../globalTimeStore';
import { GlobalTimeContext } from '../GlobalTimeContext';
import { useGlobalTime } from '../hooks';
import { GlobalTimeSelectedTime, GlobalTimeState } from '../types';
import { createCustomTimeRange, NANO_SECOND_MULTIPLIER } from '../utils';

/**
 * Creates an isolated store wrapper for testing.
 * Each test gets its own store instance, avoiding test pollution.
 */
function createIsolatedWrapper(
	initialState?: Partial<GlobalTimeState>,
): ({ children }: { children: ReactNode }) => JSX.Element {
	const store = createGlobalTimeStore(initialState);
	return function Wrapper({ children }: { children: ReactNode }): JSX.Element {
		return (
			<GlobalTimeContext.Provider value={store}>
				{children}
			</GlobalTimeContext.Provider>
		);
	};
}

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

		it('should have lastRefreshTimestamp as 0 by default', () => {
			const { result } = renderHook(() => useGlobalTimeStore());
			expect(result.current.lastRefreshTimestamp).toBe(0);
		});

		it('should have lastComputedMinMax with default values', () => {
			const { result } = renderHook(() => useGlobalTimeStore());
			expect(result.current.lastComputedMinMax).toStrictEqual({
				minTime: 0,
				maxTime: 0,
			});
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

		it('should reset lastComputedMinMax when selectedTime changes', () => {
			const wrapper = createIsolatedWrapper({
				selectedTime: '15m',
				refreshInterval: 5000,
			});
			const { result } = renderHook(() => useGlobalTime(), { wrapper });

			// Compute and store initial values
			act(() => {
				result.current.computeAndStoreMinMax();
			});

			// Verify we have cached values
			expect(result.current.lastComputedMinMax.maxTime).toBeGreaterThan(0);

			// Now switch to a custom time range
			const customTime = createCustomTimeRange(1000000000, 2000000000);
			act(() => {
				result.current.setSelectedTime(customTime);
			});

			// lastComputedMinMax should be reset
			expect(result.current.lastComputedMinMax).toStrictEqual({
				minTime: 0,
				maxTime: 0,
			});
		});

		it('should return fresh custom time values after switching from relative time', () => {
			jest.useFakeTimers();
			jest.setSystemTime(new Date('2024-01-15T12:00:00.000Z'));

			const wrapper = createIsolatedWrapper({
				selectedTime: '15m',
				refreshInterval: 5000,
			});
			const { result } = renderHook(() => useGlobalTime(), { wrapper });

			// Compute and cache values for relative time
			act(() => {
				result.current.computeAndStoreMinMax();
			});

			const relativeMinMax = { ...result.current.lastComputedMinMax };

			// Switch to custom time range
			const customMinTime = 5000000000;
			const customMaxTime = 6000000000;
			const customTime = createCustomTimeRange(customMinTime, customMaxTime);

			act(() => {
				result.current.setSelectedTime(customTime);
			});

			// getMinMaxTime should return the custom time values, not cached relative values
			const returned = result.current.getMinMaxTime();

			expect(returned.minTime).toBe(customMinTime);
			expect(returned.maxTime).toBe(customMaxTime);
			expect(returned).not.toStrictEqual(relativeMinMax);

			jest.useRealTimers();
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

			const { minTime: resultMin, maxTime: resultMax } =
				result.current.getMinMaxTime();
			expect(resultMin).toBe(minTime);
			expect(resultMax).toBe(maxTime);
		});

		it('should NOT round custom time range values to minute boundaries', () => {
			const { result } = renderHook(() => useGlobalTimeStore());
			// Use timestamps that are NOT on minute boundaries (12:30:45.123)
			// If rounding occurred, these would change to 12:30:00.000
			const minTimeWithSeconds =
				new Date('2024-01-15T12:15:45.123Z').getTime() * NANO_SECOND_MULTIPLIER;
			const maxTimeWithSeconds =
				new Date('2024-01-15T12:30:45.123Z').getTime() * NANO_SECOND_MULTIPLIER;

			// What the values would be if rounded down to minute boundary
			const minTimeRounded =
				new Date('2024-01-15T12:15:00.000Z').getTime() * NANO_SECOND_MULTIPLIER;
			const maxTimeRounded =
				new Date('2024-01-15T12:30:00.000Z').getTime() * NANO_SECOND_MULTIPLIER;

			const customTime = createCustomTimeRange(
				minTimeWithSeconds,
				maxTimeWithSeconds,
			);

			act(() => {
				result.current.setSelectedTime(customTime);
			});

			const { minTime, maxTime } = result.current.getMinMaxTime();

			// Should return exact values, NOT rounded values
			expect(minTime).toBe(minTimeWithSeconds);
			expect(maxTime).toBe(maxTimeWithSeconds);
			expect(minTime).not.toBe(minTimeRounded);
			expect(maxTime).not.toBe(maxTimeRounded);
		});

		it('should NOT round custom time range passed as parameter', () => {
			const { result } = renderHook(() => useGlobalTimeStore());
			// Store is set to relative time
			act(() => {
				result.current.setSelectedTime('15m');
			});

			// Use timestamps that are NOT on minute boundaries
			const minTimeWithSeconds =
				new Date('2024-01-15T12:15:45.123Z').getTime() * NANO_SECOND_MULTIPLIER;
			const maxTimeWithSeconds =
				new Date('2024-01-15T12:30:45.123Z').getTime() * NANO_SECOND_MULTIPLIER;

			// What the values would be if rounded down to minute boundary
			const minTimeRounded =
				new Date('2024-01-15T12:15:00.000Z').getTime() * NANO_SECOND_MULTIPLIER;
			const maxTimeRounded =
				new Date('2024-01-15T12:30:00.000Z').getTime() * NANO_SECOND_MULTIPLIER;

			const customTime = createCustomTimeRange(
				minTimeWithSeconds,
				maxTimeWithSeconds,
			);

			// Pass custom time as parameter (different from store's selectedTime)
			const { minTime, maxTime } = result.current.getMinMaxTime(customTime);

			// Should return exact values, NOT rounded values
			expect(minTime).toBe(minTimeWithSeconds);
			expect(maxTime).toBe(maxTimeWithSeconds);
			expect(minTime).not.toBe(minTimeRounded);
			expect(maxTime).not.toBe(maxTimeRounded);
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

		it('should return same values on subsequent calls for relative time under a minute', () => {
			const { result } = renderHook(() => useGlobalTimeStore());

			act(() => {
				result.current.setSelectedTime('15m');
			});

			const first = result.current.getMinMaxTime();

			act(() => {
				jest.advanceTimersByTime(59000);
			});

			const second = result.current.getMinMaxTime();

			expect(second.maxTime).toBe(first.maxTime);
			expect(second.minTime).toBe(first.minTime);
		});

		it('should return different values on subsequent calls for relative time only after a minute', () => {
			const { result } = renderHook(() => useGlobalTimeStore());

			act(() => {
				result.current.setSelectedTime('15m');
			});

			const first = result.current.getMinMaxTime();

			act(() => {
				jest.advanceTimersByTime(60000);
			});

			const second = result.current.getMinMaxTime();

			expect(second.maxTime).toBe(first.maxTime + 60000 * NANO_SECOND_MULTIPLIER);
			expect(second.minTime).toBe(first.minTime + 60000 * NANO_SECOND_MULTIPLIER);
		});

		it('should return stored lastComputedMinMax when available', () => {
			const { result } = renderHook(() => useGlobalTimeStore());

			act(() => {
				result.current.setSelectedTime('15m');
				result.current.computeAndStoreMinMax();
			});

			const stored = { ...result.current.lastComputedMinMax };

			// Advance time by 5 seconds
			act(() => {
				jest.advanceTimersByTime(5000);
			});

			// getMinMaxTime should return stored values, not fresh computation
			const returned = result.current.getMinMaxTime();
			expect(returned).toStrictEqual(stored);
		});

		it('should compute fresh values when different selectedTime is provided', () => {
			const { result } = renderHook(() => useGlobalTimeStore());

			act(() => {
				result.current.setSelectedTime('15m');
				result.current.computeAndStoreMinMax();
			});

			const stored = { ...result.current.lastComputedMinMax };

			// Request time for a different selectedTime
			const freshValues = result.current.getMinMaxTime('1h');

			// Should NOT equal stored values (different duration)
			expect(freshValues).not.toStrictEqual(stored);
		});

		it('should behave same as no-param call when selectedTime matches state', () => {
			// This tests the pattern used in K8sBaseDetails:
			// getMinMaxTime(selectedTime) where selectedTime === state.selectedTime
			const wrapper = createIsolatedWrapper({
				selectedTime: '15m',
				refreshInterval: 5000, // isRefreshEnabled = true
			});
			const { result } = renderHook(() => useGlobalTime(), { wrapper });

			act(() => {
				result.current.computeAndStoreMinMax();
			});

			const initialMinMax = { ...result.current.lastComputedMinMax };

			// Advance time past minute boundary
			act(() => {
				jest.advanceTimersByTime(60000);
			});

			// Call with selectedTime parameter that matches state.selectedTime
			// Should behave the same as calling without parameter
			const withParam = result.current.getMinMaxTime('15m');
			const withoutParam = result.current.getMinMaxTime();

			expect(withParam).toStrictEqual(withoutParam);
			expect(withParam.maxTime).toBe(
				initialMinMax.maxTime + 60000 * NANO_SECOND_MULTIPLIER,
			);
		});

		describe('with isRefreshEnabled (isolated store)', () => {
			it('should compute fresh values when isRefreshEnabled is true', () => {
				const wrapper = createIsolatedWrapper({
					selectedTime: '15m',
					refreshInterval: 5000,
				});
				const { result } = renderHook(() => useGlobalTime(), { wrapper });

				act(() => {
					result.current.computeAndStoreMinMax();
				});

				const initialMinMax = { ...result.current.lastComputedMinMax };

				// Advance time past minute boundary
				act(() => {
					jest.advanceTimersByTime(60000);
				});

				// getMinMaxTime should return fresh values, not cached
				const freshValues = result.current.getMinMaxTime();

				expect(freshValues.maxTime).toBe(
					initialMinMax.maxTime + 60000 * NANO_SECOND_MULTIPLIER,
				);
				expect(freshValues.minTime).toBe(
					initialMinMax.minTime + 60000 * NANO_SECOND_MULTIPLIER,
				);
			});

			it('should update lastComputedMinMax when values change', () => {
				const wrapper = createIsolatedWrapper({
					selectedTime: '15m',
					refreshInterval: 5000,
				});
				const { result } = renderHook(() => useGlobalTime(), { wrapper });

				act(() => {
					result.current.computeAndStoreMinMax();
				});

				const initialMinMax = { ...result.current.lastComputedMinMax };

				// Advance time past minute boundary
				act(() => {
					jest.advanceTimersByTime(60000);
				});

				// Call getMinMaxTime - should update lastComputedMinMax
				act(() => {
					result.current.getMinMaxTime();
				});

				expect(result.current.lastComputedMinMax.maxTime).toBe(
					initialMinMax.maxTime + 60000 * NANO_SECOND_MULTIPLIER,
				);
				expect(result.current.lastComputedMinMax.minTime).toBe(
					initialMinMax.minTime + 60000 * NANO_SECOND_MULTIPLIER,
				);
			});

			it('should update lastRefreshTimestamp when values change', () => {
				const wrapper = createIsolatedWrapper({
					selectedTime: '15m',
					refreshInterval: 5000,
				});
				const { result } = renderHook(() => useGlobalTime(), { wrapper });

				act(() => {
					result.current.computeAndStoreMinMax();
				});

				const initialTimestamp = result.current.lastRefreshTimestamp;

				// Advance time past minute boundary
				act(() => {
					jest.advanceTimersByTime(60000);
				});

				// Call getMinMaxTime - should update timestamp
				act(() => {
					result.current.getMinMaxTime();
				});

				expect(result.current.lastRefreshTimestamp).toBeGreaterThan(
					initialTimestamp,
				);
			});

			it('should NOT update lastComputedMinMax when values have not changed (same minute)', () => {
				const wrapper = createIsolatedWrapper({
					selectedTime: '15m',
					refreshInterval: 5000,
				});
				const { result } = renderHook(() => useGlobalTime(), { wrapper });

				act(() => {
					result.current.computeAndStoreMinMax();
				});

				const initialMinMax = { ...result.current.lastComputedMinMax };
				const initialTimestamp = result.current.lastRefreshTimestamp;

				// Advance time but stay within same minute
				act(() => {
					jest.advanceTimersByTime(30000);
				});

				// Call getMinMaxTime - should NOT update store (same minute boundary)
				act(() => {
					result.current.getMinMaxTime();
				});

				// Values should be unchanged (no unnecessary re-renders)
				expect(result.current.lastComputedMinMax).toStrictEqual(initialMinMax);
				expect(result.current.lastRefreshTimestamp).toBe(initialTimestamp);
			});

			it('should return cached values when isRefreshEnabled is false', () => {
				const wrapper = createIsolatedWrapper({
					selectedTime: '15m',
					refreshInterval: 0, // Refresh disabled
				});
				const { result } = renderHook(() => useGlobalTime(), { wrapper });

				act(() => {
					result.current.computeAndStoreMinMax();
				});

				const storedMinMax = { ...result.current.lastComputedMinMax };

				// Advance time past minute boundary
				act(() => {
					jest.advanceTimersByTime(60000);
				});

				// getMinMaxTime should return cached values since refresh is disabled
				const returned = result.current.getMinMaxTime();

				expect(returned).toStrictEqual(storedMinMax);
				expect(result.current.lastComputedMinMax).toStrictEqual(storedMinMax);
			});

			it('should return same values for custom time range regardless of time passing', () => {
				const minTime = 1000000000;
				const maxTime = 2000000000;
				const customTime = createCustomTimeRange(minTime, maxTime);

				const wrapper = createIsolatedWrapper({
					selectedTime: customTime,
					refreshInterval: 5000,
				});
				const { result } = renderHook(() => useGlobalTime(), { wrapper });

				// isRefreshEnabled should be false for custom time ranges
				expect(result.current.isRefreshEnabled).toBe(false);

				// Custom time ranges always return the fixed values, not relative to "now"
				const first = result.current.getMinMaxTime();
				expect(first.minTime).toBe(minTime);
				expect(first.maxTime).toBe(maxTime);

				// Advance time past minute boundary
				act(() => {
					jest.advanceTimersByTime(60000);
				});

				// Should still return the same fixed values (custom range doesn't drift)
				const second = result.current.getMinMaxTime();
				expect(second.minTime).toBe(minTime);
				expect(second.maxTime).toBe(maxTime);
			});

			it('should handle multiple consecutive refetch intervals correctly', () => {
				const wrapper = createIsolatedWrapper({
					selectedTime: '15m',
					refreshInterval: 5000,
				});
				const { result } = renderHook(() => useGlobalTime(), { wrapper });

				act(() => {
					result.current.computeAndStoreMinMax();
				});

				const initialMinMax = { ...result.current.lastComputedMinMax };

				// Simulate 3 refetch intervals crossing minute boundaries
				for (let i = 1; i <= 3; i++) {
					act(() => {
						jest.advanceTimersByTime(60000);
					});

					act(() => {
						result.current.getMinMaxTime();
					});

					expect(result.current.lastComputedMinMax.maxTime).toBe(
						initialMinMax.maxTime + i * 60000 * NANO_SECOND_MULTIPLIER,
					);
				}
			});
		});
	});

	describe('computeAndStoreMinMax', () => {
		beforeEach(() => {
			jest.useFakeTimers();
			jest.setSystemTime(new Date('2024-01-15T12:30:45.123Z'));
		});

		afterEach(() => {
			jest.useRealTimers();
		});

		it('should compute and store rounded min/max values', () => {
			const { result } = renderHook(() => useGlobalTimeStore());

			act(() => {
				result.current.setSelectedTime('15m');
			});

			act(() => {
				result.current.computeAndStoreMinMax();
			});

			// maxTime should be rounded to 12:30:00.000
			const expectedMaxTime =
				new Date('2024-01-15T12:30:00.000Z').getTime() * NANO_SECOND_MULTIPLIER;
			const fifteenMinutesNs = 15 * 60 * 1000 * NANO_SECOND_MULTIPLIER;

			expect(result.current.lastComputedMinMax.maxTime).toBe(expectedMaxTime);
			expect(result.current.lastComputedMinMax.minTime).toBe(
				expectedMaxTime - fifteenMinutesNs,
			);
		});

		it('should update lastRefreshTimestamp', () => {
			const { result } = renderHook(() => useGlobalTimeStore());
			const beforeTimestamp = Date.now();

			act(() => {
				result.current.computeAndStoreMinMax();
			});

			expect(result.current.lastRefreshTimestamp).toBeGreaterThanOrEqual(
				beforeTimestamp,
			);
		});

		it('should return the computed values', () => {
			const { result } = renderHook(() => useGlobalTimeStore());

			let returnedValue: { minTime: number; maxTime: number } | undefined;
			act(() => {
				returnedValue = result.current.computeAndStoreMinMax();
			});

			expect(returnedValue).toStrictEqual(result.current.lastComputedMinMax);
		});

		it('should NOT round custom time range values to minute boundaries', () => {
			const { result } = renderHook(() => useGlobalTimeStore());
			// Use timestamps that are NOT on minute boundaries (12:30:45.123)
			// If rounding occurred, these would change to 12:30:00.000
			const minTimeWithSeconds =
				new Date('2024-01-15T12:15:45.123Z').getTime() * NANO_SECOND_MULTIPLIER;
			const maxTimeWithSeconds =
				new Date('2024-01-15T12:30:45.123Z').getTime() * NANO_SECOND_MULTIPLIER;

			// What the values would be if rounded down to minute boundary
			const minTimeRounded =
				new Date('2024-01-15T12:15:00.000Z').getTime() * NANO_SECOND_MULTIPLIER;
			const maxTimeRounded =
				new Date('2024-01-15T12:30:00.000Z').getTime() * NANO_SECOND_MULTIPLIER;

			const customTime = createCustomTimeRange(
				minTimeWithSeconds,
				maxTimeWithSeconds,
			);

			act(() => {
				result.current.setSelectedTime(customTime);
			});

			let returnedValue: { minTime: number; maxTime: number } | undefined;
			act(() => {
				returnedValue = result.current.computeAndStoreMinMax();
			});

			// Should return exact values, NOT rounded values
			expect(returnedValue?.minTime).toBe(minTimeWithSeconds);
			expect(returnedValue?.maxTime).toBe(maxTimeWithSeconds);
			expect(returnedValue?.minTime).not.toBe(minTimeRounded);
			expect(returnedValue?.maxTime).not.toBe(maxTimeRounded);

			// lastComputedMinMax should also have exact values
			expect(result.current.lastComputedMinMax.minTime).toBe(minTimeWithSeconds);
			expect(result.current.lastComputedMinMax.maxTime).toBe(maxTimeWithSeconds);
		});
	});

	describe('updateRefreshTimestamp', () => {
		beforeEach(() => {
			jest.useFakeTimers();
			jest.setSystemTime(new Date('2024-01-15T12:30:45.123Z'));
		});

		afterEach(() => {
			jest.useRealTimers();
		});

		it('should update lastRefreshTimestamp to current time', () => {
			const { result } = renderHook(() => useGlobalTimeStore());

			act(() => {
				result.current.updateRefreshTimestamp();
			});

			expect(result.current.lastRefreshTimestamp).toBe(Date.now());
		});

		it('should not modify lastComputedMinMax', () => {
			const { result } = renderHook(() => useGlobalTimeStore());

			act(() => {
				result.current.computeAndStoreMinMax();
			});

			const beforeMinMax = { ...result.current.lastComputedMinMax };

			act(() => {
				jest.advanceTimersByTime(5000);
				result.current.updateRefreshTimestamp();
			});

			expect(result.current.lastComputedMinMax).toStrictEqual(beforeMinMax);
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
