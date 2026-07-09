import { renderHook, waitFor } from '@testing-library/react';
import { getPublicDashboardPanelQueryRangeV2 } from 'api/generated/services/dashboard';
import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';

import { usePublicPanelQuery } from '../usePublicPanelQuery';

jest.mock('api/generated/services/dashboard', () => ({
	getPublicDashboardPanelQueryRangeV2: jest.fn(),
}));

const mockFetch = getPublicDashboardPanelQueryRangeV2 as jest.Mock;

const wrapper = ({ children }: { children: ReactNode }): JSX.Element => {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

// A timeseries panel with a single runnable builder query (non-metrics signal → runnable).
const panel = {
	kind: 'Panel',
	spec: {
		display: { name: 'panel-1' },
		plugin: { kind: 'signoz/TimeSeriesPanel', spec: { visualization: {} } },
		queries: [
			{
				kind: 'time_series',
				spec: {
					name: 'A',
					plugin: {
						kind: 'signoz/BuilderQuery',
						spec: { name: 'A', signal: 'logs', legend: 'My legend' },
					},
				},
			},
		],
	},
} as unknown as DashboardtypesPanelDTO;

const args = {
	panel,
	panelKey: 'panel-1',
	publicDashboardId: 'pub-1',
	startMs: 1000,
	endMs: 2000,
};

describe('usePublicPanelQuery', () => {
	beforeEach(() => mockFetch.mockReset());

	it('fetches by panel key + time and exposes the response as PanelQueryData', async () => {
		mockFetch.mockResolvedValue({
			status: 'success',
			data: { type: 'time_series', data: { results: [] } },
		});

		const { result } = renderHook(() => usePublicPanelQuery(args), { wrapper });

		await waitFor(() => expect(result.current.isFetching).toBe(false));

		expect(mockFetch).toHaveBeenCalledWith(
			{ id: 'pub-1', key: 'panel-1' },
			{ startTime: '1000', endTime: '2000' },
			expect.anything(),
		);
		expect(result.current.data.response?.status).toBe('success');
		expect(result.current.data.legendMap).toStrictEqual({ A: 'My legend' });
		expect(result.current.data.requestPayload?.start).toBe(1000);
		expect(result.current.data.requestPayload?.end).toBe(2000);
		// The public endpoint has no paging support.
		expect(result.current.pagination).toBeUndefined();
	});

	it('does not fetch without a public dashboard id', () => {
		renderHook(() => usePublicPanelQuery({ ...args, publicDashboardId: '' }), {
			wrapper,
		});
		expect(mockFetch).not.toHaveBeenCalled();
	});

	it('does not fetch when the panel has no runnable queries', () => {
		const emptyPanel = {
			kind: 'Panel',
			spec: {
				display: { name: 'empty' },
				plugin: { kind: 'signoz/TimeSeriesPanel', spec: {} },
				queries: [],
			},
		} as unknown as DashboardtypesPanelDTO;

		renderHook(() => usePublicPanelQuery({ ...args, panel: emptyPanel }), {
			wrapper,
		});
		expect(mockFetch).not.toHaveBeenCalled();
	});

	it('does not fetch when disabled', () => {
		renderHook(() => usePublicPanelQuery({ ...args, enabled: false }), {
			wrapper,
		});
		expect(mockFetch).not.toHaveBeenCalled();
	});
});
