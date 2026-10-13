import { act, renderHook } from '@testing-library/react';
import GetMinMax from 'lib/getMinMax';

import { useViewPanelTimeWindow } from '../ViewPanelModal/useViewPanelTimeWindow';

const NS_PER_MS = 1e6;

// Global time is stored in nanoseconds; the hook must surface milliseconds.
const mockState = {
	globalTime: {
		selectedTime: '6h',
		minTime: 6_000_000 * NS_PER_MS,
		maxTime: 7_000_000 * NS_PER_MS,
	},
};

jest.mock('react-redux', () => ({
	useSelector: (selector: (s: unknown) => unknown): unknown =>
		selector(mockState),
}));

jest.mock('lib/getMinMax', () => ({
	__esModule: true,
	default: jest.fn(),
}));

const mockGetMinMax = GetMinMax as unknown as jest.Mock;

describe('useViewPanelTimeWindow', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('seeds the window from global time, converting ns → ms', () => {
		const { result } = renderHook(() => useViewPanelTimeWindow());

		expect(result.current.timeOverride).toStrictEqual({
			startMs: mockState.globalTime.minTime / NS_PER_MS,
			endMs: mockState.globalTime.maxTime / NS_PER_MS,
		});
		expect(result.current.selectedInterval).toBe('6h');
	});

	it('converts GetMinMax (ns) to ms on a relative selection', () => {
		mockGetMinMax.mockReturnValue({
			minTime: 1_700_000_000_000 * NS_PER_MS,
			maxTime: 1_700_000_300_000 * NS_PER_MS,
		});
		const { result } = renderHook(() => useViewPanelTimeWindow());

		act(() => result.current.onTimeChange('5m'));

		expect(result.current.selectedInterval).toBe('5m');
		expect(result.current.timeOverride).toStrictEqual({
			startMs: 1_700_000_000_000,
			endMs: 1_700_000_300_000,
		});
	});

	it('uses an absolute custom range as-is (already ms)', () => {
		const { result } = renderHook(() => useViewPanelTimeWindow());

		act(() => result.current.onTimeChange('custom', [111, 222]));

		expect(mockGetMinMax).not.toHaveBeenCalled();
		expect(result.current.timeOverride).toStrictEqual({
			startMs: 111,
			endMs: 222,
		});
	});

	it('sets a custom window from a drag selection (modal-local, ms)', () => {
		const { result } = renderHook(() => useViewPanelTimeWindow());

		act(() => result.current.onDragSelect(1000, 5000));

		expect(result.current.selectedInterval).toBe('custom');
		expect(result.current.timeOverride).toStrictEqual({
			startMs: 1000,
			endMs: 5000,
		});
	});

	it('ignores a zero-width or inverted drag selection', () => {
		const { result } = renderHook(() => useViewPanelTimeWindow());
		const initial = result.current.timeOverride;

		act(() => result.current.onDragSelect(5000, 5000));
		act(() => result.current.onDragSelect(9000, 1000));

		expect(result.current.timeOverride).toStrictEqual(initial);
	});

	it('widens the local window in place via the zoom-out ladder', () => {
		const { result } = renderHook(() => useViewPanelTimeWindow());
		act(() => result.current.onDragSelect(1000, 5000));

		expect(result.current.extendWindow.canExtend).toBe(true);
		expect(result.current.extendWindow.actionLabel).toBe('Extend time range');

		act(() => result.current.extendWindow.extend());

		// A past 4s window (< 15m) zooms out 3× around its centre (3000): [-3000, 9000].
		expect(result.current.selectedInterval).toBe('custom');
		expect(result.current.timeOverride).toStrictEqual({
			startMs: -3000,
			endMs: 9000,
		});
	});

	it('cannot extend a window already at the widest ladder step', () => {
		const { result } = renderHook(() => useViewPanelTimeWindow());
		// 40 days > the ladder's 1-month max.
		act(() => result.current.onDragSelect(0, 40 * 24 * 60 * 60 * 1000));

		expect(result.current.extendWindow.canExtend).toBe(false);
		expect(result.current.extendWindow.actionLabel).toBeNull();

		// extend() is a no-op — the window is unchanged.
		const before = result.current.timeOverride;
		act(() => result.current.extendWindow.extend());
		expect(result.current.timeOverride).toStrictEqual(before);
	});
});
