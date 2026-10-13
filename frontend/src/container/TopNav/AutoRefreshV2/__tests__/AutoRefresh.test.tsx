// eslint-disable-next-line no-restricted-imports
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { act, render, screen } from '@testing-library/react';
import set from 'api/browser/localstorage/set';
import { DASHBOARD_TIME_IN_DURATION } from 'constants/app';
import configureStore, { MockStoreEnhanced } from 'redux-mock-store';
import { AppState } from 'store/reducers';
import { UPDATE_TIME_INTERVAL } from 'types/actions/globalTime';
import { GlobalReducer } from 'types/reducer/globalTime';

import AutoRefresh from '../index';

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

function renderAutoRefresh(
	globalTime: GlobalReducer,
	props: { disabled?: boolean } = {},
): MockStoreEnhanced<Partial<AppState>> {
	const store = mockStore({ globalTime });

	render(
		<MemoryRouter initialEntries={[PATHNAME]}>
			<Provider store={store}>
				<AutoRefresh {...props} />
			</Provider>
		</MemoryRouter>,
	);

	return store;
}

function tickCount(store: MockStoreEnhanced<Partial<AppState>>): number {
	return store.getActions().filter((a) => a.type === UPDATE_TIME_INTERVAL)
		.length;
}

describe('AutoRefresh', () => {
	beforeEach(() => {
		jest.useFakeTimers();
		localStorage.clear();
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it('renders the trigger and ticks on the persisted interval', () => {
		set(DASHBOARD_TIME_IN_DURATION, JSON.stringify({ [PATHNAME]: '5s' }));

		const store = renderAutoRefresh(createGlobalTimeState());

		expect(screen.getByTitle('Set auto refresh')).toBeInTheDocument();

		act(() => {
			jest.advanceTimersByTime(15_000);
		});

		expect(tickCount(store)).toBe(3);
	});

	it('does not tick when auto refresh was never enabled for the route', () => {
		const store = renderAutoRefresh(createGlobalTimeState());

		act(() => {
			jest.advanceTimersByTime(60_000);
		});

		expect(tickCount(store)).toBe(0);
	});

	it('does not tick while the disabled prop is set', () => {
		set(DASHBOARD_TIME_IN_DURATION, JSON.stringify({ [PATHNAME]: '5s' }));

		const store = renderAutoRefresh(createGlobalTimeState(), { disabled: true });

		act(() => {
			jest.advanceTimersByTime(60_000);
		});

		expect(tickCount(store)).toBe(0);
	});

	it('renders nothing on a custom time range', () => {
		set(DASHBOARD_TIME_IN_DURATION, JSON.stringify({ [PATHNAME]: '5s' }));

		const store = renderAutoRefresh(
			createGlobalTimeState({ selectedTime: 'custom' }),
		);

		expect(screen.queryByTitle('Set auto refresh')).not.toBeInTheDocument();

		act(() => {
			jest.advanceTimersByTime(60_000);
		});

		expect(tickCount(store)).toBe(0);
	});
});
