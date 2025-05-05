import ROUTES from 'constants/routes';
import { logsPaginationQueryRangeSuccessResponse } from 'mocks-server/__mockdata__/logs_query_range';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import LogsExplorer from 'pages/LogsExplorer';
import React from 'react';
import { I18nextProvider } from 'react-i18next';
import { VirtuosoMockContext } from 'react-virtuoso';
import i18n from 'ReactI18';
import { act, render, RenderResult, screen, waitFor } from 'tests/test-utils';
import { QueryRangePayload } from 'types/api/metrics/getQueryRange';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';

// Constants
const ITEM_HEIGHT = 100;
const PAGE_SIZE = 100;
const API_ENDPOINT = 'http://localhost/api/v3/query_range';

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

// Test utilities
const createMockResponse = (offset: number): QueryRangePayload =>
	logsPaginationQueryRangeSuccessResponse(offset);

const setupServer = (capturedPayloads: QueryRangePayload[]): void => {
	server.use(
		rest.post(API_ENDPOINT, async (req, res, ctx) => {
			const payload = await req.json();
			if (payload.compositeQuery.panelType === 'list') {
				capturedPayloads.push(payload);
			}
			const lastPayload = capturedPayloads[capturedPayloads.length - 1];
			const queryData = lastPayload?.compositeQuery.builderQueries
				?.A as IBuilderQuery;
			const offset = queryData?.offset ?? 0;
			return res(ctx.status(200), ctx.json(createMockResponse(offset)));
		}),
	);
};

const renderLogsExplorer = (totalHeight: number): RenderResult =>
	render(
		<VirtuosoMockContext.Provider
			value={{ viewportHeight: totalHeight * 2, itemHeight: ITEM_HEIGHT }}
		>
			<I18nextProvider i18n={i18n}>
				<LogsExplorer />
			</I18nextProvider>
		</VirtuosoMockContext.Provider>,
	);

const verifyPayload = (
	payload: QueryRangePayload,
	expectedOffset: number,
	initialTimeRange?: { start: number; end: number },
): IBuilderQuery => {
	const queryData = payload.compositeQuery.builderQueries?.A as IBuilderQuery;
	expect(queryData).toBeDefined();
	expect(queryData.offset).toBe(expectedOffset);

	if (initialTimeRange) {
		expect(payload.start).toBe(initialTimeRange.start);
		expect(payload.end).toBe(initialTimeRange.end);
	}

	return queryData;
};

describe('LogsExplorerViews Pagination', () => {
	let capturedPayloads: QueryRangePayload[];

	beforeEach(() => {
		capturedPayloads = [];
		setupServer(capturedPayloads);
	});

	it('should fetch pages with correct offsets, constant time range, and match snapshot after third request', async () => {
		const initialItemCount = logsPaginationQueryRangeSuccessResponse(0).data
			.result[0].list.length;
		const totalHeight = initialItemCount * ITEM_HEIGHT;

		act(() => {
			renderLogsExplorer(totalHeight);
		});

		// Verify first request
		await waitFor(() => {
			expect(capturedPayloads.length).toBeGreaterThanOrEqual(1);
			expect(
				screen.queryByText('pending_data_placeholder'),
			).not.toBeInTheDocument();
		});

		const firstPayload = capturedPayloads[0];
		verifyPayload(firstPayload, 0);
		const initialTimeRange = { start: firstPayload.start, end: firstPayload.end };

		// Verify second request
		await waitFor(() => {
			expect(capturedPayloads.length).toBeGreaterThanOrEqual(2);
		});

		const secondPayload = capturedPayloads[1];
		const secondQueryData = verifyPayload(
			secondPayload,
			PAGE_SIZE,
			initialTimeRange,
		);

		// Verify filters and ordering
		const idFilter = secondQueryData.filters?.items?.find(
			(item) => item?.key?.key === 'id',
		);
		expect(idFilter).toBeUndefined();

		const orderByTimestamp = secondQueryData.orderBy?.find(
			(item) => item.columnName === 'timestamp',
		);
		const orderById = secondQueryData.orderBy?.find(
			(item) => item.columnName === 'id',
		);

		if (orderByTimestamp) {
			expect(orderById).toBeDefined();
			expect(orderById?.order).toBe(orderByTimestamp.order);
		}
	});
});
