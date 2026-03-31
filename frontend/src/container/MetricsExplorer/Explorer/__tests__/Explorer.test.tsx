import { QueryClient, QueryClientProvider } from 'react-query';
// eslint-disable-next-line no-restricted-imports
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { useSearchParams } from 'react-router-dom-v5-compat';
import { render, screen } from '@testing-library/react';
import {
	MetrictypesTemporalityDTO,
	MetrictypesTypeDTO,
} from 'api/generated/services/sigNoz.schemas';
import { initialQueriesMap } from 'constants/queryBuilder';
import * as useOptionsMenuHooks from 'container/OptionsMenu';
import * as useUpdateDashboardHooks from 'hooks/dashboard/useUpdateDashboard';
import * as useQueryBuilderHooks from 'hooks/queryBuilder/useQueryBuilder';
import * as useHandleExplorerTabChangeHooks from 'hooks/useHandleExplorerTabChange';
import * as appContextHooks from 'providers/App/App';
import { ErrorModalProvider } from 'providers/ErrorModalProvider';
import * as timezoneHooks from 'providers/Timezone';
import store from 'store';
import { LicenseEvent } from 'types/api/licensesV3/getActive';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { DataSource, QueryBuilderContextType } from 'types/common/queryBuilder';

import Explorer from '../Explorer';
import * as useGetMetricsHooks from '../utils';
import { MOCK_METRIC_METADATA } from './testUtils';

const mockSetSearchParams = jest.fn();
const queryClient = new QueryClient();
const mockUpdateAllQueriesOperators = jest
	.fn()
	.mockReturnValue(initialQueriesMap[DataSource.METRICS]);
const mockHandleSetConfig = jest.fn();
const mockHandleExplorerTabChange = jest.fn();
const mockUseQueryBuilderData = {
	handleRunQuery: jest.fn(),
	stagedQuery: initialQueriesMap[DataSource.METRICS],
	updateAllQueriesOperators: mockUpdateAllQueriesOperators,
	currentQuery: initialQueriesMap[DataSource.METRICS],
	resetQuery: jest.fn(),
	redirectWithQueryBuilderData: jest.fn(),
	isStagedQueryUpdated: jest.fn(),
	handleSetQueryData: jest.fn(),
	handleSetFormulaData: jest.fn(),
	handleSetQueryItemData: jest.fn(),
	handleSetConfig: mockHandleSetConfig,
	removeQueryBuilderEntityByIndex: jest.fn(),
	removeQueryTypeItemByIndex: jest.fn(),
	isDefaultQuery: jest.fn(),
};

jest.mock('react-router-dom-v5-compat', () => {
	const actual = jest.requireActual('react-router-dom-v5-compat');
	return {
		...actual,
		useSearchParams: jest.fn(),
		useNavigationType: (): any => 'PUSH',
	};
});
jest.mock('hooks/useDimensions', () => ({
	useResizeObserver: (): { width: number; height: number } => ({
		width: 800,
		height: 400,
	}),
}));
jest.mock('react-query', () => ({
	...jest.requireActual('react-query'),
	useQueryClient: jest.fn().mockReturnValue({
		getQueriesData: jest.fn(),
	}),
}));
jest.mock('hooks/useSafeNavigate', () => ({
	useSafeNavigate: (): any => ({
		safeNavigate: jest.fn(),
	}),
}));
jest.mock('hooks/useNotifications', () => ({
	useNotifications: (): any => ({
		notifications: {
			error: jest.fn(),
		},
	}),
}));
jest.mock('react-redux', () => ({
	...jest.requireActual('react-redux'),
	useSelector: (): any => ({
		globalTime: {
			selectedTime: {
				startTime: 1713734400000,
				endTime: 1713738000000,
			},
			maxTime: 1713738000000,
			minTime: 1713734400000,
		},
	}),
}));

