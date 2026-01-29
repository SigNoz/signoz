/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { render as rtlRender, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { AppContext } from 'providers/App/App';
import { IAppContext } from 'providers/App/types';
import { DashboardProvider } from 'providers/Dashboard/Dashboard';
import { ErrorModalProvider } from 'providers/ErrorModalProvider';
import { QueryBuilderProvider } from 'providers/QueryBuilder';
import configureStore from 'redux-mock-store';
import thunk from 'redux-thunk';
import { LegendPosition, Widgets } from 'types/api/dashboard/getAll';
import { EQueryType } from 'types/common/dashboard';
import { ROLES } from 'types/roles';

import RightContainer, { RightContainerProps } from '../index';
import { timeItems, timePreferance, timePreferenceType } from '../timeItems';

const mockStore = configureStore([thunk]);
const createMockStore = (): ReturnType<typeof mockStore> =>
	mockStore({
		app: {
			role: 'ADMIN',
			user: {
				userId: 'test-user-id',
				email: 'test@signoz.io',
				name: 'TestUser',
			},
			isLoggedIn: true,
			org: [],
		},
		globalTime: {
			minTime: '2023-01-01T00:00:00Z',
			maxTime: '2023-01-02T00:00:00Z',
		},
	});

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: false,
		},
	},
});

const createMockAppContext = (): Partial<IAppContext> => ({
	user: {
		accessJwt: '',
		refreshJwt: '',
		id: '',
		email: '',
		displayName: '',
		createdAt: 0,
		organization: '',
		orgId: '',
		role: 'ADMIN' as ROLES,
	},
});

const mockWidget: Widgets = {
	id: 'test-widget-id',
	title: 'Test Widget',
	description: 'Test Description',
	panelTypes: PANEL_TYPES.TIME_SERIES,
	query: {
		builder: {
			queryData: [],
			queryFormulas: [],
			queryTraceOperator: [],
		},
		promql: [],
		clickhouse_sql: [],
		id: 'query-id',
		queryType: 'builder' as EQueryType,
	},
	timePreferance: 'GLOBAL_TIME' as timePreferenceType,
	opacity: '',
	nullZeroValues: '',
	yAxisUnit: '',
	fillSpans: false,
	softMin: null,
	softMax: null,
	selectedLogFields: [],
	selectedTracesFields: [],
};

const render = (ui: React.ReactElement): ReturnType<typeof rtlRender> =>
	rtlRender(
		<MemoryRouter>
			<QueryClientProvider client={queryClient}>
				<Provider store={createMockStore()}>
					<AppContext.Provider value={createMockAppContext() as IAppContext}>
						<ErrorModalProvider>
							<DashboardProvider>
								<QueryBuilderProvider>{ui}</QueryBuilderProvider>
							</DashboardProvider>
						</ErrorModalProvider>
					</AppContext.Provider>
				</Provider>
			</QueryClientProvider>
		</MemoryRouter>,
	);

// eslint-disable-next-line sonarjs/no-duplicate-string
jest.mock('hooks/queryBuilder/useCreateAlerts', () => ({
	__esModule: true,
	default: jest.fn(() => jest.fn()),
}));

jest.mock('lucide-react', () => ({
	...jest.requireActual('lucide-react'),
	ConciergeBell: (): JSX.Element => <svg data-testid="lucide-concierge-bell" />,
	SquareArrowOutUpRight: (): JSX.Element => (
		<svg data-testid="lucide-square-arrow-out-up-right" />
	),
	Plus: (): JSX.Element => <svg data-testid="lucide-plus" />,
}));

