import { PANEL_TYPES } from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import LogsExplorerViews from 'container/LogsExplorerViews';
import { mockQueryBuilderContextValue } from 'container/LogsExplorerViews/tests/mock';
import { useGetExplorerQueryRange } from 'hooks/queryBuilder/useGetExplorerQueryRange';
import { logsQueryRangeEmptyResponse } from 'mocks-server/__mockdata__/logs_query_range';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { SELECTED_VIEWS } from 'pages/LogsExplorer/utils';
import { PreferenceContextProvider } from 'providers/preferences/context/PreferenceContextProvider';
import { QueryBuilderContext } from 'providers/QueryBuilder';
import { render } from 'tests/test-utils';

const queryRangeURL = 'http://localhost/api/v3/query_range';

const logsQueryServerRequest = ({
	response = logsQueryRangeEmptyResponse,
}: {
	response?: any;
}): void =>
	server.use(
		rest.post(queryRangeURL, (req, res, ctx) =>
			res(ctx.status(200), ctx.json(response)),
		),
	);

jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useLocation: (): { pathname: string } => ({
		pathname: `${ROUTES.LOGS_EXPLORER}`,
	}),
}));

jest.mock('providers/preferences/sync/usePreferenceSync', () => ({
	usePreferenceSync: (): any => ({
		preferences: {
			columns: [],
			formatting: {
				maxLines: 2,
				format: 'table',
				fontSize: 'small',
				version: 1,
			},
		},
		loading: false,
		error: null,
		updateColumns: jest.fn(),
		updateFormatting: jest.fn(),
	}),
}));

jest.mock(
	'container/TimeSeriesView/TimeSeriesView',
	() =>
		// eslint-disable-next-line func-names, @typescript-eslint/explicit-function-return-type, react/display-name
		function () {
			return <div>Time Series Chart</div>;
		},
);

jest.mock(
	'container/LogsExplorerChart',
	() =>
		// eslint-disable-next-line func-names, @typescript-eslint/explicit-function-return-type, react/display-name
		function () {
			return <div>Histogram Chart</div>;
		},
);

jest.mock('hooks/useSafeNavigate', () => ({
	useSafeNavigate: (): any => ({
		safeNavigate: jest.fn(),
	}),
}));

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

jest.mock('hooks/queryBuilder/useGetExplorerQueryRange', () => ({
	__esModule: true,
	useGetExplorerQueryRange: jest.fn(),
}));

describe('LogsExplorerList - empty states', () => {
	beforeEach(() => {
		(useGetExplorerQueryRange as jest.Mock).mockReturnValue({
			data: { payload: logsQueryRangeEmptyResponse },
		});
		logsQueryServerRequest({});
	});

	it('should display custom empty state when navigating from trace to logs with no results', async () => {
		const mockTraceToLogsContextValue = {
			...mockQueryBuilderContextValue,
			panelType: PANEL_TYPES.LIST,
			stagedQuery: {
				...mockQueryBuilderContextValue.stagedQuery,
				builder: {
					...mockQueryBuilderContextValue.stagedQuery.builder,
					queryData: [
						{
							...mockQueryBuilderContextValue.stagedQuery.builder.queryData[0],
							filters: {
								items: [
									{
										id: 'trace-filter',
										key: {
											key: 'trace_id',
											type: '',
											dataType: 'string',
											isColumn: true,
										},
										op: '=',
										value: 'test-trace-id',
									},
								],
								op: 'AND',
							},
						},
					],
				},
			},
		};

		const { queryByText } = render(
			<QueryBuilderContext.Provider value={mockTraceToLogsContextValue as any}>
				<PreferenceContextProvider>
					<LogsExplorerViews
						selectedView={SELECTED_VIEWS.SEARCH}
						showFrequencyChart
						setIsLoadingQueries={(): void => {}}
						listQueryKeyRef={{ current: {} }}
						chartQueryKeyRef={{ current: {} }}
					/>
				</PreferenceContextProvider>
			</QueryBuilderContext.Provider>,
		);

		// Check for custom empty state message
		expect(queryByText('No logs found for this trace')).toBeInTheDocument();
		expect(
			queryByText(
				'This could be because logs are not linked to traces, logs are not being sent to SigNoz, or no logs were associated with this particular trace.',
			),
		).toBeInTheDocument();

		// Check for documentation links
		expect(queryByText('How to link logs and traces')).toBeInTheDocument();
		expect(queryByText('Sending logs to SigNoz')).toBeInTheDocument();
		expect(
			queryByText('Trace and log correlation best practices'),
		).toBeInTheDocument();
	});
	it('should display empty state when filters are applied and no results are found', async () => {
		const mockTraceToLogsContextValue = {
			...mockQueryBuilderContextValue,
			panelType: PANEL_TYPES.LIST,
			stagedQuery: {
				...mockQueryBuilderContextValue.stagedQuery,
				builder: {
					...mockQueryBuilderContextValue.stagedQuery.builder,
					queryData: [
						{
							...mockQueryBuilderContextValue.stagedQuery.builder.queryData[0],
							filters: {
								items: [
									{
										id: 'service-filter',
										key: {
											key: 'service.name',
											type: '',
											dataType: 'string',
											isColumn: true,
										},
										op: '=',
										value: 'test-service-name',
									},
								],
								op: 'AND',
							},
						},
					],
				},
			},
		};

		const { queryByText } = render(
			<QueryBuilderContext.Provider value={mockTraceToLogsContextValue as any}>
				<PreferenceContextProvider>
					<LogsExplorerViews
						selectedView={SELECTED_VIEWS.SEARCH}
						showFrequencyChart
						setIsLoadingQueries={(): void => {}}
						listQueryKeyRef={{ current: {} }}
						chartQueryKeyRef={{ current: {} }}
					/>
				</PreferenceContextProvider>
			</QueryBuilderContext.Provider>,
		);

		// Check for custom empty state message
		expect(queryByText(/This query had no results./i)).toBeInTheDocument();
		expect(queryByText(/Edit your query and try again!/i)).toBeInTheDocument();
	});
});