jest.spyOn(useUpdateDashboardHooks, 'useUpdateDashboard').mockReturnValue({
	mutate: jest.fn(),
	isLoading: false,
} as any);
jest.spyOn(useOptionsMenuHooks, 'useOptionsMenu').mockReturnValue({
	options: {
		selectColumns: [],
	},
} as any);
jest.spyOn(timezoneHooks, 'useTimezone').mockReturnValue({
	timezone: {
		offset: 0,
	},
	browserTimezone: {
		offset: 0,
	},
} as any);
jest.spyOn(appContextHooks, 'useAppContext').mockReturnValue({
	user: {
		role: 'admin',
	},
	activeLicenseV3: {
		event_queue: {
			created_at: '0',
			event: LicenseEvent.NO_EVENT,
			scheduled_at: '0',
			status: '',
			updated_at: '0',
		},
		license: {
			license_key: 'test-license-key',
			license_type: 'trial',
			org_id: 'test-org-id',
			plan_id: 'test-plan-id',
			plan_name: 'test-plan-name',
			plan_type: 'trial',
			plan_version: 'test-plan-version',
		},
	},
} as any);
jest.spyOn(useQueryBuilderHooks, 'useQueryBuilder').mockReturnValue({
	...mockUseQueryBuilderData,
} as any);
jest
	.spyOn(useHandleExplorerTabChangeHooks, 'useHandleExplorerTabChange')
	.mockReturnValue({
		handleExplorerTabChange: mockHandleExplorerTabChange,
	});

const Y_AXIS_UNIT_SELECTOR_TEST_ID = 'y-axis-unit-selector';

function renderExplorer(): void {
	render(
		<QueryClientProvider client={queryClient}>
			<MemoryRouter>
				<Provider store={store}>
					<ErrorModalProvider>
						<Explorer />
					</ErrorModalProvider>
				</Provider>
			</MemoryRouter>
		</QueryClientProvider>,
	);
}

