import { PANEL_TYPES } from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import LogsExplorerViews from 'container/LogsExplorerViews';
import { mockQueryBuilderContextValue } from 'container/LogsExplorerViews/tests/mock';
import { useGetExplorerQueryRange } from 'hooks/queryBuilder/useGetExplorerQueryRange';
import { logsQueryRangeEmptyResponse } from 'mocks-server/__mockdata__/logs_query_range';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { PreferenceContextProvider } from 'providers/preferences/context/PreferenceContextProvider';
import { QueryBuilderContext } from 'providers/QueryBuilder';
import { render, screen } from 'tests/test-utils';

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

		render(
			<QueryBuilderContext.Provider value={mockTraceToLogsContextValue as any}>
				<PreferenceContextProvider>
					<LogsExplorerViews
						setIsLoadingQueries={(): void => {}}
						listQueryKeyRef={{ current: {} }}
						chartQueryKeyRef={{ current: {} }}
						setWarning={(): void => {}}
						showLiveLogs={false}
						handleChangeSelectedView={(): void => {}}
					/>
				</PreferenceContextProvider>
			</QueryBuilderContext.Provider>,
		);

		// Check for custom empty state message
		expect(screen.getByText('No logs found for this trace.')).toBeInTheDocument();
		expect(screen.getByText('This could be because :')).toBeInTheDocument();
		expect(
			screen.getByText('Logs are not linked to Traces.'),
		).toBeInTheDocument();
		expect(
			screen.getByText('Logs are not being sent to SigNoz.'),
		).toBeInTheDocument();
		expect(
			screen.getByText('No logs are associated with this particular trace/span.'),
		).toBeInTheDocument();

		// Check for documentation links
		expect(screen.getByText('Sending logs to SigNoz')).toBeInTheDocument();
		expect(screen.getByText('Correlate traces and logs')).toBeInTheDocument();
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

		render(
			<QueryBuilderContext.Provider value={mockTraceToLogsContextValue as any}>
				<PreferenceContextProvider>
					<LogsExplorerViews
						setIsLoadingQueries={(): void => {}}
						listQueryKeyRef={{ current: {} }}
						chartQueryKeyRef={{ current: {} }}
						setWarning={(): void => {}}
						showLiveLogs={false}
						handleChangeSelectedView={(): void => {}}
					/>
				</PreferenceContextProvider>
			</QueryBuilderContext.Provider>,
		);

		// Check for custom empty state message
		expect(screen.getByText(/This query had no results./i)).toBeInTheDocument();
		expect(
			screen.getByText(/Edit your query and try again!/i),
		).toBeInTheDocument();
	});
});
