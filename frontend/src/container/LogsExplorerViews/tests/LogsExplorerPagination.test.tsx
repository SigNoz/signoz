import ROUTES from 'constants/routes';
import {
	logsPaginationQueryRangeSuccessResponse,
	PAGE_SIZE,
} from 'mocks-server/__mockdata__/logs_query_range';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import LogsExplorer from 'pages/LogsExplorer';
import React from 'react';
import { I18nextProvider } from 'react-i18next';
import { VirtuosoMockContext } from 'react-virtuoso';
import i18n from 'ReactI18';
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

const API_ENDPOINT = 'http://localhost/api/v4/query_range';

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

jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useLocation: (): { search: string; pathname: string } => ({
		pathname: ROUTES.LOGS_EXPLORER,
		search:
			'?compositeQuery=%257B%2522queryType%2522%253A%2522builder%2522%252C%2522builder%2522%253A%257B%2522queryData%2522%253A%255B%257B%2522dataSource%2522%253A%2522logs%2522%252C%2522queryName%2522%253A%2522A%2522%252C%2522aggregateOperator%2522%253A%2522noop%2522%252C%2522aggregateAttribute%2522%253A%257B%2522id%2522%253A%2522------%2522%252C%2522dataType%2522%253A%2522%2522%252C%2522key%2522%253A%2522%2522%252C%2522isColumn%2522%253Afalse%252C%2522type%2522%253A%2522%2522%252C%2522isJSON%2522%253Afalse%257D%252C%2522timeAggregation%2522%253A%2522rate%2522%252C%2522spaceAggregation%2522%253A%2522sum%2522%252C%2522functions%2522%253A%255B%255D%252C%2522filters%2522%253A%257B%2522items%2522%253A%255B%255D%252C%2522op%2522%253A%2522AND%2522%257D%252C%2522expression%2522%253A%2522A%2522%252C%2522disabled%2522%253Afalse%252C%2522stepInterval%2522%253A60%252C%2522having%2522%253A%255B%255D%252C%2522limit%2522%253Anull%252C%2522orderBy%2522%253A%255B%257B%2522columnName%2522%253A%2522timestamp%2522%252C%2522order%2522%253A%2522desc%2522%257D%255D%252C%2522groupBy%2522%253A%255B%255D%252C%2522legend%2522%253A%2522%2522%252C%2522reduceTo%2522%253A%2522avg%2522%257D%255D%252C%2522queryFormulas%2522%253A%255B%255D%257D%252C%2522promql%2522%253A%255B%257B%2522name%2522%253A%2522A%2522%252C%2522query%2522%253A%2522%2522%252C%2522legend%2522%253A%2522%2522%252C%2522disabled%2522%253Afalse%257D%255D%252C%2522clickhouse_sql%2522%253A%255B%257B%2522name%2522%253A%2522A%2522%252C%2522legend%2522%253A%2522%2522%252C%2522disabled%2522%253Afalse%252C%2522query%2522%253A%2522%2522%257D%255D%252C%2522id%2522%253A%25220d764438-8023-44b9-9bab-2f05012eca7b%2522%257D&options=%7B%22selectColumns%22%3A%5B%7B%22key%22%3A%22timestamp%22%2C%22dataType%22%3A%22string%22%2C%22type%22%3A%22tag%22%2C%22isColumn%22%3Atrue%2C%22isJSON%22%3Afalse%2C%22id%22%3A%22timestamp--string--tag--true%22%2C%22isIndexed%22%3Afalse%7D%2C%7B%22key%22%3A%22body%22%2C%22dataType%22%3A%22string%22%2C%22type%22%3A%22tag%22%2C%22isColumn%22%3Atrue%2C%22isJSON%22%3Afalse%2C%22id%22%3A%22body--string--tag--true%22%2C%22isIndexed%22%3Afalse%7D%5D%2C%22maxLines%22%3A2%2C%22format%22%3A%22raw%22%2C%22fontSize%22%3A%22small%22%2C%22version%22%3A1%7D',
	}),
}));

