import { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { act, renderHook, waitFor } from 'tests/test-utils';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { Widgets } from 'types/api/widgets/widget';

import { useIsFetchingWidgets } from '../useIsFetchingWidgets';

const widgetWithQueryId = (id: string): Widgets =>
	({ id: `widget-${id}`, query: { id } as Query }) as Widgets;

function startGridCardFetch(client: QueryClient, queryId: string): void {
	void client.prefetchQuery(
		[REACT_QUERY_KEY.DASHBOARD_GRID_CARD_QUERY_RANGE, 0, 0, { id: queryId }],
		() => new Promise(() => {}),
	);
}

describe('useIsFetchingWidgets', () => {
	it('counts only the given widgets’ grid card queries', async () => {
		const client = new QueryClient();
		const { result } = renderHook(
			() => useIsFetchingWidgets([widgetWithQueryId('table')]),
			{
				wrapper: ({ children }: { children: ReactNode }) => (
					<QueryClientProvider client={client}>{children}</QueryClientProvider>
				),
			},
		);

		await act(async () => {
			startGridCardFetch(client, 'other-tab-chart');
			await new Promise((resolve) => setTimeout(resolve, 50));
		});
		expect(client.isFetching()).toBe(1);
		expect(result.current).toBe(false);

		act(() => startGridCardFetch(client, 'table'));
		await waitFor(() => expect(result.current).toBe(true));
	});
});
