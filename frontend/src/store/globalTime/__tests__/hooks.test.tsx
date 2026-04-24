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
