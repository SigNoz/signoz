import { act, renderHook } from '@testing-library/react';
import { ReactNode } from 'react';
// eslint-disable-next-line no-restricted-imports
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { UPDATE_TIME_INTERVAL } from 'types/actions/globalTime';
import { GlobalReducer } from 'types/reducer/globalTime';
import configureStore from 'redux-mock-store';
import thunk from 'redux-thunk';

import { useExtendTimeWindow } from '../useExtendTimeWindow';

const mockSafeNavigate = jest.fn();
jest.mock('hooks/useSafeNavigate', () => ({
	useSafeNavigate: (): { safeNavigate: jest.Mock } => ({
		safeNavigate: mockSafeNavigate,
	}),
}));

const NS_PER_MS = 1e6;
const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;

// A window anchored in the past so the zoom-out ladder is deterministic (real
// Date.now() is far ahead, so it always center-anchors into a custom range).
const PAST_END_MS = 1_600_003_600_000;

const mockStore = configureStore([thunk]);

function globalTimeState(
	partial: Pick<GlobalReducer, 'selectedTime' | 'minTime' | 'maxTime'>,
): GlobalReducer {
	return {
		loading: false,
		isAutoRefreshDisabled: false,
		selectedAutoRefreshInterval: '',
		...partial,
	};
}

function setup(globalTime: GlobalReducer): {
	result: { current: ReturnType<typeof useExtendTimeWindow> };
	store: ReturnType<typeof mockStore>;
} {
	const store = mockStore({ globalTime });
	const { result } = renderHook(() => useExtendTimeWindow(), {
		wrapper: ({ children }: { children: ReactNode }): JSX.Element => (
			<Provider store={store}>
				<MemoryRouter>{children}</MemoryRouter>
			</Provider>
		),
	});
	return { result, store };
}

describe('useExtendTimeWindow', () => {
	beforeEach(() => {
		mockSafeNavigate.mockClear();
	});

	it('reports it can extend and dispatches a wider range', () => {
		const { result, store } = setup(
			globalTimeState({
				selectedTime: '30m',
				minTime: (PAST_END_MS - 30 * MINUTE_MS) * NS_PER_MS,
				maxTime: PAST_END_MS * NS_PER_MS,
			}),
		);

		expect(result.current.canExtend).toBe(true);
		expect(result.current.actionLabel).toBe('Extend time range');

		act(() => result.current.extend());

		const [action] = store.getActions();
		expect(action.type).toBe(UPDATE_TIME_INTERVAL);
		expect(mockSafeNavigate).toHaveBeenCalledTimes(1);
	});

	it('cannot extend past the widest window', () => {
		const { result, store } = setup(
			globalTimeState({
				selectedTime: 'custom',
				minTime: (PAST_END_MS - 40 * DAY_MS) * NS_PER_MS,
				maxTime: PAST_END_MS * NS_PER_MS,
			}),
		);

		expect(result.current.canExtend).toBe(false);
		expect(result.current.actionLabel).toBeNull();

		act(() => result.current.extend());
		expect(store.getActions()).toHaveLength(0);
		expect(mockSafeNavigate).not.toHaveBeenCalled();
	});
});