describe('RightContainer - Alerts Section', () => {
	const defaultProps: RightContainerProps = {
		title: 'Test Widget',
		setTitle: jest.fn(),
		description: 'Test Description',
		setDescription: jest.fn(),
		opacity: '1',
		setOpacity: jest.fn(),
		selectedNullZeroValue: '',
		setSelectedNullZeroValue: jest.fn(),
		selectedGraph: PANEL_TYPES.TIME_SERIES,
		setSelectedTime: jest.fn(),
		selectedTime: timeItems[0] as timePreferance,
		yAxisUnit: '',
		stackedBarChart: false,
		setStackedBarChart: jest.fn(),
		bucketWidth: 0,
		bucketCount: 0,
		combineHistogram: false,
		setCombineHistogram: jest.fn(),
		setBucketWidth: jest.fn(),
		setBucketCount: jest.fn(),
		setYAxisUnit: jest.fn(),
		decimalPrecision: 2 as const,
		setDecimalPrecision: jest.fn(),
		setGraphHandler: jest.fn(),
		thresholds: [],
		setThresholds: jest.fn(),
		selectedWidget: mockWidget,
		isFillSpans: false,
		setIsFillSpans: jest.fn(),
		softMin: null,
		softMax: null,
		columnUnits: {},
		setColumnUnits: jest.fn(),
		setSoftMin: jest.fn(),
		setSoftMax: jest.fn(),
		isLogScale: false,
		setIsLogScale: jest.fn(),
		legendPosition: LegendPosition.BOTTOM,
		setLegendPosition: jest.fn(),
		customLegendColors: {},
		setCustomLegendColors: jest.fn(),
		queryResponse: undefined,
		contextLinks: { linksData: [] },
		setContextLinks: jest.fn(),
		enableDrillDown: false,
		isNewDashboard: false,
	};

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('renders alerts section for TIME_SERIES panel type', () => {
		render(<RightContainer {...defaultProps} />);

		const alertsSection = screen.getByText('Alerts').closest('section');
		expect(alertsSection).toBeInTheDocument();
		expect(alertsSection).toHaveClass('alerts');
	});

	it('renders alerts section with correct text and SquareArrowOutUpRight icon', () => {
		render(<RightContainer {...defaultProps} />);

		expect(
			screen.getByTestId('lucide-square-arrow-out-up-right'),
		).toBeInTheDocument();
		expect(screen.getByText('Alerts')).toBeInTheDocument();
	});

	it('calls onCreateAlertsHandler when alerts section is clicked', async () => {
		const mockCreateAlertsHandler = jest.fn();
		const useCreateAlerts = jest.requireMock('hooks/queryBuilder/useCreateAlerts')
			.default;
		useCreateAlerts.mockReturnValue(mockCreateAlertsHandler);

		render(<RightContainer {...defaultProps} />);

		const alertsSection = screen.getByText('Alerts').closest('section');
		expect(alertsSection).toBeInTheDocument();

		await userEvent.click(alertsSection as HTMLElement);

		expect(mockCreateAlertsHandler).toHaveBeenCalledTimes(1);
	});

	it('passes correct parameters to useCreateAlerts hook', () => {
		const useCreateAlerts = jest.requireMock('hooks/queryBuilder/useCreateAlerts')
			.default;

		render(<RightContainer {...defaultProps} />);

		expect(useCreateAlerts).toHaveBeenCalledWith(mockWidget, 'panelView');
	});

	it('renders alerts section for VALUE panel type', () => {
		render(
			<RightContainer
				{...defaultProps}
				selectedGraph={PANEL_TYPES.VALUE}
				selectedWidget={{ ...mockWidget, panelTypes: PANEL_TYPES.VALUE }}
			/>,
		);

		expect(screen.getByText('Alerts')).toBeInTheDocument();
	});

	it('renders alerts section for BAR panel type', () => {
		render(
			<RightContainer
				{...defaultProps}
				selectedGraph={PANEL_TYPES.BAR}
				selectedWidget={{ ...mockWidget, panelTypes: PANEL_TYPES.BAR }}
			/>,
		);

		expect(screen.getByText('Alerts')).toBeInTheDocument();
	});

	it('does not render alerts section for TABLE panel type', () => {
		render(
			<RightContainer
				{...defaultProps}
				selectedGraph={PANEL_TYPES.TABLE}
				selectedWidget={{ ...mockWidget, panelTypes: PANEL_TYPES.TABLE }}
			/>,
		);

		expect(screen.queryByText('Alerts')).not.toBeInTheDocument();
	});

	it('does not render alerts section for LIST panel type', () => {
		render(
			<RightContainer
				{...defaultProps}
				selectedGraph={PANEL_TYPES.LIST}
				selectedWidget={{ ...mockWidget, panelTypes: PANEL_TYPES.LIST }}
			/>,
		);

		expect(screen.queryByText('Alerts')).not.toBeInTheDocument();
	});

	it('does not render alerts section for PIE panel type', () => {
		render(
			<RightContainer
				{...defaultProps}
				selectedGraph={PANEL_TYPES.PIE}
				selectedWidget={{ ...mockWidget, panelTypes: PANEL_TYPES.PIE }}
			/>,
		);

		expect(screen.queryByText('Alerts')).not.toBeInTheDocument();
	});

	it('does not render alerts section for HISTOGRAM panel type', () => {
		render(
			<RightContainer
				{...defaultProps}
				selectedGraph={PANEL_TYPES.HISTOGRAM}
				selectedWidget={{ ...mockWidget, panelTypes: PANEL_TYPES.HISTOGRAM }}
			/>,
		);

		expect(screen.queryByText('Alerts')).not.toBeInTheDocument();
	});
});
