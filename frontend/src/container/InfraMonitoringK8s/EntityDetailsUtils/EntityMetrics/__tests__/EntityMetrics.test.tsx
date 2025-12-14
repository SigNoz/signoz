/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable sonarjs/no-duplicate-string */
import { render, screen } from '@testing-library/react';
import { K8sCategory } from 'container/InfraMonitoringK8s/constants';
import { Time } from 'container/TopNav/DateTimeSelectionV2/config';
import * as appContextHooks from 'providers/App/App';
import { LicenseEvent } from 'types/api/licensesV3/getActive';

import EntityMetrics from '../EntityMetrics';

jest.mock('lib/uPlotLib/getUplotChartOptions', () => ({
	getUPlotChartOptions: jest.fn().mockReturnValue({}),
}));

jest.mock('lib/uPlotLib/utils/getUplotChartData', () => ({
	getUPlotChartData: jest.fn().mockReturnValue([]),
}));

jest.mock('container/TopNav/DateTimeSelectionV2', () => ({
	__esModule: true,
	default: (): JSX.Element => (
		<div data-testid="date-time-selection">Date Time</div>
	),
}));

jest.mock('components/Uplot', () => ({
	__esModule: true,
	default: (): JSX.Element => <div data-testid="uplot-chart">Uplot Chart</div>,
}));

jest.mock('container/InfraMonitoringK8s/commonUtils', () => ({
	__esModule: true,
	getMetricsTableData: jest.fn().mockReturnValue([
		{
			rows: [
				{ data: { timestamp: '2024-01-15T10:00:00Z', value: '42.5' } },
				{ data: { timestamp: '2024-01-15T10:01:00Z', value: '43.2' } },
			],
			columns: [
				{ key: 'timestamp', label: 'Timestamp', isValueColumn: false },
				{ key: 'value', label: 'Value', isValueColumn: true },
			],
		},
	]),
	MetricsTable: jest
		.fn()
		.mockImplementation(
			(): JSX.Element => <div data-testid="metrics-table">Metrics Table</div>,
		),
}));

const mockUseQueries = jest.fn();
const mockUseQuery = jest.fn();
jest.mock('react-query', () => ({
	...jest.requireActual('react-query'),
	useQueries: (queryConfigs: any[]): any[] => mockUseQueries(queryConfigs),
	useQuery: (config: any): any => mockUseQuery(config),
}));

jest.mock('hooks/useDarkMode', () => ({
	useIsDarkMode: (): boolean => false,
}));

jest.mock('hooks/useDimensions', () => ({
	useResizeObserver: (): { width: number; height: number } => ({
		width: 800,
		height: 600,
	}),
}));

jest.mock('hooks/useMultiIntersectionObserver', () => ({
	useMultiIntersectionObserver: (count: number): any => ({
		visibilities: new Array(count).fill(true),
		setElement: jest.fn(),
	}),
}));

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
	featureFlags: [
		{
			name: 'DOT_METRICS_ENABLED',
			active: false,
		},
	],
} as any);

const mockEntity = {
	id: 'test-entity-1',
	name: 'test-entity',
	type: 'pod',
};

const mockEntityWidgetInfo = [
	{
		title: 'CPU Usage',
		yAxisUnit: 'percentage',
	},
	{
		title: 'Memory Usage',
		yAxisUnit: 'bytes',
	},
];

const mockGetEntityQueryPayload = jest.fn().mockReturnValue([
	{
		query: 'cpu_usage',
		start: 1705315200,
		end: 1705318800,
	},
	{
		query: 'memory_usage',
		start: 1705315200,
		end: 1705318800,
	},
]);

const mockTimeRange = {
	startTime: 1705315200,
	endTime: 1705318800,
};

const mockHandleTimeChange = jest.fn();

const mockQueries = [
	{
		data: {
			payload: {
				data: {
					result: [
						{
							table: {
								rows: [
									{ data: { timestamp: '2024-01-15T10:00:00Z', value: '42.5' } },
									{ data: { timestamp: '2024-01-15T10:01:00Z', value: '43.2' } },
								],
								columns: [
									{ key: 'timestamp', label: 'Timestamp', isValueColumn: false },
									{ key: 'value', label: 'Value', isValueColumn: true },
								],
							},
						},
					],
				},
			},
			params: {
				compositeQuery: {
					panelType: 'time_series',
				},
			},
		},
		isLoading: false,
		isError: false,
		error: null,
	},
	{
		data: {
			payload: {
				data: {
					result: [
						{
							table: {
								rows: [
									{ data: { timestamp: '2024-01-15T10:00:00Z', value: '1024' } },
									{ data: { timestamp: '2024-01-15T10:01:00Z', value: '1028' } },
								],
								columns: [
									{ key: 'timestamp', label: 'Timestamp', isValueColumn: false },
									{ key: 'value', label: 'Value', isValueColumn: true },
								],
							},
						},
					],
				},
			},
			params: {
				compositeQuery: {
					panelType: 'table',
				},
			},
		},
		isLoading: false,
		isError: false,
		error: null,
	},
];

