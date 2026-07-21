import { renderHook } from '@testing-library/react';
import { NANO_SECOND_MULTIPLIER } from 'store/globalTime';

import { useOpenPanelEditor } from '../useOpenPanelEditor';

const mockSafeNavigate = jest.fn();
jest.mock('hooks/useSafeNavigate', () => ({
	useSafeNavigate: (): { safeNavigate: jest.Mock } => ({
		safeNavigate: mockSafeNavigate,
	}),
}));

let mockGlobalTime = {
	selectedTime: '30m',
	minTime: 0,
	maxTime: 0,
};
jest.mock('react-redux', () => ({
	useSelector: (selector: (state: unknown) => unknown): unknown =>
		selector({ globalTime: mockGlobalTime }),
}));

jest.mock('../../store/useDashboardStore', () => ({
	useDashboardStore: (selector: (state: unknown) => unknown): unknown =>
		selector({ dashboardId: 'dash-1' }),
}));

describe('useOpenPanelEditor', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockGlobalTime = { selectedTime: '30m', minTime: 0, maxTime: 0 };
	});

	it('carries the relative time window into the editor route', () => {
		mockGlobalTime = { selectedTime: '6h', minTime: 0, maxTime: 0 };
		const { result } = renderHook(() => useOpenPanelEditor());
		result.current('panel-9');

		expect(mockSafeNavigate).toHaveBeenCalledWith(
			'/dashboard/dash-1/panel/panel-9?relativeTime=6h',
			undefined,
		);
	});

	it('carries a custom absolute window as a start/end ms pair', () => {
		mockGlobalTime = {
			selectedTime: 'custom',
			minTime: 1000 * NANO_SECOND_MULTIPLIER,
			maxTime: 2000 * NANO_SECOND_MULTIPLIER,
		};
		const { result } = renderHook(() => useOpenPanelEditor());
		result.current('panel-9');

		const [url] = mockSafeNavigate.mock.calls[0];
		expect(url).toContain('startTime=1000');
		expect(url).toContain('endTime=2000');
		// A custom range must not also carry relativeTime (it would win on the editor).
		expect(url).not.toContain('relativeTime');
	});

	it('omits the query string for an uninitialized custom window', () => {
		mockGlobalTime = { selectedTime: 'custom', minTime: 0, maxTime: 0 };
		const { result } = renderHook(() => useOpenPanelEditor());
		result.current('panel-9');

		expect(mockSafeNavigate).toHaveBeenCalledWith(
			'/dashboard/dash-1/panel/panel-9',
			undefined,
		);
	});

	it('forwards handoff state as router location state', () => {
		mockGlobalTime = { selectedTime: '1h', minTime: 0, maxTime: 0 };
		const { result } = renderHook(() => useOpenPanelEditor());
		const handoffState = { editSpec: { title: 'x' } } as never;
		result.current('panel-9', { handoffState });

		expect(mockSafeNavigate).toHaveBeenCalledWith(
			'/dashboard/dash-1/panel/panel-9?relativeTime=1h',
			{ state: handoffState },
		);
	});

	it('merges search with the time window (leading ? tolerated)', () => {
		mockGlobalTime = { selectedTime: '6h', minTime: 0, maxTime: 0 };
		const { result } = renderHook(() => useOpenPanelEditor());
		result.current('new', { search: '?panelKind=timeSeries&layoutIndex=2' });

		const [url] = mockSafeNavigate.mock.calls[0];
		expect(url).toContain('/dashboard/dash-1/panel/new?');
		expect(url).toContain('panelKind=timeSeries');
		expect(url).toContain('layoutIndex=2');
		expect(url).toContain('relativeTime=6h');
	});
});
