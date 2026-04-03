// eslint-disable-next-line no-restricted-imports
import { Provider } from 'react-redux';
import { act, render, renderHook } from '@testing-library/react';
import { DEFAULT_TIME_RANGE } from 'container/TopNav/DateTimeSelectionV2/constants';
import configureStore, { MockStoreEnhanced } from 'redux-mock-store';
import { useGlobalTimeStore } from 'store/globalTime/globalTimeStore';
import { createCustomTimeRange } from 'store/globalTime/utils';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';

import { GlobalTimeStoreAdapter } from '../GlobalTimeStoreAdapter';

const mockStore = configureStore<Partial<AppState>>([]);

const randomTime = 1700000000000000000;

describe('GlobalTimeStoreAdapter', () => {
	let store: MockStoreEnhanced<Partial<AppState>>;

	const createGlobalTimeState = (
		overrides: Partial<GlobalReducer> = {},
	): GlobalReducer => ({
		minTime: randomTime,
		maxTime: randomTime,
		loading: false,
		selectedTime: '15m',
		isAutoRefreshDisabled: true,
		selectedAutoRefreshInterval: 'off',
		...overrides,
	});

	beforeEach(() => {
		// Reset Zustand store before each test
		const { result } = renderHook(() => useGlobalTimeStore());
		act(() => {
			result.current.setSelectedTime(DEFAULT_TIME_RANGE, 0);
		});
	});

	it('should render null because it just an adapter', () => {
		store = mockStore({
			globalTime: createGlobalTimeState(),
		});

		const { container } = render(
			<Provider store={store}>
				<GlobalTimeStoreAdapter />
			</Provider>,
		);

		expect(container.firstChild).toBeNull();
	});

	it('should sync relative time from Redux to Zustand store', () => {
		store = mockStore({
			globalTime: createGlobalTimeState({
				selectedTime: '15m',
				isAutoRefreshDisabled: true,
				selectedAutoRefreshInterval: 'off',
			}),
		});

		render(
			<Provider store={store}>
				<GlobalTimeStoreAdapter />
			</Provider>,
		);

		const { result } = renderHook(() => useGlobalTimeStore());
		expect(result.current.selectedTime).toBe('15m');
		expect(result.current.refreshInterval).toBe(0);
		expect(result.current.isRefreshEnabled).toBe(false);
	});

	it('should sync custom time from Redux to Zustand store', () => {
		store = mockStore({
			globalTime: createGlobalTimeState({
				selectedTime: 'custom',
				minTime: randomTime,
				maxTime: randomTime,
				isAutoRefreshDisabled: true,
			}),
		});

		render(
			<Provider store={store}>
				<GlobalTimeStoreAdapter />
			</Provider>,
		);

		const { result } = renderHook(() => useGlobalTimeStore());
		expect(result.current.selectedTime).toBe(
			createCustomTimeRange(randomTime, randomTime),
		);
		expect(result.current.isRefreshEnabled).toBe(false);
	});

	it('should sync refresh interval when auto refresh is enabled', () => {
		store = mockStore({
			globalTime: createGlobalTimeState({
				selectedTime: '15m',
				isAutoRefreshDisabled: false,
				selectedAutoRefreshInterval: '5s',
			}),
		});

		render(
			<Provider store={store}>
				<GlobalTimeStoreAdapter />
			</Provider>,
		);

		const { result } = renderHook(() => useGlobalTimeStore());
		expect(result.current.selectedTime).toBe('15m');
		expect(result.current.refreshInterval).toBe(5000); // 5s = 5000ms
		expect(result.current.isRefreshEnabled).toBe(true);
	});

	it('should set refreshInterval to 0 when auto refresh is disabled', () => {
		store = mockStore({
			globalTime: createGlobalTimeState({
				selectedTime: '15m',
				isAutoRefreshDisabled: true,
				selectedAutoRefreshInterval: '5s', // Even with interval set, should be 0 when disabled
			}),
		});

		render(
			<Provider store={store}>
				<GlobalTimeStoreAdapter />
			</Provider>,
		);

		const { result } = renderHook(() => useGlobalTimeStore());
		expect(result.current.refreshInterval).toBe(0);
		expect(result.current.isRefreshEnabled).toBe(false);
	});

	it('should update Zustand store when Redux state changes', () => {
		store = mockStore({
			globalTime: createGlobalTimeState({
				selectedTime: '15m',
				isAutoRefreshDisabled: true,
			}),
		});

		const { rerender } = render(
			<Provider store={store}>
				<GlobalTimeStoreAdapter />
			</Provider>,
		);

		// Verify initial state
		let zustandState = renderHook(() => useGlobalTimeStore());
		expect(zustandState.result.current.selectedTime).toBe('15m');

		// Update Redux store
		const newStore = mockStore({
			globalTime: createGlobalTimeState({
				selectedTime: '1h',
				isAutoRefreshDisabled: false,
				selectedAutoRefreshInterval: '30s',
			}),
		});

		rerender(
			<Provider store={newStore}>
				<GlobalTimeStoreAdapter />
			</Provider>,
		);

		// Verify updated state
		zustandState = renderHook(() => useGlobalTimeStore());
		expect(zustandState.result.current.selectedTime).toBe('1h');
		expect(zustandState.result.current.refreshInterval).toBe(30000); // 30s = 30000ms
		expect(zustandState.result.current.isRefreshEnabled).toBe(true);
	});

	it('should handle various refresh interval options', () => {
		const testCases = [
			{ key: '5s', expectedValue: 5000 },
			{ key: '10s', expectedValue: 10000 },
			{ key: '30s', expectedValue: 30000 },
			{ key: '1m', expectedValue: 60000 },
			{ key: '5m', expectedValue: 300000 },
		];

		testCases.forEach(({ key, expectedValue }) => {
			store = mockStore({
				globalTime: createGlobalTimeState({
					selectedTime: '15m',
					isAutoRefreshDisabled: false,
					selectedAutoRefreshInterval: key,
				}),
			});

			render(
				<Provider store={store}>
					<GlobalTimeStoreAdapter />
				</Provider>,
			);

			const { result } = renderHook(() => useGlobalTimeStore());
			expect(result.current.refreshInterval).toBe(expectedValue);
		});
	});

	it('should handle unknown refresh interval by setting 0', () => {
		store = mockStore({
			globalTime: createGlobalTimeState({
				selectedTime: '15m',
				isAutoRefreshDisabled: false,
				selectedAutoRefreshInterval: 'unknown-interval',
			}),
		});

		render(
			<Provider store={store}>
				<GlobalTimeStoreAdapter />
			</Provider>,
		);

		const { result } = renderHook(() => useGlobalTimeStore());
		expect(result.current.refreshInterval).toBe(0);
		expect(result.current.isRefreshEnabled).toBe(false);
	});
});
