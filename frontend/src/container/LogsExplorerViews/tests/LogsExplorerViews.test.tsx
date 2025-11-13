import { PANEL_TYPES } from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import { useCopyLogLink } from 'hooks/logs/useCopyLogLink';
import { useGetExplorerQueryRange } from 'hooks/queryBuilder/useGetExplorerQueryRange';
import { logsQueryRangeSuccessResponse } from 'mocks-server/__mockdata__/logs_query_range';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { PreferenceContextProvider } from 'providers/preferences/context/PreferenceContextProvider';
import { QueryBuilderContext } from 'providers/QueryBuilder';
import { VirtuosoMockContext } from 'react-virtuoso';
import { fireEvent, render, RenderResult, waitFor } from 'tests/test-utils';
import { TagFilterItem } from 'types/api/queryBuilder/queryBuilderData';
import { LogsAggregatorOperator } from 'types/common/queryBuilder';

import LogsExplorerViews from '..';
import {
	logsQueryRangeSuccessNewFormatResponse,
	mockQueryBuilderContextValue,
} from './mock';

const queryRangeURL = 'http://localhost/api/v3/query_range';
const ACTIVE_LOG_ID = 'test-log-id';
jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useLocation: (): { pathname: string } => ({
		pathname: `${ROUTES.LOGS_EXPLORER}`,
	}),
}));

const lodsQueryServerRequest = (): void =>
	server.use(
		rest.post(queryRangeURL, (req, res, ctx) =>
			res(ctx.status(200), ctx.json(logsQueryRangeSuccessResponse)),
		),
	);

// mocking the graph components in this test as this should be handled separately
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

jest.mock('constants/panelTypes', () => ({
	AVAILABLE_EXPORT_PANEL_TYPES: ['graph', 'table'],
}));

jest.mock('d3-interpolate', () => ({
	interpolate: jest.fn(),
}));

jest.mock('hooks/queryBuilder/useGetExplorerQueryRange', () => ({
	__esModule: true,
	useGetExplorerQueryRange: jest.fn(),
}));

// Mock ErrorStateComponent to handle APIError properly
jest.mock(
	'components/Common/ErrorStateComponent',
	() =>
		function MockErrorStateComponent({ error, message }: any): JSX.Element {
			if (error) {
				// Mock the getErrorMessage and getErrorDetails methods
				const getErrorMessage = jest
					.fn()
					.mockReturnValue(
						error.error?.message ||
							'Something went wrong. Please try again or contact support.',
					);
				const getErrorDetails = jest.fn().mockReturnValue(error);

				// Add the methods to the error object
				const errorWithMethods = {
					...error,
					getErrorMessage,
					getErrorDetails,
				};

				return (
					<div data-testid="error-state-component">
						<div>{errorWithMethods.getErrorMessage()}</div>
						{errorWithMethods.getErrorDetails().error?.errors?.map((err: any) => (
							<div key={`error-${err.message}`}>• {err.message}</div>
						))}
					</div>
				);
			}

			return (
				<div data-testid="error-state-component">
					<div>
						{message || 'Something went wrong. Please try again or contact support.'}
					</div>
				</div>
			);
		},
);

jest.mock('hooks/useSafeNavigate', () => ({
	useSafeNavigate: (): any => ({
		safeNavigate: jest.fn(),
	}),
}));

// Mock usePreferenceSync
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

jest.mock('hooks/logs/useCopyLogLink', () => ({
	useCopyLogLink: jest.fn().mockReturnValue({
		activeLogId: undefined,
	}),
}));

// Set up the specific behavior for useGetExplorerQueryRange in individual test cases
beforeEach(() => {
	(useGetExplorerQueryRange as jest.Mock).mockReturnValue({
		data: { payload: logsQueryRangeSuccessNewFormatResponse },
	});
});

const renderer = (): RenderResult =>
	render(
		<VirtuosoMockContext.Provider
			value={{ viewportHeight: 300, itemHeight: 100 }}
		>
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
		</VirtuosoMockContext.Provider>,
	);

