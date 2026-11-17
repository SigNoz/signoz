import { ReactNode } from 'react';
import { QueryClient, QueryClientProvider, QueryObserver } from 'react-query';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { getWidgetQueryBuilder } from 'container/MetricsApplication/MetricsApplication.factory';
import { act, renderHook, waitFor } from 'tests/test-utils';
import { Widgets } from 'types/api/widgets/widget';

import { useWidgetQueries } from '../useWidgetQueries';

const widgetWithQueryId = (id: string): Widgets =>
	getWidgetQueryBuilder({
		query: { ...initialQueriesMap.traces, id },
		panelTypes: PANEL_TYPES.TABLE,
	});

const gridCardKey = (queryId: string): unknown[] => [
	REACT_QUERY_KEY.DASHBOARD_GRID_CARD_QUERY_RANGE,
	0,
	0,
	{ id: queryId },
];

function startGridCardFetch(client: QueryClient, queryId: string): void {
	void client.prefetchQuery(gridCardKey(queryId), () => new Promise(() => {}));
}

function renderWidgetQueries(
	client: QueryClient,
	widgets: Widgets[],
): ReturnType<typeof renderHook<ReturnType<typeof useWidgetQueries>, unknown>> {
	return renderHook(() => useWidgetQueries(widgets), {
		wrapper: ({ children }: { children: ReactNode }) => (
			<QueryClientProvider client={client}>{children}</QueryClientProvider>
		),
	});
}

describe('useWidgetQueries', () => {
	it('counts only the given widgets’ grid card queries', async () => {
		const client = new QueryClient();
		const { result } = renderWidgetQueries(client, [widgetWithQueryId('table')]);

		await act(async () => {
			startGridCardFetch(client, 'other-tab-chart');
			await new Promise((resolve) => setTimeout(resolve, 50));
		});
		expect(client.isFetching()).toBe(1);
		expect(result.current.isFetching).toBe(false);

		act(() => startGridCardFetch(client, 'table'));
		await waitFor(() => expect(result.current.isFetching).toBe(true));
	});

	it('refetches only the given widgets’ grid card queries', async () => {
		const client = new QueryClient();
		const fetchTable = jest.fn(() =>
			Promise.resolve('table'),
		) as jest.MockedFunction<() => Promise<string>>;
		const fetchOther = jest.fn(() =>
			Promise.resolve('other'),
		) as jest.MockedFunction<() => Promise<string>>;
		const unsubscribers = [
			new QueryObserver(client, {
				queryKey: gridCardKey('table'),
				queryFn: fetchTable,
			}).subscribe(() => {}),
			new QueryObserver(client, {
				queryKey: gridCardKey('other-tab-chart'),
				queryFn: fetchOther,
			}).subscribe(() => {}),
		];
		await waitFor(() => expect(client.isFetching()).toBe(0));
		const { result } = renderWidgetQueries(client, [widgetWithQueryId('table')]);

		act(() => result.current.refetch());

		await waitFor(() => expect(fetchTable).toHaveBeenCalledTimes(2));
		expect(fetchOther).toHaveBeenCalledTimes(1);
		unsubscribers.forEach((unsubscribe) => unsubscribe());
	});
});
