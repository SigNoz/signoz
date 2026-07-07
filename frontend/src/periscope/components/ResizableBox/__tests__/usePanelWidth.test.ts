import { act, renderHook } from '@testing-library/react';
import getLocalStorageKey from 'api/browser/localstorage/get';
import setLocalStorageKey from 'api/browser/localstorage/set';
import { LOCALSTORAGE } from 'constants/localStorage';

import usePanelWidth from '../usePanelWidth';

jest.mock('api/browser/localstorage/get');
jest.mock('api/browser/localstorage/set');

const mockedGet = getLocalStorageKey as jest.MockedFunction<
	typeof getLocalStorageKey
>;
const mockedSet = setLocalStorageKey as jest.MockedFunction<
	typeof setLocalStorageKey
>;

const ARGS = {
	storageKey: LOCALSTORAGE.QUICK_FILTERS_WIDTH_LOGS,
	defaultWidth: 260,
	minWidth: 240,
	maxWidth: 500,
};

describe('usePanelWidth', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		jest.useFakeTimers();
	});

	afterEach(() => {
		jest.runOnlyPendingTimers();
		jest.useRealTimers();
	});

	it('returns defaultWidth when nothing is persisted', () => {
		mockedGet.mockReturnValue(null);
		const { result } = renderHook(() => usePanelWidth(ARGS));
		expect(result.current.initialWidth).toBe(260);
	});

	it('returns the persisted width when present', () => {
		mockedGet.mockReturnValue('340');
		const { result } = renderHook(() => usePanelWidth(ARGS));
		expect(result.current.initialWidth).toBe(340);
	});

	it('clamps an out-of-bounds persisted width on read', () => {
		mockedGet.mockReturnValue('9999');
		const { result } = renderHook(() => usePanelWidth(ARGS));
		expect(result.current.initialWidth).toBe(500);
	});

	it('falls back to defaultWidth for an invalid persisted value', () => {
		mockedGet.mockReturnValue('not-a-number');
		const { result } = renderHook(() => usePanelWidth(ARGS));
		expect(result.current.initialWidth).toBe(260);
	});

	it('persists a clamped width (debounced)', () => {
		mockedGet.mockReturnValue(null);
		const { result } = renderHook(() => usePanelWidth(ARGS));

		act(() => {
			result.current.persistWidth(320);
			jest.advanceTimersByTime(200);
		});

		expect(mockedSet).toHaveBeenCalledWith(
			LOCALSTORAGE.QUICK_FILTERS_WIDTH_LOGS,
			'320',
		);
	});

	it('clamps below-min widths before persisting', () => {
		mockedGet.mockReturnValue(null);
		const { result } = renderHook(() => usePanelWidth(ARGS));

		act(() => {
			result.current.persistWidth(10);
			jest.advanceTimersByTime(200);
		});

		expect(mockedSet).toHaveBeenCalledWith(
			LOCALSTORAGE.QUICK_FILTERS_WIDTH_LOGS,
			'240',
		);
	});
});