jest.mock('hooks/useSafeNavigate', () => ({
	useSafeNavigate: (): any => ({
		safeNavigate: jest.fn(),
	}),
}));

jest.mock(
	'container/TopNav/DateTimeSelectionV2/index.tsx',
	() =>
		function MockDateTimeSelection(): JSX.Element {
			return <div>MockDateTimeSelection</div>;
		},
);
jest.mock(
	'container/LogsExplorerChart',
	() =>
		function MockLogsExplorerChart(): JSX.Element {
			return <div>MockLogsExplorerChart</div>;
		},
);
jest.mock(
	'container/QueryBuilder/filters/QueryBuilderSearchV2/QueryBuilderSearchV2',
	() =>
		function MockQueryBuilderSearchV2(): JSX.Element {
			return <div>MockQueryBuilderSearchV2</div>;
		},
);
jest.mock(
	'container/ExplorerOptions/ExplorerOptionWrapper',
	() =>
		function MockExplorerOptionWrapper(): JSX.Element {
			return <div>MockExplorerOptionWrapper</div>;
		},
);
jest.mock(
	'components/QuickFilters/QuickFilters',
	() =>
		function MockQuickFilters(): JSX.Element {
			return <div>MockQuickFilters</div>;
		},
);

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

// --- Test Utilities ---

// Helper function to create a mock API response with a given offset
const createMockResponse = (offset: number): QueryRangePayload =>
	logsPaginationQueryRangeSuccessResponse({ offset });

const setupServer = (capturedPayloads: QueryRangePayload[]): void => {
	server.use(
		rest.post(API_ENDPOINT, async (req, res, ctx) => {
			const payload = await req.json();
			// Only capture payloads for the 'list' panel type
			if (payload.compositeQuery.panelType === 'list') {
				capturedPayloads.push(payload);
			}
			// Get the offset from the latest captured payload
			const lastPayload = capturedPayloads[capturedPayloads.length - 1];
			const queryData = lastPayload?.compositeQuery.builderQueries
				?.A as IBuilderQuery;
			const offset = queryData?.offset ?? 0;
			return res(ctx.status(200), ctx.json(createMockResponse(offset)));
		}),
	);
};

