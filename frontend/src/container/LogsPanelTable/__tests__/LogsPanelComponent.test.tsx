import { ENVIRONMENT } from 'constants/env';
import { PANEL_TYPES } from 'constants/queryBuilder';
import NewWidget from 'container/NewWidget';
import { logsPaginationQueryRangeSuccessResponse } from 'mocks-server/__mockdata__/logs_query_range';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { DashboardProvider } from 'providers/Dashboard/Dashboard';
import { PreferenceContextProvider } from 'providers/preferences/context/PreferenceContextProvider';
import { I18nextProvider } from 'react-i18next';
import i18n from 'ReactI18';
import { act, fireEvent, render, screen, waitFor } from 'tests/test-utils';
import { QueryRangePayload } from 'types/api/metrics/getQueryRange';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';

// Constants
const QUERY_RANGE_URL = `${ENVIRONMENT.baseURL}/api/v3/query_range`;
const MOCK_SEARCH_PARAMS =
	'?graphType=list&widgetId=36a7b342-c642-4b92-abe4-cb833a244786&compositeQuery=%7B%22id%22%3A%22b325ac88-5e75-4117-a38c-1a2a7caf8115%22%2C%22builder%22%3A%7B%22queryData%22%3A%5B%7B%22dataSource%22%3A%22logs%22%2C%22queryName%22%3A%22A%22%2C%22aggregateOperator%22%3A%22noop%22%2C%22aggregateAttribute%22%3A%7B%22id%22%3A%22------%22%2C%22dataType%22%3A%22%22%2C%22key%22%3A%22%22%2C%22isColumn%22%3Afalse%2C%22type%22%3A%22%22%2C%22isJSON%22%3Afalse%7D%2C%22timeAggregation%22%3A%22rate%22%2C%22spaceAggregation%22%3A%22sum%22%2C%22functions%22%3A%5B%5D%2C%22filters%22%3A%7B%22items%22%3A%5B%5D%2C%22op%22%3A%22AND%22%7D%2C%22expression%22%3A%22A%22%2C%22disabled%22%3Afalse%2C%22stepInterval%22%3A60%2C%22having%22%3A%5B%5D%2C%22limit%22%3Anull%2C%22orderBy%22%3A%5B%7B%22columnName%22%3A%22timestamp%22%2C%22order%22%3A%22desc%22%7D%5D%2C%22groupBy%22%3A%5B%5D%2C%22legend%22%3A%22%22%2C%22reduceTo%22%3A%22avg%22%2C%22offset%22%3A0%2C%22pageSize%22%3A100%7D%5D%2C%22queryFormulas%22%3A%5B%5D%7D%2C%22clickhouse_sql%22%3A%5B%7B%22name%22%3A%22A%22%2C%22legend%22%3A%22%22%2C%22disabled%22%3Afalse%2C%22query%22%3A%22%22%7D%5D%2C%22promql%22%3A%5B%7B%22name%22%3A%22A%22%2C%22query%22%3A%22%22%2C%22legend%22%3A%22%22%2C%22disabled%22%3Afalse%7D%5D%2C%22queryType%22%3A%22builder%22%7D&relativeTime=30m&options=%7B%22selectColumns%22%3A%5B%5D%2C%22maxLines%22%3A2%2C%22format%22%3A%22list%22%2C%22fontSize%22%3A%22small%22%7D';

// Mocks

jest.mock('components/OverlayScrollbar/OverlayScrollbar', () => ({
	__esModule: true,
	default: ({ children }: { children: React.ReactNode }): JSX.Element => (
		<div>{children}</div>
	),
}));

jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useLocation: (): { pathname: string; search: string } => ({
		pathname: '',
		search: MOCK_SEARCH_PARAMS,
	}),
}));

jest.mock('hooks/useSafeNavigate', () => ({
	useSafeNavigate: (): { safeNavigate: jest.Mock } => ({
		safeNavigate: jest.fn(),
	}),
}));

jest.mock('container/TopNav/DateTimeSelectionV2/index.tsx', () => ({
	__esModule: true,
	default: (): JSX.Element => <div>MockDateTimeSelection</div>,
}));

// Helpers
const getBuilderQuery = (payload: QueryRangePayload): IBuilderQuery =>
	payload.compositeQuery.builderQueries?.A as IBuilderQuery;

