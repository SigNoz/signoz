import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { InfraMonitoringEntity } from 'container/InfraMonitoringK8sV2/constants';
import * as appContextHooks from 'providers/App/App';
import { LicenseEvent } from 'types/api/licensesV3/getActive';
import uPlot from 'uplot';

import EntityMetrics from '../EntityMetrics';
import { useEntityMetrics } from '../hooks';

jest.mock('../hooks', () => ({
	useEntityMetrics: jest.fn(),
}));

const mockUseEntityMetrics = useEntityMetrics as jest.MockedFunction<
	typeof useEntityMetrics
>;

jest.mock('../configBuilder', () => ({
	buildEntityMetricsChartConfig: jest.fn().mockReturnValue({
		getId: jest.fn().mockReturnValue('mock-id'),
	}),
}));

jest.mock('lib/uPlotV2/utils/dataUtils', () => ({
	prepareChartData: jest.fn().mockReturnValue([]),
	hasSingleVisiblePoint: jest.fn().mockReturnValue(false),
}));

jest.mock('../../EntityDateTimeSelector/EntityDateTimeSelector', () => ({
	__esModule: true,
	default: (): JSX.Element => (
		<div data-testid="date-time-selection">Date Time</div>
	),
}));

const mockTimeRange = { startTime: 1705315200, endTime: 1705318800 };
let mockSelectedInterval = '5m';

jest.mock('../../EntityDateTimeSelector/useEntityDetailsTime', () => ({
	useEntityDetailsTime: (): {
		timeRange: { startTime: number; endTime: number };
		selectedInterval: string;
		handleTimeChange: jest.Mock;
	} => ({
		timeRange: mockTimeRange,
		selectedInterval: mockSelectedInterval,
		handleTimeChange: jest.fn(),
	}),
}));

jest.mock(
	'container/DashboardContainer/visualization/charts/TimeSeries/TimeSeries',
	() => ({
		__esModule: true,
		default: (): JSX.Element => (
			<div data-testid="uplot-chart">TimeSeries Chart</div>
		),
	}),
);

jest.mock('providers/Timezone', () => ({
	useTimezone: (): { timezone: { value: string } } => ({
		timezone: { value: 'UTC' },
	}),
}));

jest.mock('../MetricsTable', () => ({
	__esModule: true,
	MetricsTable: jest
		.fn()
		.mockImplementation(
			(): JSX.Element => <div data-testid="metrics-table">Metrics Table</div>,
		),
}));

const mockUseQuery = jest.fn();
jest.mock('react-query', () => ({
	...jest.requireActual('react-query'),
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
		entity: mockEntity,
		entityWidgetInfo: mockEntityWidgetInfo,
		getEntityQueryPayload: mockGetEntityQueryPayload,
		queryKey: 'test-query-key',
		category: InfraMonitoringEntity.PODS,
		...overrides,
	};

	return render(
		<MemoryRouter>
			<EntityMetrics
				entity={defaultProps.entity}
				eventEntity="test"
				entityWidgetInfo={defaultProps.entityWidgetInfo}
				getEntityQueryPayload={defaultProps.getEntityQueryPayload}
				queryKey={defaultProps.queryKey}
				category={defaultProps.category}
			/>
		</MemoryRouter>,
	);
};

const mockChartData: (uPlot.AlignedData | null)[] = [
	[
		[1705315200, 1705318800],
		[42.5, 43.2],
	], // time_series chart data (AlignedData)
	null, // table uses tableData
];

const mockTableData: (import('../utils').MetricsTableData[] | null)[] = [
	null, // time_series uses chartData
	[
		{
			rows: [
				{ timestamp: '2024-01-15T10:00:00Z', value: '1024' },
				{ timestamp: '2024-01-15T10:01:00Z', value: '1028' },
			],
			columns: [
				{ key: 'timestamp', label: 'Timestamp', isValueColumn: false },
				{ key: 'value', label: 'Value', isValueColumn: true },
			],
		},
	], // table data
];

const mockQueryPayloads = [
	{ graphType: 'graph', query: { queryType: 'builder' } }, // time_series
	{ graphType: 'table', query: { queryType: 'builder' } }, // table
];

describe('EntityMetrics', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockSelectedInterval = '5m';
		mockUseEntityMetrics.mockReturnValue({
			queries: mockQueries as any,
			chartData: mockChartData,
			tableData: mockTableData,
			queryPayloads: mockQueryPayloads as any,
		});
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
		mockUseEntityMetrics.mockReturnValue({
			queries: mockLoadingQueries as any,
			chartData: [null, null],
			tableData: [null, null],
			queryPayloads: mockQueryPayloads as any,
		});
		renderEntityMetrics();
		expect(screen.getAllByText('CPU Usage')).toHaveLength(1);
		expect(screen.getAllByText('Memory Usage')).toHaveLength(1);
	});

	it('renders error state when query fails', () => {
		mockUseEntityMetrics.mockReturnValue({
			queries: mockErrorQueries as any,
			chartData: [null, null],
			tableData: [null, null],
			queryPayloads: mockQueryPayloads as any,
		});
		renderEntityMetrics();
		expect(screen.getByText('API Error')).toBeInTheDocument();
		expect(screen.getByText('Network Error')).toBeInTheDocument();
	});

	it('renders empty state when no metrics data', () => {
		mockUseEntityMetrics.mockReturnValue({
			queries: mockEmptyQueries as any,
			chartData: [[[]], null],
			tableData: [
				null,
				[
					{
						rows: [],
						columns: [],
					},
				],
			],
			queryPayloads: mockQueryPayloads as any,
		});
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
		expect(mockUseEntityMetrics).toHaveBeenCalledWith(
			expect.objectContaining({
				visibilities: [true, true],
			}),
		);
	});

	it('renders metrics explorer link only for non-table panels', () => {
		renderEntityMetrics();
		expect(screen.getByTestId('open-metrics-explorer-0')).toBeInTheDocument();
		expect(
			screen.queryByTestId('open-metrics-explorer-1'),
		).not.toBeInTheDocument();
	});

	it('builds metrics explorer link with relativeTime when a relative interval is selected', () => {
		mockSelectedInterval = '5m';
		renderEntityMetrics();
		const href = screen
			.getByTestId('open-metrics-explorer-0')
			.getAttribute('href');
		expect(href).toContain('relativeTime=5m');
		expect(href).not.toContain('startTime=');
		expect(href).not.toContain('endTime=');
	});

	it('builds metrics explorer link with absolute time range in milliseconds for custom interval', () => {
		mockSelectedInterval = 'custom';
		renderEntityMetrics();
		const href = screen
			.getByTestId('open-metrics-explorer-0')
			.getAttribute('href');
		expect(href).toContain(`startTime=${mockTimeRange.startTime * 1000}`);
		expect(href).toContain(`endTime=${mockTimeRange.endTime * 1000}`);
		expect(href).not.toContain('relativeTime=');
	});

	it('passes correct parameters to useEntityMetrics hook', () => {
		renderEntityMetrics();
		expect(mockUseEntityMetrics).toHaveBeenCalledWith(
			expect.objectContaining({
				queryKey: 'test-query-key',
				entity: mockEntity,
				category: InfraMonitoringEntity.PODS,
			}),
		);
	});
});