describe('Explorer', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should enable one chart per query toggle when oneChartPerQuery=true in URL', () => {
		(useSearchParams as jest.Mock).mockReturnValue([
			new URLSearchParams({ isOneChartPerQueryEnabled: 'true' }),
			mockSetSearchParams,
		]);
		jest.spyOn(useGetMetricsHooks, 'useGetMetrics').mockReturnValue({
			isLoading: false,
			isError: false,
			metrics: [MOCK_METRIC_METADATA, MOCK_METRIC_METADATA],
		});

		renderExplorer();

		const toggle = screen.getByRole('switch');
		expect(toggle).toBeChecked();
	});

	it('should disable one chart per query toggle when oneChartPerQuery=false in URL', () => {
		(useSearchParams as jest.Mock).mockReturnValue([
			new URLSearchParams({ isOneChartPerQueryEnabled: 'false' }),
			mockSetSearchParams,
		]);
		jest.spyOn(useGetMetricsHooks, 'useGetMetrics').mockReturnValue({
			isLoading: false,
			isError: false,
			metrics: [MOCK_METRIC_METADATA, MOCK_METRIC_METADATA],
		});

		renderExplorer();

		const toggle = screen.getByRole('switch');
		expect(toggle).not.toBeChecked();
	});

	it('should not render y axis unit selector for single metric which has a unit', () => {
		jest.spyOn(useGetMetricsHooks, 'useGetMetrics').mockReturnValue({
			isLoading: false,
			isError: false,
			metrics: [MOCK_METRIC_METADATA],
		});

		renderExplorer();

		const yAxisUnitSelector = screen.queryByTestId(Y_AXIS_UNIT_SELECTOR_TEST_ID);
		expect(yAxisUnitSelector).not.toBeInTheDocument();
	});

	it('should not render y axis unit selector for mutliple metrics with same unit', () => {
		(useSearchParams as jest.Mock).mockReturnValueOnce([
			new URLSearchParams({ isOneChartPerQueryEnabled: 'true' }),
			mockSetSearchParams,
		]);
		jest.spyOn(useGetMetricsHooks, 'useGetMetrics').mockReturnValue({
			isLoading: false,
			isError: false,
			metrics: [MOCK_METRIC_METADATA, MOCK_METRIC_METADATA],
		});

		renderExplorer();

		const yAxisUnitSelector = screen.queryByTestId(Y_AXIS_UNIT_SELECTOR_TEST_ID);
		expect(yAxisUnitSelector).not.toBeInTheDocument();
	});

	it('one chart per query toggle should be forced on and disabled when multiple metrics have different units', () => {
		const mockQueryData = {
			...initialQueriesMap[DataSource.METRICS].builder.queryData[0],
			aggregateAttribute: {
				...(initialQueriesMap[DataSource.METRICS].builder.queryData[0]
					.aggregateAttribute as BaseAutocompleteData),
				key: 'metric1',
			},
		};
		const mockStagedQueryWithMultipleQueries = {
			...initialQueriesMap[DataSource.METRICS],
			builder: {
				...initialQueriesMap[DataSource.METRICS].builder,
				queryData: [mockQueryData, mockQueryData],
			},
		};

		jest.spyOn(useQueryBuilderHooks, 'useQueryBuilder').mockReturnValue(({
			...mockUseQueryBuilderData,
			stagedQuery: mockStagedQueryWithMultipleQueries,
		} as Partial<QueryBuilderContextType>) as QueryBuilderContextType);

		jest.spyOn(useGetMetricsHooks, 'useGetMetrics').mockReturnValue({
			isLoading: false,
			isError: false,
			metrics: [
				{ ...MOCK_METRIC_METADATA, unit: 'seconds' },
				{ ...MOCK_METRIC_METADATA, unit: 'bytes' },
			],
		});

		(useSearchParams as jest.Mock).mockReturnValue([
			new URLSearchParams({ isOneChartPerQueryEnabled: 'false' }),
			mockSetSearchParams,
		]);

		renderExplorer();

		const oneChartPerQueryToggle = screen.getByRole('switch');
		expect(oneChartPerQueryToggle).toBeChecked();
		expect(oneChartPerQueryToggle).toBeDisabled();
	});

	it('should render empty y axis unit selector for a single metric with no unit', () => {
		jest.spyOn(useGetMetricsHooks, 'useGetMetrics').mockReturnValue({
			isLoading: false,
			isError: false,
			metrics: [
				{
					type: MetrictypesTypeDTO.sum,
					description: 'metric1 description',
					unit: '',
					temporality: MetrictypesTemporalityDTO.cumulative,
					isMonotonic: true,
				},
			],
		});

		renderExplorer();

		const yAxisUnitSelector = screen.queryByTestId(Y_AXIS_UNIT_SELECTOR_TEST_ID);
		expect(yAxisUnitSelector).toBeInTheDocument();
		expect(yAxisUnitSelector).toHaveTextContent('Please select a unit');
	});

	it('one chart per query should be off and disabled when there is only one query', () => {
		jest.spyOn(useGetMetricsHooks, 'useGetMetrics').mockReturnValue({
			isLoading: false,
			isError: false,
			metrics: [MOCK_METRIC_METADATA],
		});

		renderExplorer();

		const oneChartPerQueryToggle = screen.getByRole('switch');
		expect(oneChartPerQueryToggle).not.toBeChecked();
		expect(oneChartPerQueryToggle).toBeDisabled();
	});

	it('one chart per query should enabled by default when there are multiple metrics with the same unit', () => {
		const mockQueryData = {
			...initialQueriesMap[DataSource.METRICS].builder.queryData[0],
			aggregateAttribute: {
				...(initialQueriesMap[DataSource.METRICS].builder.queryData[0]
					.aggregateAttribute as BaseAutocompleteData),
				key: 'metric1',
			},
		};
		const mockStagedQueryWithMultipleQueries = {
			...initialQueriesMap[DataSource.METRICS],
			builder: {
				...initialQueriesMap[DataSource.METRICS].builder,
				queryData: [mockQueryData, mockQueryData],
			},
		};

		jest.spyOn(useQueryBuilderHooks, 'useQueryBuilder').mockReturnValue(({
			...mockUseQueryBuilderData,
			stagedQuery: mockStagedQueryWithMultipleQueries,
		} as Partial<QueryBuilderContextType>) as QueryBuilderContextType);

		jest.spyOn(useGetMetricsHooks, 'useGetMetrics').mockReturnValue({
			isLoading: false,
			isError: false,
			metrics: [MOCK_METRIC_METADATA, MOCK_METRIC_METADATA],
		});

		renderExplorer();

		const oneChartPerQueryToggle = screen.getByRole('switch');
		expect(oneChartPerQueryToggle).toBeEnabled();
	});

	it('one chart per query toggle should be enabled when multiple metrics have no unit', () => {
		const metricWithNoUnit = {
			type: MetrictypesTypeDTO.sum,
			description: 'metric without unit',
			unit: '',
			temporality: MetrictypesTemporalityDTO.cumulative,
			isMonotonic: true,
		};
		const mockQueryData = {
			...initialQueriesMap[DataSource.METRICS].builder.queryData[0],
			aggregateAttribute: {
				...(initialQueriesMap[DataSource.METRICS].builder.queryData[0]
					.aggregateAttribute as BaseAutocompleteData),
				key: 'metric1',
			},
		};
		const mockStagedQueryWithMultipleQueries = {
			...initialQueriesMap[DataSource.METRICS],
			builder: {
				...initialQueriesMap[DataSource.METRICS].builder,
				queryData: [mockQueryData, mockQueryData],
			},
		};

		jest.spyOn(useQueryBuilderHooks, 'useQueryBuilder').mockReturnValue(({
			...mockUseQueryBuilderData,
			stagedQuery: mockStagedQueryWithMultipleQueries,
		} as Partial<QueryBuilderContextType>) as QueryBuilderContextType);

		jest.spyOn(useGetMetricsHooks, 'useGetMetrics').mockReturnValue({
			isLoading: false,
			isError: false,
			metrics: [metricWithNoUnit, metricWithNoUnit],
		});

		(useSearchParams as jest.Mock).mockReturnValue([
			new URLSearchParams({ isOneChartPerQueryEnabled: 'false' }),
			mockSetSearchParams,
		]);

		renderExplorer();

		const oneChartPerQueryToggle = screen.getByRole('switch');
		// Toggle should be enabled (not forced/disabled) since both metrics
		// have the same unit (no unit) and should be viewable on the same graph
		expect(oneChartPerQueryToggle).toBeEnabled();
		expect(oneChartPerQueryToggle).not.toBeChecked();
	});

	describe('loading saved views with v5 query format', () => {
		const EMPTY_STATE_TEXT = 'Select a metric and run a query to see the results';

		it('should show empty state when no metric is selected', () => {
			(useSearchParams as jest.Mock).mockReturnValue([
				new URLSearchParams({}),
				mockSetSearchParams,
			]);
			jest.spyOn(useGetMetricsHooks, 'useGetMetrics').mockReturnValue({
				isLoading: false,
				isError: false,
				metrics: [],
			});
			jest.spyOn(useQueryBuilderHooks, 'useQueryBuilder').mockReturnValue({
				...mockUseQueryBuilderData,
			} as any);

			renderExplorer();

			expect(screen.getByText(EMPTY_STATE_TEXT)).toBeInTheDocument();
		});

		it('should not show empty state when saved view has v5 aggregations format', () => {
			(useSearchParams as jest.Mock).mockReturnValue([
				new URLSearchParams({}),
				mockSetSearchParams,
			]);
			jest.spyOn(useGetMetricsHooks, 'useGetMetrics').mockReturnValue({
				isLoading: false,
				isError: false,
				metrics: [MOCK_METRIC_METADATA],
			});

			// saved view loaded back from v5 format
			// aggregateAttribute.key is empty (lost in v3/v4 -> v5 -> v3/v4 round trip)
			// but aggregations[0].metricName has metric name
			// TODO(srikanthccv): remove this mess
			const mockQueryData = {
				...initialQueriesMap[DataSource.METRICS].builder.queryData[0],
				aggregateAttribute: {
					...(initialQueriesMap[DataSource.METRICS].builder.queryData[0]
						.aggregateAttribute as BaseAutocompleteData),
					key: '',
				},
				aggregations: [
					{
						metricName: 'http_requests_total',
						temporality: 'cumulative',
						timeAggregation: 'rate',
						spaceAggregation: 'sum',
					},
				],
			};
			jest.spyOn(useQueryBuilderHooks, 'useQueryBuilder').mockReturnValue(({
				...mockUseQueryBuilderData,
				stagedQuery: {
					...initialQueriesMap[DataSource.METRICS],
					builder: {
						...initialQueriesMap[DataSource.METRICS].builder,
						queryData: [mockQueryData],
					},
				},
			} as Partial<QueryBuilderContextType>) as QueryBuilderContextType);

			renderExplorer();

			expect(screen.queryByText(EMPTY_STATE_TEXT)).not.toBeInTheDocument();
		});

		it('should not show empty state when query uses v3 aggregateAttribute format', () => {
			(useSearchParams as jest.Mock).mockReturnValue([
				new URLSearchParams({}),
				mockSetSearchParams,
			]);
			jest.spyOn(useGetMetricsHooks, 'useGetMetrics').mockReturnValue({
				isLoading: false,
				isError: false,
				metrics: [MOCK_METRIC_METADATA],
			});

			const mockQueryData = {
				...initialQueriesMap[DataSource.METRICS].builder.queryData[0],
				aggregateAttribute: {
					...(initialQueriesMap[DataSource.METRICS].builder.queryData[0]
						.aggregateAttribute as BaseAutocompleteData),
					key: 'system_cpu_usage',
				},
			};
			jest.spyOn(useQueryBuilderHooks, 'useQueryBuilder').mockReturnValue(({
				...mockUseQueryBuilderData,
				stagedQuery: {
					...initialQueriesMap[DataSource.METRICS],
					builder: {
						...initialQueriesMap[DataSource.METRICS].builder,
						queryData: [mockQueryData],
					},
				},
			} as Partial<QueryBuilderContextType>) as QueryBuilderContextType);

			renderExplorer();

			expect(screen.queryByText(EMPTY_STATE_TEXT)).not.toBeInTheDocument();
		});
	});
});