const assertTimeRangeConsistency = (
	payload: QueryRangePayload,
	initialTimeRange: { start: number; end: number },
): void => {
	expect(payload.start).toBe(initialTimeRange.start);
	expect(payload.end).toBe(initialTimeRange.end);
};

jest.mock('container/QueryBuilder', () => ({
	QueryBuilder: function MockQuerySection(): JSX.Element {
		return <div>MockQuerySection</div>;
	},
}));

jest.setTimeout(20000);

Object.defineProperty(globalThis, 'matchMedia', {
	writable: true,
	value: jest.fn().mockImplementation((query) => ({
		matches: true,
		media: query,
		addListener: (listener: (params: { matches: boolean }) => void): void => {
			listener({ matches: true });
		},
		removeListener: jest.fn(),
	})),
});

describe('LogsPanelComponent', () => {
	let capturedQueryRangePayloads: QueryRangePayload[] = [];

	beforeEach(() => {
		capturedQueryRangePayloads = [];
		server.use(
			rest.post(QUERY_RANGE_URL, async (req, res, ctx) => {
				const payload = await req.json();
				capturedQueryRangePayloads.push(payload);

				const queryData = getBuilderQuery(payload);
				return res(
					ctx.status(200),
					ctx.json(
						logsPaginationQueryRangeSuccessResponse({
							offset: queryData?.offset ?? 0,
							pageSize: 10,
						}),
					),
				);
			}),
		);
	});

	const renderComponent = async (): Promise<void> => {
		render(
			<I18nextProvider i18n={i18n}>
				<DashboardProvider>
					<PreferenceContextProvider>
						<NewWidget
							selectedGraph={PANEL_TYPES.LIST}
							fillSpans={undefined}
							yAxisUnit={undefined}
						/>
					</PreferenceContextProvider>
				</DashboardProvider>
			</I18nextProvider>,
		);

		await waitFor(() => {
			expect(screen.queryByText('No data')).not.toBeInTheDocument();
		});
	};

	it.skip('should handle pagination flows correctly', async () => {
		await renderComponent();
		const initialTimeRange = {
			start: capturedQueryRangePayloads[0].start,
			end: capturedQueryRangePayloads[0].end,
		};

		act(() => {
			fireEvent.click(screen.getByRole('button', { name: /next/i }));
		});
		await waitFor(() => {
			expect(capturedQueryRangePayloads).toHaveLength(2);
		});

		const firstPayload = capturedQueryRangePayloads[0];
		const secondPayload = capturedQueryRangePayloads[1];

		const firstQueryData = getBuilderQuery(firstPayload);
		const secondQueryData = getBuilderQuery(secondPayload);

		expect(firstQueryData.offset).toBe(0);
		expect(secondQueryData.offset).toBe(10);
		assertTimeRangeConsistency(secondPayload, initialTimeRange);
		const idFilter = secondQueryData.filters?.items?.find(
			(item) => item?.key?.key === 'id',
		);
		expect(idFilter).toBeUndefined();

		const secondOrderByTimestamp = secondQueryData.orderBy?.find(
			(item) => item.columnName === 'timestamp',
		);
		const secondOrderById = secondQueryData.orderBy?.find(
			(item) => item.columnName === 'id',
		);
		expect(secondOrderByTimestamp).toBeDefined();
		expect(secondOrderById).toBeDefined();
		expect(secondOrderById?.order).toBe(secondOrderByTimestamp?.order);

		act(() => {
			fireEvent.click(screen.getByRole('button', { name: /previous/i }));
		});
		await waitFor(() => {
			expect(capturedQueryRangePayloads).toHaveLength(3);
		});

		const thirdPayload = capturedQueryRangePayloads[2];
		const thirdQueryData = getBuilderQuery(thirdPayload);
		expect(thirdQueryData.offset).toBe(0);
		assertTimeRangeConsistency(thirdPayload, initialTimeRange);
		const thirdIdFilter = thirdQueryData.filters?.items?.find(
			(item) => item?.key?.key === 'id',
		);
		expect(thirdIdFilter).toBeUndefined();

		const thirdOrderByTimestamp = thirdQueryData.orderBy?.find(
			(item) => item.columnName === 'timestamp',
		);
		const thirdOrderById = thirdQueryData.orderBy?.find(
			(item) => item.columnName === 'id',
		);
		expect(thirdOrderByTimestamp).toBeDefined();
		expect(thirdOrderById).toBeDefined();
		expect(thirdOrderById?.order).toBe(thirdOrderByTimestamp?.order);
	});
});
