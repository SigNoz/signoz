import { ENVIRONMENT } from 'constants/env';
import {
	verifyFiltersAndOrderBy,
	verifyPayload,
} from 'container/LogsExplorerViews/tests/LogsExplorerPagination.test';
import { logsPaginationQueryRangeSuccessResponse } from 'mocks-server/__mockdata__/logs_query_range';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { VirtuosoMockContext } from 'react-virtuoso';
import {
	act,
	fireEvent,
	render,
	RenderResult,
	waitFor,
} from 'tests/test-utils';
import { QueryRangePayload } from 'types/api/metrics/getQueryRange';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';

import HostMetricsLogs from '../HostMetricsLogs';

jest.mock('uplot', () => {
	const paths = {
		spline: jest.fn(),
		bars: jest.fn(),
	};
	const uplotMock = jest.fn(() => ({
		paths,
	}));
	return {
		paths,
		default: uplotMock,
	};
});

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

describe('HostMetricsLogs', () => {
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

					const queryData = lastPayload?.compositeQuery.builderQueries
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
	it('should check if host logs pagination flows work properly', async () => {
		let renderResult: RenderResult;
		let scrollableElement: HTMLElement;

		await act(async () => {
			renderResult = render(
				<VirtuosoMockContext.Provider value={{ viewportHeight: 500, itemHeight }}>
					<HostMetricsLogs
						timeRange={{ startTime: 0, endTime: 0 }}
						filters={{ items: [], op: 'AND' }}
					/>
				</VirtuosoMockContext.Provider>,
			);
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
		verifyPayload({
			payload: firstPayload,
			expectedOffset: 0,
		});

		// Store the time range from the first payload, which should be consistent in subsequent requests
		const initialTimeRange = {
			start: firstPayload.start,
			end: firstPayload.end,
		};

		const secondPayload = capturedQueryRangePayloads[1];
		const secondQueryData = verifyPayload({
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
		const thirdQueryData = verifyPayload({
			payload: thirdPayload,
			expectedOffset: 200,
			initialTimeRange,
		});
		verifyFiltersAndOrderBy(thirdQueryData);
	});
});
