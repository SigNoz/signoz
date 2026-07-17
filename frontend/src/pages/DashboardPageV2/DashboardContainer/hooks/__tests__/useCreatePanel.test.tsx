import { act, renderHook } from '@testing-library/react';
import { NANO_SECOND_MULTIPLIER } from 'store/globalTime';

import { useCreatePanel } from '../useCreatePanel';

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

describe('useCreatePanel', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockGlobalTime = { selectedTime: '30m', minTime: 0, maxTime: 0 };
	});

	it('carries the relative time window onto the new-panel route', () => {
		mockGlobalTime = { selectedTime: '6h', minTime: 0, maxTime: 0 };
		const { result } = renderHook(() => useCreatePanel());
		act(() => {
			result.current.createPanel('timeSeries' as never, 2);
		});

		const [url] = mockSafeNavigate.mock.calls[0];
		expect(url).toContain('/dashboard/dash-1/panel/new');
		expect(url).toContain('panelKind=timeSeries');
		expect(url).toContain('layoutIndex=2');
		expect(url).toContain('relativeTime=6h');
	});

	it('carries a custom absolute window and never a stray relativeTime', () => {
		mockGlobalTime = {
			selectedTime: 'custom',
			minTime: 1000 * NANO_SECOND_MULTIPLIER,
			maxTime: 2000 * NANO_SECOND_MULTIPLIER,
		};
		const { result } = renderHook(() => useCreatePanel());
		act(() => {
			result.current.createPanel('timeSeries' as never, 2);
		});

		const [url] = mockSafeNavigate.mock.calls[0];
		expect(url).toContain('startTime=1000');
		expect(url).toContain('endTime=2000');
		expect(url).not.toContain('relativeTime');
		expect(url).not.toContain('&&');
	});
});
