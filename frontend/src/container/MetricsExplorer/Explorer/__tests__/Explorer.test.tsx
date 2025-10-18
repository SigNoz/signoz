import { render, screen } from '@testing-library/react';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import * as useOptionsMenuHooks from 'container/OptionsMenu';
import * as useUpdateDashboardHooks from 'hooks/dashboard/useUpdateDashboard';
import * as useQueryBuilderHooks from 'hooks/queryBuilder/useQueryBuilder';
import * as appContextHooks from 'providers/App/App';
import { ErrorModalProvider } from 'providers/ErrorModalProvider';
import * as timezoneHooks from 'providers/Timezone';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { useSearchParams } from 'react-router-dom-v5-compat';
import store from 'store';
import { LicenseEvent } from 'types/api/licensesV3/getActive';
import { DataSource } from 'types/common/queryBuilder';

import Explorer from '../Explorer';
import * as useGetMetricUnitsHooks from '../utils';

const mockSetSearchParams = jest.fn();
const queryClient = new QueryClient();
const mockUpdateAllQueriesOperators = jest.fn();
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
	handleSetConfig: jest.fn(),
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

const Y_AXIS_UNIT_SELECTOR_TEST_ID = 'metrics-explorer-y-axis-unit-selector';
const SECONDS_UNIT_LABEL = 'Seconds (s)';

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

	it('should render Explorer query builder with metrics datasource selected', () => {
		jest.spyOn(useQueryBuilderHooks, 'useQueryBuilder').mockReturnValue({
			...mockUseQueryBuilderData,
			stagedQuery: initialQueriesMap[DataSource.TRACES],
		} as any);

		(useSearchParams as jest.Mock).mockReturnValue([
			new URLSearchParams({ isOneChartPerQueryEnabled: 'false' }),
			mockSetSearchParams,
		]);

		renderExplorer();

		expect(mockUpdateAllQueriesOperators).toHaveBeenCalledWith(
			initialQueriesMap[DataSource.METRICS],
			PANEL_TYPES.TIME_SERIES,
			DataSource.METRICS,
		);
	});

	it('should enable one chart per query toggle when oneChartPerQuery=true in URL', () => {
		(useSearchParams as jest.Mock).mockReturnValue([
			new URLSearchParams({ isOneChartPerQueryEnabled: 'true' }),
			mockSetSearchParams,
		]);

		renderExplorer();

		const toggle = screen.getByRole('switch');
		expect(toggle).toBeChecked();
	});

	it('should disable one chart per query toggle when oneChartPerQuery=false in URL', () => {
		(useSearchParams as jest.Mock).mockReturnValue([
			new URLSearchParams({ isOneChartPerQueryEnabled: 'false' }),
			mockSetSearchParams,
		]);

		renderExplorer();

		const toggle = screen.getByRole('switch');
		expect(toggle).not.toBeChecked();
	});

	it('should render pre-populated y axis unit for single metric', () => {
		jest.spyOn(useGetMetricUnitsHooks, 'useGetMetricUnits').mockReturnValue({
			units: ['seconds'],
			isLoading: false,
			isError: false,
			metrics: [],
		} as any);

		renderExplorer();

		const yAxisUnitSelector = screen.getByTestId(Y_AXIS_UNIT_SELECTOR_TEST_ID);
		expect(yAxisUnitSelector).toBeInTheDocument();
		expect(yAxisUnitSelector).toHaveTextContent(SECONDS_UNIT_LABEL);
	});

	it('should render pre-populated y axis unit for mutliple metrics with same unit', () => {
		jest.spyOn(useGetMetricUnitsHooks, 'useGetMetricUnits').mockReturnValue({
			units: ['seconds', 'seconds'],
			isLoading: false,
			isError: false,
			metrics: [],
		} as any);

		renderExplorer();

		const yAxisUnitSelector = screen.getByTestId(Y_AXIS_UNIT_SELECTOR_TEST_ID);
		expect(yAxisUnitSelector).toBeInTheDocument();
		expect(yAxisUnitSelector).toHaveTextContent(SECONDS_UNIT_LABEL);
	});

	it('should hide y axis unit selector for multiple metrics with different units', () => {
		jest.spyOn(useGetMetricUnitsHooks, 'useGetMetricUnits').mockReturnValue({
			units: ['seconds', 'milliseconds'],
			isLoading: false,
			isError: false,
			metrics: [],
		} as any);

		renderExplorer();

		const yAxisUnitSelector = screen.queryByTestId(Y_AXIS_UNIT_SELECTOR_TEST_ID);
		expect(yAxisUnitSelector).not.toBeInTheDocument();
	});

	it('should render empty y axis unit selector for a single metric with no unit', () => {
		jest.spyOn(useGetMetricUnitsHooks, 'useGetMetricUnits').mockReturnValue({
			units: [],
			isLoading: false,
			isError: false,
			metrics: [],
		} as any);

		renderExplorer();

		const yAxisUnitSelector = screen.queryByTestId(Y_AXIS_UNIT_SELECTOR_TEST_ID);
		expect(yAxisUnitSelector).toBeInTheDocument();
		expect(yAxisUnitSelector).toHaveTextContent('Please select a unit');
	});
});
