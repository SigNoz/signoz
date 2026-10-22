// eslint-disable-next-line no-restricted-imports
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { act, render } from '@testing-library/react';
import set from 'api/browser/localstorage/set';
import { DASHBOARD_TIME_IN_DURATION } from 'constants/app';
import configureStore, { MockStoreEnhanced } from 'redux-mock-store';
import { AppState } from 'store/reducers';
import { UPDATE_TIME_INTERVAL } from 'types/actions/globalTime';
import { GlobalReducer } from 'types/reducer/globalTime';

import AutoRefresh from '../index';
import AutoRefreshTicker from '../AutoRefreshTicker';

const mockStore = configureStore<Partial<AppState>>([]);

const PATHNAME = '/dashboard/test-id';
const randomTime = 1700000000000000000;

function createGlobalTimeState(
	overrides: Partial<GlobalReducer> = {},
): GlobalReducer {
	return {
		minTime: randomTime,
		maxTime: randomTime,
		loading: false,
		selectedTime: '15m',
		isAutoRefreshDisabled: false,
		selectedAutoRefreshInterval: '5s',
		...overrides,
	};
}

function renderTicker(
	globalTime: GlobalReducer,
): MockStoreEnhanced<Partial<AppState>> {
	const store = mockStore({ globalTime });

	render(
		<MemoryRouter initialEntries={[PATHNAME]}>
			<Provider store={store}>
				<AutoRefreshTicker />
			</Provider>
		</MemoryRouter>,
	);

	return store;
}

function timeIntervalActions(
	store: MockStoreEnhanced<Partial<AppState>>,
): unknown[] {
	return store.getActions().filter((a) => a.type === UPDATE_TIME_INTERVAL);
}

describe('AutoRefreshTicker', () => {
	beforeEach(() => {
		jest.useFakeTimers();
		localStorage.clear();
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it('advances the global time window on the interval persisted for the route', () => {
		set(DASHBOARD_TIME_IN_DURATION, JSON.stringify({ [PATHNAME]: '5s' }));

		const store = renderTicker(createGlobalTimeState());

		act(() => {
			jest.advanceTimersByTime(10_000);
		});

		expect(timeIntervalActions(store)).toHaveLength(2);
	});

	it('does not tick when the route has no persisted interval', () => {
		const store = renderTicker(createGlobalTimeState());

		act(() => {
			jest.advanceTimersByTime(60_000);
		});

		expect(timeIntervalActions(store)).toHaveLength(0);
	});

	it('does not tick while auto refresh is globally disabled', () => {
		set(DASHBOARD_TIME_IN_DURATION, JSON.stringify({ [PATHNAME]: '5s' }));

		const store = renderTicker(
			createGlobalTimeState({ isAutoRefreshDisabled: true }),
		);

		act(() => {
			jest.advanceTimersByTime(60_000);
		});

		expect(timeIntervalActions(store)).toHaveLength(0);
	});

	it('does not tick on a custom time range', () => {
		set(DASHBOARD_TIME_IN_DURATION, JSON.stringify({ [PATHNAME]: '5s' }));

		const store = renderTicker(createGlobalTimeState({ selectedTime: 'custom' }));

		act(() => {
			jest.advanceTimersByTime(60_000);
		});

		expect(timeIntervalActions(store)).toHaveLength(0);
	});
});

// Mirrors DashboardContainer's swap: exactly one of the two must be ticking.
describe('AutoRefresh full screen handover', () => {
	beforeEach(() => {
		jest.useFakeTimers();
		localStorage.clear();
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it('keeps a single timer running across entering and leaving full screen', () => {
		set(DASHBOARD_TIME_IN_DURATION, JSON.stringify({ [PATHNAME]: '5s' }));

		const store = mockStore({ globalTime: createGlobalTimeState() });

		function Harness({ active }: { active: boolean }): JSX.Element {
			return active ? <AutoRefreshTicker /> : <AutoRefresh />;
		}

		const renderHarness = (active: boolean): JSX.Element => (
			<MemoryRouter initialEntries={[PATHNAME]}>
				<Provider store={store}>
					<Harness active={active} />
				</Provider>
			</MemoryRouter>
		);

		const { rerender } = render(renderHarness(false));

		act(() => {
			jest.advanceTimersByTime(10_000);
		});
		expect(timeIntervalActions(store)).toHaveLength(2);

		rerender(renderHarness(true));
		act(() => {
			jest.advanceTimersByTime(10_000);
		});
		expect(timeIntervalActions(store)).toHaveLength(4);

		rerender(renderHarness(false));
		act(() => {
			jest.advanceTimersByTime(10_000);
		});
		expect(timeIntervalActions(store)).toHaveLength(6);
	});
});