const mockLoadingQueries = [
	{
		data: undefined,
		isLoading: true,
		isError: false,
		error: null,
	},
	{
		data: undefined,
		isLoading: true,
		isError: false,
		error: null,
	},
];

const mockErrorQueries = [
	{
		data: undefined,
		isLoading: false,
		isError: true,
		error: new Error('API Error'),
	},
	{
		data: undefined,
		isLoading: false,
		isError: true,
		error: new Error('Network Error'),
	},
];

const mockEmptyQueries = [
	{
		data: {
			payload: {
				data: {
					result: [],
				},
			},
			params: {
				compositeQuery: {
					panelType: 'time_series',
				},
			},
		},
		isLoading: false,
		isError: false,
		error: null,
	},
	{
		data: {
			payload: {
				data: {
					result: [],
				},
			},
			params: {
				compositeQuery: {
					panelType: 'table',
				},
			},
		},
		isLoading: false,
		isError: false,
		error: null,
	},
];

const renderEntityMetrics = (overrides = {}): any => {
	const defaultProps = {
		timeRange: mockTimeRange,
		isModalTimeSelection: false,
		handleTimeChange: mockHandleTimeChange,
		selectedInterval: '5m' as Time,
		entity: mockEntity,
		entityWidgetInfo: mockEntityWidgetInfo,
		getEntityQueryPayload: mockGetEntityQueryPayload,
		queryKey: 'test-query-key',
		category: K8sCategory.PODS,
		...overrides,
	};

	return render(
		<EntityMetrics
			timeRange={defaultProps.timeRange}
			isModalTimeSelection={defaultProps.isModalTimeSelection}
			handleTimeChange={defaultProps.handleTimeChange}
			selectedInterval={defaultProps.selectedInterval}
			entity={defaultProps.entity}
			entityWidgetInfo={defaultProps.entityWidgetInfo}
			getEntityQueryPayload={defaultProps.getEntityQueryPayload}
			queryKey={defaultProps.queryKey}
			category={defaultProps.category}
		/>,
	);
};

describe('EntityMetrics', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockUseQueries.mockReturnValue(mockQueries);
		mockUseQuery.mockReturnValue({
			data: {
				data: {
					data: {
						variables: {},
						title: 'Test Dashboard',
					},
					id: 'test-dashboard-id',
				},
			},
			isLoading: false,
			isError: false,
			refetch: jest.fn(),
		});
	});

	it('should render metrics with data', () => {
		renderEntityMetrics();
		expect(screen.getByText('CPU Usage')).toBeInTheDocument();
		expect(screen.getByText('Memory Usage')).toBeInTheDocument();
		expect(screen.getByTestId('date-time-selection')).toBeInTheDocument();
		expect(screen.getByTestId('uplot-chart')).toBeInTheDocument();
		expect(screen.getByTestId('metrics-table')).toBeInTheDocument();
	});

	it('renders loading state when fetching metrics', () => {
		mockUseQueries.mockReturnValue(mockLoadingQueries);
		renderEntityMetrics();
		expect(screen.getAllByText('CPU Usage')).toHaveLength(1);
		expect(screen.getAllByText('Memory Usage')).toHaveLength(1);
	});

	it('renders error state when query fails', () => {
		mockUseQueries.mockReturnValue(mockErrorQueries);
		renderEntityMetrics();
		expect(screen.getByText('API Error')).toBeInTheDocument();
		expect(screen.getByText('Network Error')).toBeInTheDocument();
	});

	it('renders empty state when no metrics data', () => {
		mockUseQueries.mockReturnValue(mockEmptyQueries);
		renderEntityMetrics();
		expect(screen.getByTestId('uplot-chart')).toBeInTheDocument();
		expect(screen.getByTestId('metrics-table')).toBeInTheDocument();
	});

	it('calls handleTimeChange when datetime selection changes', () => {
		renderEntityMetrics();
		expect(screen.getByTestId('date-time-selection')).toBeInTheDocument();
	});

	it('renders multiple metric widgets', () => {
		renderEntityMetrics();
		expect(screen.getByText('CPU Usage')).toBeInTheDocument();
		expect(screen.getByText('Memory Usage')).toBeInTheDocument();
	});

	it('handles different panel types correctly', () => {
		renderEntityMetrics();
		expect(screen.getByTestId('uplot-chart')).toBeInTheDocument();
		expect(screen.getByTestId('metrics-table')).toBeInTheDocument();
	});

	it('applies intersection observer for visibility', () => {
		renderEntityMetrics();
		expect(mockUseQueries).toHaveBeenCalledWith(
			expect.arrayContaining([
				expect.objectContaining({
					enabled: true,
				}),
			]),
		);
	});

	it('generates correct query payloads', () => {
		renderEntityMetrics();
		expect(mockGetEntityQueryPayload).toHaveBeenCalledWith(
			mockEntity,
			mockTimeRange.startTime,
			mockTimeRange.endTime,
			false,
		);
	});
});
