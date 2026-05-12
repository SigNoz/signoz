import { act, renderHook } from '@testing-library/react';
import { ReactNode } from 'react';

import { createGlobalTimeStore } from '../globalTimeStore';
import { GlobalTimeContext } from '../GlobalTimeContext';
import {
	useGlobalTime,
	useGlobalTimeStoreApi,
	useIsCustomTimeRange,
	useLastComputedMinMax,
} from '../hooks';
import { useComputedMinMaxSync } from '../useComputedMinMaxSync';
import { createCustomTimeRange } from '../utils';

describe('useGlobalTime', () => {
	it('should return full store state without selector', () => {
		const { result } = renderHook(() => useGlobalTime());

		expect(result.current.selectedTime).toBeDefined();
		expect(result.current.setSelectedTime).toBeInstanceOf(Function);
	});

	it('should return selected value with selector', () => {
		const { result } = renderHook(() => useGlobalTime((s) => s.selectedTime));

		expect(typeof result.current).toBe('string');
	});

	it('should use context store when provided', () => {
		const contextStore = createGlobalTimeStore({ selectedTime: '1h' });

		const wrapper = ({ children }: { children: ReactNode }): JSX.Element => (
			<GlobalTimeContext.Provider value={contextStore}>
				{children}
			</GlobalTimeContext.Provider>
		);

		const { result } = renderHook(() => useGlobalTime((s) => s.selectedTime), {
			wrapper,
		});

		expect(result.current).toBe('1h');
	});
});

describe('useIsCustomTimeRange', () => {
	it('should return false for relative time', () => {
		const { result } = renderHook(() => useIsCustomTimeRange());

		expect(result.current).toBe(false);
	});

	it('should return true for custom time range', () => {
		const customTime = createCustomTimeRange(1000000000, 2000000000);
		const contextStore = createGlobalTimeStore({ selectedTime: customTime });

		const { result } = renderHook(() => useIsCustomTimeRange(), {
			wrapper: ({ children }: { children: ReactNode }): JSX.Element => (
				<GlobalTimeContext.Provider value={contextStore}>
					{children}
				</GlobalTimeContext.Provider>
			),
		});

		expect(result.current).toBe(true);
	});
});

describe('useGlobalTimeStoreApi', () => {
	it('should return store API', () => {
		const { result } = renderHook(() => useGlobalTimeStoreApi());

		expect(result.current.getState).toBeInstanceOf(Function);
		expect(result.current.subscribe).toBeInstanceOf(Function);
	});
});

describe('useLastComputedMinMax', () => {
	it('should return lastComputedMinMax from store', () => {
		const contextStore = createGlobalTimeStore({ selectedTime: '15m' });

		// Compute the min/max first
		contextStore.getState().computeAndStoreMinMax();

		const { result } = renderHook(() => useLastComputedMinMax(), {
			wrapper: ({ children }: { children: ReactNode }): JSX.Element => (
				<GlobalTimeContext.Provider value={contextStore}>
					{children}
				</GlobalTimeContext.Provider>
			),
		});

		expect(result.current).toStrictEqual(
			contextStore.getState().lastComputedMinMax,
		);
	});

	it('should update when store changes', () => {
		jest.useFakeTimers();
		jest.setSystemTime(new Date('2024-01-15T12:30:45.123Z'));

		const contextStore = createGlobalTimeStore({ selectedTime: '15m' });
		contextStore.getState().computeAndStoreMinMax();

		const { result } = renderHook(() => useLastComputedMinMax(), {
			wrapper: ({ children }: { children: ReactNode }): JSX.Element => (
				<GlobalTimeContext.Provider value={contextStore}>
					{children}
				</GlobalTimeContext.Provider>
			),
		});

		const firstValue = { ...result.current };

		// Change time and recompute
		act(() => {
			jest.advanceTimersByTime(60000); // Advance 1 minute
			contextStore.getState().computeAndStoreMinMax();
		});

		expect(result.current).not.toStrictEqual(firstValue);

		jest.useRealTimers();
	});
});

describe('useComputedMinMaxSync', () => {
	beforeEach(() => {
		jest.useFakeTimers();
		jest.setSystemTime(new Date('2024-01-15T12:30:45.123Z'));
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it('should have computed min/max on store creation (no longer needs mount sync)', () => {
		const contextStore = createGlobalTimeStore({ selectedTime: '15m' });

		// Store now computes min/max on creation, not on mount
		expect(contextStore.getState().lastComputedMinMax.minTime).toBeGreaterThan(0);
		expect(contextStore.getState().lastComputedMinMax.maxTime).toBeGreaterThan(0);

		// Hook still works but is a no-op when values already exist
		renderHook(() => useComputedMinMaxSync(contextStore));

		// Values remain computed
		expect(contextStore.getState().lastComputedMinMax.maxTime).toBeGreaterThan(0);
		expect(contextStore.getState().lastComputedMinMax.minTime).toBeGreaterThan(0);
	});

	it('should NOT recompute when store already has values', () => {
		const contextStore = createGlobalTimeStore({ selectedTime: '15m' });

		contextStore.getState().computeAndStoreMinMax();
		const initialMinMax = { ...contextStore.getState().lastComputedMinMax };
		const initialTimestamp = contextStore.getState().lastRefreshTimestamp;

		jest.advanceTimersByTime(60000);

		renderHook(() => useComputedMinMaxSync(contextStore));

		// Should NOT have recomputed - values should be unchanged
		expect(contextStore.getState().lastComputedMinMax).toStrictEqual(
			initialMinMax,
		);
		expect(contextStore.getState().lastRefreshTimestamp).toBe(initialTimestamp);
	});

	it('should only compute on mount, not on re-renders', () => {
		const contextStore = createGlobalTimeStore({ selectedTime: '15m' });

		const { rerender } = renderHook(() => useComputedMinMaxSync(contextStore));

		const afterMountMinMax = { ...contextStore.getState().lastComputedMinMax };
		const afterMountTimestamp = contextStore.getState().lastRefreshTimestamp;

		jest.advanceTimersByTime(60000);

		rerender();

		// Should NOT have recomputed on re-render
		expect(contextStore.getState().lastComputedMinMax).toStrictEqual(
			afterMountMinMax,
		);
		expect(contextStore.getState().lastRefreshTimestamp).toBe(
			afterMountTimestamp,
		);
	});
});