// Helper function to verify properties of a captured payload
export const verifyPayload = ({
	payload,
	expectedOffset,
	initialTimeRange,
}: {
	payload: QueryRangePayload;
	expectedOffset: number;
	initialTimeRange?: { start: number; end: number };
}): IBuilderQuery => {
	// Extract the builder query data for query name 'A'
	const queryData = payload.compositeQuery.builderQueries?.A as IBuilderQuery;
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

export const verifyFiltersAndOrderBy = (queryData: IBuilderQuery): void => {
	// Verify that the 'id' filter is not present in the pagination query
	const thirdIdFilter = queryData.filters?.items?.find(
		(item) => item?.key?.key === 'id',
	);
	expect(thirdIdFilter).toBeUndefined();

	// Verify the sorting order includes 'id' if 'timestamp' is present
	const OrderByTimestamp = queryData.orderBy?.find(
		(item) => item.columnName === 'timestamp',
	);
	const orderById = queryData.orderBy?.find((item) => item.columnName === 'id');

	if (OrderByTimestamp) {
		expect(orderById).toBeDefined();
		// Ensure the 'id' sorting order matches the 'timestamp' sorting order
		expect(orderById?.order).toBe(OrderByTimestamp.order);
	}
};

describe.skip('LogsExplorerViews Pagination', () => {
	// Array to store captured API request payloads
	let capturedPayloads: QueryRangePayload[];

	beforeEach(() => {
		// Use real timers for test setup, especially for server delays
		jest.useRealTimers();
		// Reset captured payloads array before each test
		capturedPayloads = [];
		// Setup the mock server to intercept and capture requests
		setupServer(capturedPayloads);
	});

	afterAll(() => {
		// Use fake timers after the tests are done.
		jest.useFakeTimers();
		// Explicitly set the fake system time if needed by other tests
		jest.setSystemTime(new Date('2023-10-20'));
	});

	it('should fetch next page with correct payload when scrolled to end', async () => {
		let renderResult: RenderResult;
		// Define item height and viewport height for Virtuoso mock
		const itemHeight = 100;
		const viewportHeight = 500;
		// Get the initial number of items from the mock response
		const initialItemCount = PAGE_SIZE;

		// Calculate the scroll position needed to reach the end of the initial list
		const totalHeight = initialItemCount * itemHeight;
		const targetScrollTop = totalHeight - viewportHeight;
		let scrollableElement: HTMLElement;

		act(() => {
			renderResult = render(
				<VirtuosoMockContext.Provider value={{ viewportHeight, itemHeight }}>
					<I18nextProvider i18n={i18n}>
						<LogsExplorer />
					</I18nextProvider>
				</VirtuosoMockContext.Provider>,
			);
		});

		// Wait for the initial data load to complete (pending_data_placeholder disappears)
		await waitFor(() => {
			expect(
				screen.queryByText('pending_data_placeholder'),
			).not.toBeInTheDocument();
			expect(capturedPayloads.length).toBe(1);
		});

		// Verify the payload of the first call, expecting offset 0
		const firstPayload = capturedPayloads[0];
		verifyPayload({ payload: firstPayload, expectedOffset: 0 });

		// Wait for the scrollable element to be available and simulate scrolling
		await waitFor(async () => {
			// Find the Virtuoso scroller element by its data-test-id
			scrollableElement = renderResult.container.querySelector(
				'[data-test-id="virtuoso-scroller"]',
			) as HTMLElement;

			// Ensure the element exists
			expect(scrollableElement).not.toBeNull();

			if (scrollableElement) {
				// Set the scrollTop property to simulate scrolling to the calculated end position
				scrollableElement.scrollTop = targetScrollTop;

				act(() => {
					fireEvent.scroll(scrollableElement);
				});
			}
		});

		// Verify the second page request was made
		// Wait for the second API call to be captured after the scroll
		await waitFor(() => {
			expect(capturedPayloads.length).toBe(2);
		});

		// Store the time range from the first payload, which should be consistent in subsequent requests
		const initialTimeRange = {
			start: firstPayload.start,
			end: firstPayload.end,
		};

		// Verify the payload of the second call, expecting offset 100 and consistent time range
		const secondPayload = capturedPayloads[1];
		const secondQueryData = verifyPayload({
			payload: secondPayload,
			expectedOffset: 100,
			initialTimeRange,
		});
		verifyFiltersAndOrderBy(secondQueryData);

		// Simulate the second scroll to load the third page
		await waitFor(async () => {
			// Calculate the total height assuming two pages are loaded
			const totalHeightAfterSecondLoad = 2 * initialItemCount * itemHeight;

			// Calculate the scroll position needed to trigger the load of the next page
			const targetScrollTopAfterSecondLoad =
				totalHeightAfterSecondLoad - viewportHeight;

			// Simulate scrolling towards the end of the now larger scrollable area
			scrollableElement.scrollTop = targetScrollTopAfterSecondLoad;

			// Fire the scroll event
			act(() => {
				fireEvent.scroll(scrollableElement);
			});
		});

		// Verify the third page request was made
		// Wait for the third API call to be captured
		await waitFor(() => {
			expect(capturedPayloads.length).toBe(3);
		});
		const thirdPayload = capturedPayloads[2];
		// Verify the payload of the third call, expecting offset 200 and consistent time range
		const thirdQueryData = verifyPayload({
			payload: thirdPayload,
			expectedOffset: 200,
			initialTimeRange,
		});

		verifyFiltersAndOrderBy(thirdQueryData);
	});
});
