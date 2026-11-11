import { renderHook } from '@testing-library/react';
import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import { NANO_SECOND_MULTIPLIER } from 'store/globalTime';
import { EQueryType } from 'types/common/dashboard';

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

	it("carries the panel's saved query into the editor URL", () => {
		mockGlobalTime = { selectedTime: '6h', minTime: 0, maxTime: 0 };
		const panel = {
			kind: 'Panel',
			spec: {
				display: { name: 'Panel A' },
				plugin: { kind: 'signoz/TimeSeriesPanel', spec: {} },
				queries: [
					{
						kind: 'time_series',
						spec: {
							plugin: {
								kind: 'signoz/PromQLQuery',
								spec: { name: 'A', query: 'up{job="alpha"}', disabled: false },
							},
						},
					},
				],
			},
		} as unknown as DashboardtypesPanelDTO;

		const { result } = renderHook(() => useOpenPanelEditor());
		result.current('panel-9', { panel });

		const [url] = mockSafeNavigate.mock.calls[0];
		const carried = new URLSearchParams(url.split('?')[1]).get('compositeQuery');
		const parsed = JSON.parse(decodeURIComponent(carried as string));
		expect(parsed.queryType).toBe(EQueryType.PROM);
		expect(parsed.promql[0].query).toBe('up{job="alpha"}');
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
