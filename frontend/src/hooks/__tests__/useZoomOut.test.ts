import { act, renderHook } from '@testing-library/react';
import { QueryParams } from 'constants/query';
import { GlobalReducer } from 'types/reducer/globalTime';

import { useZoomOut } from '../useZoomOut';

const mockDispatch = jest.fn();
const mockSafeNavigate = jest.fn();
const mockUrlQueryDelete = jest.fn();
const mockUrlQuerySet = jest.fn();
const mockUrlQueryToString = jest.fn(() => '');

interface MockAppState {
	globalTime: Pick<GlobalReducer, 'minTime' | 'maxTime'>;
}

jest.mock('react-redux', () => ({
	useDispatch: (): jest.Mock => mockDispatch,
	useSelector: <T>(selector: (state: MockAppState) => T): T => {
		const mockState: MockAppState = {
			globalTime: {
				minTime: 15 * 60 * 1000 * 1e6, // 15 min in nanoseconds
				maxTime: 30 * 60 * 1000 * 1e6, // 30 min in nanoseconds (mock for getNextZoomOutRange)
			},
		};
		return selector(mockState);
	},
}));

jest.mock('react-router-dom', () => ({
	useLocation: (): { pathname: string } => ({ pathname: '/logs-explorer' }),
}));

jest.mock('hooks/useSafeNavigate', () => ({
	useSafeNavigate: (): { safeNavigate: typeof mockSafeNavigate } => ({
		safeNavigate: mockSafeNavigate,
	}),
}));

interface MockUrlQuery {
	delete: typeof mockUrlQueryDelete;
	set: typeof mockUrlQuerySet;
	get: () => null;
	toString: typeof mockUrlQueryToString;
}

jest.mock('hooks/useUrlQuery', () => ({
	__esModule: true,
	default: (): MockUrlQuery => ({
		delete: mockUrlQueryDelete,
		set: mockUrlQuerySet,
		get: (): null => null,
		toString: mockUrlQueryToString,
	}),
}));

const mockGetNextZoomOutRange = jest.fn();
jest.mock('lib/zoomOutUtils', () => ({
	getNextZoomOutRange: (
		...args: unknown[]
	): ReturnType<typeof mockGetNextZoomOutRange> =>
		mockGetNextZoomOutRange(...args),
}));

describe('useZoomOut', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockUrlQueryToString.mockReturnValue('relativeTime=45m');
	});

	it('should do nothing when isDisabled is true', () => {
		const { result } = renderHook(() => useZoomOut({ isDisabled: true }));

		act(() => {
			result.current();
		});

		expect(mockGetNextZoomOutRange).not.toHaveBeenCalled();
		expect(mockDispatch).not.toHaveBeenCalled();
		expect(mockSafeNavigate).not.toHaveBeenCalled();
	});

	it('should do nothing when getNextZoomOutRange returns null', () => {
		mockGetNextZoomOutRange.mockReturnValue(null);

		const { result } = renderHook(() => useZoomOut());

		act(() => {
			result.current();
		});

		expect(mockGetNextZoomOutRange).toHaveBeenCalled();
		expect(mockDispatch).not.toHaveBeenCalled();
		expect(mockSafeNavigate).not.toHaveBeenCalled();
	});

	it('should dispatch preset and update URL when result has preset', () => {
		mockGetNextZoomOutRange.mockReturnValue({
			range: [1000, 2000],
			preset: '45m',
		});

		const { result } = renderHook(() => useZoomOut());

		act(() => {
			result.current();
		});

		expect(mockDispatch).toHaveBeenCalledWith(expect.any(Function));
		expect(mockUrlQueryDelete).toHaveBeenCalledWith(QueryParams.startTime);
		expect(mockUrlQueryDelete).toHaveBeenCalledWith(QueryParams.endTime);
		expect(mockUrlQuerySet).toHaveBeenCalledWith(QueryParams.relativeTime, '45m');
		expect(mockSafeNavigate).toHaveBeenCalledWith(
			expect.stringContaining('/logs-explorer'),
		);
	});

	it('should dispatch custom range and update URL when result has no preset', () => {
		mockGetNextZoomOutRange.mockReturnValue({
			range: [1000000, 2000000],
			preset: null,
		});

		const { result } = renderHook(() => useZoomOut());

		act(() => {
			result.current();
		});

		expect(mockDispatch).toHaveBeenCalledWith(expect.any(Function));
		expect(mockUrlQuerySet).toHaveBeenCalledWith(
			QueryParams.startTime,
			'1000000',
		);
		expect(mockUrlQuerySet).toHaveBeenCalledWith(QueryParams.endTime, '2000000');
		expect(mockUrlQueryDelete).toHaveBeenCalledWith(QueryParams.relativeTime);
		expect(mockSafeNavigate).toHaveBeenCalledWith(
			expect.stringContaining('/logs-explorer'),
		);
	});

	it('should delete urlParamsToDelete when provided', () => {
		mockGetNextZoomOutRange.mockReturnValue({
			range: [1000, 2000],
			preset: '45m',
		});

		const { result } = renderHook(() =>
			useZoomOut({
				urlParamsToDelete: [QueryParams.activeLogId],
			}),
		);

		act(() => {
			result.current();
		});

		expect(mockUrlQueryDelete).toHaveBeenCalledWith(QueryParams.activeLogId);
	});
});
