import { ENVIRONMENT } from 'constants/env';
import { K8sCategory } from 'container/InfraMonitoringK8s/constants';
import { verifyFiltersAndOrderBy } from 'container/LogsExplorerViews/tests/LogsExplorerPagination.test';
import { logsPaginationQueryRangeSuccessResponse } from 'mocks-server/__mockdata__/logs_query_range';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { VirtuosoMockContext } from 'react-virtuoso';
import {
	act,
	fireEvent,
	render,
	RenderResult,
	screen,
	waitFor,
} from 'tests/test-utils';
import { QueryRangePayload } from 'types/api/metrics/getQueryRange';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';

import EntityLogs from '../EntityLogs';

// Custom verifyPayload function for EntityLogs that works with the correct payload structure
const verifyEntityLogsPayload = ({
	payload,
	expectedOffset,
	initialTimeRange,
}: {
	payload: QueryRangePayload;
	expectedOffset: number;
	initialTimeRange?: { start: number; end: number };
}): IBuilderQuery => {
	// Extract the builder query data from the correct path
	const queryData = payload?.compositeQuery?.builderQueries?.A as IBuilderQuery;

	expect(queryData).toBeDefined();
	// Assert that the offset in the payload matches the expected offset
	expect(queryData.offset).toBe(expectedOffset);

	// If initial time range is provided, assert that the payload start and end match
	if (initialTimeRange) {
		expect(payload.start).toBe(initialTimeRange.start);
		expect(payload.end).toBe(initialTimeRange.end);
	}

	return queryData;
};

jest.mock(
	'components/OverlayScrollbar/OverlayScrollbar',
	() =>
		function MockOverlayScrollbar({
			children,
		}: {
			children: React.ReactNode;
		}): JSX.Element {
			return <div>{children}</div>;
		},
);

describe('EntityLogs', () => {
	let capturedQueryRangePayloads: QueryRangePayload[] = [];
	const itemHeight = 100;

	beforeEach(() => {
		server.use(
			rest.post(
				`${ENVIRONMENT.baseURL}/api/v3/query_range`,
				async (req, res, ctx) => {
					capturedQueryRangePayloads.push(await req.json());

					const lastPayload =
						capturedQueryRangePayloads[capturedQueryRangePayloads.length - 1];

					const queryData = (lastPayload as any)?.compositeQuery?.builderQueries
						?.A as IBuilderQuery;

					const offset = queryData?.offset ?? 0;
					return res(
						ctx.status(200),
						ctx.json(logsPaginationQueryRangeSuccessResponse({ offset })),
					);
				},
			),
		);
		capturedQueryRangePayloads = [];
	});
	it('should check if k8s logs pagination flows work properly', async () => {
		let renderResult: RenderResult;
		let scrollableElement: HTMLElement;

		act(() => {
			renderResult = render(
				<VirtuosoMockContext.Provider value={{ viewportHeight: 500, itemHeight }}>
					<EntityLogs
						timeRange={{ startTime: 1, endTime: 2 }}
						filters={{ items: [], op: 'AND' }}
						queryKey="test"
						category={K8sCategory.PODS}
						queryKeyFilters={[]}
					/>
				</VirtuosoMockContext.Provider>,
			);
		});

		await waitFor(() => {
			expect(
				screen.queryByText('pending_data_placeholder'),
			).not.toBeInTheDocument();
		});

		await waitFor(() => {
			expect(capturedQueryRangePayloads.length).toBe(1);
		});

		await waitFor(async () => {
			// Find the Virtuoso scroller element by its data-test-id
			scrollableElement = renderResult.container.querySelector(
				'[data-test-id="virtuoso-scroller"]',
			) as HTMLElement;

			// Ensure the element exists
			expect(scrollableElement).not.toBeNull();

			if (scrollableElement) {
				// Set the scrollTop property to simulate scrolling to the calculated end position
				scrollableElement.scrollTop = 99 * itemHeight;

				act(() => {
					fireEvent.scroll(scrollableElement);
				});
			}
		});

		await waitFor(() => {
			expect(capturedQueryRangePayloads.length).toBe(2);
		});

		const firstPayload = capturedQueryRangePayloads[0];
		verifyEntityLogsPayload({
			payload: firstPayload,
			expectedOffset: 0,
		});

		// Store the time range from the first payload, which should be consistent in subsequent requests
		const initialTimeRange = {
			start: firstPayload.start,
			end: firstPayload.end,
		};

		const secondPayload = capturedQueryRangePayloads[1];
		const secondQueryData = verifyEntityLogsPayload({
			payload: secondPayload,
			expectedOffset: 100,
			initialTimeRange,
		});
		verifyFiltersAndOrderBy(secondQueryData);

		await waitFor(async () => {
			// Find the Virtuoso scroller element by its data-test-id
			scrollableElement = renderResult.container.querySelector(
				'[data-test-id="virtuoso-scroller"]',
			) as HTMLElement;

			// Ensure the element exists
			expect(scrollableElement).not.toBeNull();

			if (scrollableElement) {
				// Set the scrollTop property to simulate scrolling to the calculated end position
				scrollableElement.scrollTop = 199 * itemHeight;

				act(() => {
					fireEvent.scroll(scrollableElement);
				});
			}
		});

		await waitFor(() => {
			expect(capturedQueryRangePayloads.length).toBeGreaterThanOrEqual(3);
		});

		const thirdPayload = capturedQueryRangePayloads[2];
		const thirdQueryData = verifyEntityLogsPayload({
			payload: thirdPayload,
			expectedOffset: 200,
			initialTimeRange,
		});
		verifyFiltersAndOrderBy(thirdQueryData);
	});
});