describe('LogsExplorerViews -', () => {
	it('render correctly with props - list and table', async () => {
		lodsQueryServerRequest();
		const { queryByTestId } = renderer();

		const periscopeDownloadButtonTestId = 'periscope-btn-download-options';
		const periscopeFormatButtonTestId = 'periscope-btn-format-options';

		// Test that the periscope button is present
		expect(queryByTestId(periscopeDownloadButtonTestId)).toBeInTheDocument();
		expect(queryByTestId(periscopeFormatButtonTestId)).toBeInTheDocument();

		// Test that the menu opens when clicked
		fireEvent.click(queryByTestId(periscopeDownloadButtonTestId) as HTMLElement);
		fireEvent.click(queryByTestId(periscopeFormatButtonTestId) as HTMLElement);
		expect(document.querySelector('.menu-container')).toBeInTheDocument();

		// Test that the menu items are present
		const expectedMenuItemsCount = 3;
		const menuItems = document.querySelectorAll('.menu-items .item');
		expect(menuItems.length).toBe(expectedMenuItemsCount);

		// Test that the component renders without crashing
		expect(queryByTestId(periscopeDownloadButtonTestId)).toBeInTheDocument();
		expect(queryByTestId(periscopeFormatButtonTestId)).toBeInTheDocument();
	});

	it('check isLoading state', async () => {
		lodsQueryServerRequest();
		(useGetExplorerQueryRange as jest.Mock).mockReturnValue({
			data: { payload: logsQueryRangeSuccessNewFormatResponse },
			isLoading: true,
			isFetching: false,
		});
		const { queryByText } = renderer();

		// Test that loading state is displayed
		expect(queryByText('pending_data_placeholder')).toBeInTheDocument();
	});

	it('should add activeLogId filter when present in URL', async () => {
		// Mock useCopyLogLink to return an activeLogId
		(useCopyLogLink as jest.Mock).mockReturnValue({
			activeLogId: ACTIVE_LOG_ID,
		});

		const originalFiltersLength =
			mockQueryBuilderContextValue.currentQuery.builder.queryData[0].filters?.items
				.length || 0;

		lodsQueryServerRequest();
		render(
			<QueryBuilderContext.Provider value={mockQueryBuilderContextValue}>
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

		await waitFor(() => {
			const listCall = (useGetExplorerQueryRange as jest.Mock).mock.calls.find(
				(call) =>
					call[0] &&
					call[0].builder.queryData[0].filters.items.length ===
						originalFiltersLength + 1,
			);

			expect(listCall).toBeDefined();

			if (listCall) {
				const { queryData } = listCall[0].builder;

				const firstQuery = queryData[0];

				const expectedFiltersLength = originalFiltersLength + 1; // +1 for activeLogId filter

				// Verify that the activeLogId filter is present
				expect(
					firstQuery.filters?.items.some(
						(item: TagFilterItem) =>
							item.key?.key === 'id' &&
							item.op === '<=' &&
							item.value === ACTIVE_LOG_ID,
					),
				).toBe(true);

				// Verify the total number of filters (original + 1 new activeLogId filter)
				expect(firstQuery.filters?.items.length).toBe(expectedFiltersLength);

				// Verify the filter expression
				expect(firstQuery.filter?.expression).toBe(`id <= '${ACTIVE_LOG_ID}'`);
			}
		});
	});

	it('should update filter expression with activeLogId when present with existing filter expression', async () => {
		// Mock useCopyLogLink to return an activeLogId
		(useCopyLogLink as jest.Mock).mockReturnValue({
			activeLogId: ACTIVE_LOG_ID,
		});

		// Create a custom QueryBuilderContext with an existing filter expression
		const customContext = {
			...mockQueryBuilderContextValue,
			panelType: PANEL_TYPES.LIST,
			stagedQuery: {
				...mockQueryBuilderContextValue.stagedQuery,
				builder: {
					...mockQueryBuilderContextValue.stagedQuery.builder,
					queryData: [
						{
							...mockQueryBuilderContextValue.stagedQuery.builder.queryData[0],
							filter: { expression: "service = 'frontend'" },
						},
					],
				},
			},
		};

		lodsQueryServerRequest();

		render(
			<QueryBuilderContext.Provider value={customContext as any}>
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

		await waitFor(() => {
			// Find the call made for LIST panel type (main logs list request)
			const listCall = (useGetExplorerQueryRange as jest.Mock).mock.calls.find(
				(call) => call[1] === PANEL_TYPES.LIST && call[0],
			);

			expect(listCall).toBeDefined();
			if (listCall) {
				const queryArg = listCall[0];
				const firstQuery = queryArg.builder.queryData[0];
				// It should append the activeLogId condition to existing expression
				expect(firstQuery.filter?.expression).toBe(
					"service = 'frontend' id <= 'test-log-id'",
				);
			}
		});
	});

	describe('Queries by View', () => {
		it('builds Frequency Chart query with COUNT and severity_text grouping and activeLogId bound', async () => {
			// Enable frequency chart via localstorage and provide activeLogId
			(useCopyLogLink as jest.Mock).mockReturnValue({
				activeLogId: ACTIVE_LOG_ID,
			});
			// Ensure default mock return exists
			(useGetExplorerQueryRange as jest.Mock).mockReturnValue({
				data: { payload: logsQueryRangeSuccessNewFormatResponse },
			});

			// Render with LIST panel type so the frequency chart hook runs with TIME_SERIES
			render(
				<VirtuosoMockContext.Provider
					value={{ viewportHeight: 300, itemHeight: 100 }}
				>
					<PreferenceContextProvider>
						<QueryBuilderContext.Provider
							value={
								{ ...mockQueryBuilderContextValue, panelType: PANEL_TYPES.LIST } as any
							}
						>
							<LogsExplorerViews
								setIsLoadingQueries={(): void => {}}
								listQueryKeyRef={{ current: {} }}
								chartQueryKeyRef={{ current: {} }}
								setWarning={(): void => {}}
								showLiveLogs={false}
								handleChangeSelectedView={(): void => {}}
							/>
						</QueryBuilderContext.Provider>
					</PreferenceContextProvider>
				</VirtuosoMockContext.Provider>,
			);

			await waitFor(() => {
				const chartCall = (useGetExplorerQueryRange as jest.Mock).mock.calls.find(
					(call) => call[1] === PANEL_TYPES.TIME_SERIES && call[0],
				);
				expect(chartCall).toBeDefined();
				if (chartCall) {
					const frequencyQuery = chartCall[0];
					const first = frequencyQuery.builder.queryData[0];
					// Panel type used for chart fetch
					expect(chartCall[1]).toBe(PANEL_TYPES.TIME_SERIES);
					// Transformations
					expect(first.aggregateOperator).toBe(LogsAggregatorOperator.COUNT);
					expect(first.groupBy?.[0]?.key).toBe('severity_text');
					expect(first.legend).toBe('{{severity_text}}');
					expect(Array.isArray(first.orderBy) && first.orderBy.length === 0).toBe(
						true,
					);
					expect(first.having?.expression).toBe('');
					// activeLogId constraints
					expect(first.filter?.expression).toContain(`id <= '${ACTIVE_LOG_ID}'`);
					expect(
						first.filters?.items?.some(
							(it: any) =>
								it.key?.key === 'id' && it.op === '<=' && it.value === ACTIVE_LOG_ID,
						),
					).toBe(true);
				}
			});
		});

		it('builds List View query with orderBy and clears groupBy/having', async () => {
			(useCopyLogLink as jest.Mock).mockReturnValue({ activeLogId: undefined });
			(useGetExplorerQueryRange as jest.Mock).mockReturnValue({
				data: { payload: logsQueryRangeSuccessNewFormatResponse },
			});

			render(
				<VirtuosoMockContext.Provider
					value={{ viewportHeight: 300, itemHeight: 100 }}
				>
					<PreferenceContextProvider>
						<QueryBuilderContext.Provider
							value={
								{ ...mockQueryBuilderContextValue, panelType: PANEL_TYPES.LIST } as any
							}
						>
							<LogsExplorerViews
								setIsLoadingQueries={(): void => {}}
								listQueryKeyRef={{ current: {} }}
								chartQueryKeyRef={{ current: {} }}
								setWarning={(): void => {}}
								showLiveLogs={false}
								handleChangeSelectedView={(): void => {}}
							/>
						</QueryBuilderContext.Provider>
					</PreferenceContextProvider>
				</VirtuosoMockContext.Provider>,
			);

			await waitFor(() => {
				const listCall = (useGetExplorerQueryRange as jest.Mock).mock.calls.find(
					(call) => call[1] === PANEL_TYPES.LIST && call[0],
				);
				expect(listCall).toBeDefined();
				if (listCall) {
					const listQueryArg = listCall[0];
					const first = listQueryArg.builder.queryData[0];
					expect(first.groupBy?.length ?? 0).toBe(0);
					expect(first.having?.expression).toBe('');
					// Default orderBy should be timestamp desc, then id desc
					expect(first.orderBy).toEqual([
						{ columnName: 'timestamp', order: 'desc' },
						{ columnName: 'id', order: 'desc' },
					]);
					// Ensure the query is enabled for fetch
					expect(first.disabled).toBe(false);
				}
			});
		});
	});
});
