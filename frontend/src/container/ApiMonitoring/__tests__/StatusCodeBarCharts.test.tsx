import { fireEvent, render, screen } from '@testing-library/react';
import {
	getCustomFiltersForBarChart,
	getFormattedEndPointStatusCodeChartData,
	getStatusCodeBarChartWidgetData,
} from 'container/ApiMonitoring/utils';
import { SuccessResponse } from 'types/api';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';

import ErrorState from '../Explorer/Domains/DomainDetails/components/ErrorState';
import StatusCodeBarCharts from '../Explorer/Domains/DomainDetails/components/StatusCodeBarCharts';

// Create a partial mock of the UseQueryResult interface for testing
interface MockQueryResult {
	isLoading: boolean;
	isRefetching: boolean;
	isError: boolean;
	error?: Error;
	data?: any;
	refetch: () => void;
}

// Mocks
jest.mock('components/Uplot', () => ({
	__esModule: true,
	default: jest.fn().mockImplementation(() => <div data-testid="uplot-mock" />),
}));

jest.mock('components/CeleryTask/useGetGraphCustomSeries', () => ({
	useGetGraphCustomSeries: (): { getCustomSeries: jest.Mock } => ({
		getCustomSeries: jest.fn(),
	}),
}));

jest.mock('components/CeleryTask/useNavigateToExplorer', () => ({
	useNavigateToExplorer: (): { navigateToExplorer: jest.Mock } => ({
		navigateToExplorer: jest.fn(),
	}),
}));

jest.mock('container/GridCardLayout/useGraphClickToShowButton', () => ({
	useGraphClickToShowButton: (): {
		componentClick: boolean;
		htmlRef: HTMLElement | null;
	} => ({
		componentClick: false,
		htmlRef: null,
	}),
}));

jest.mock('container/GridCardLayout/useNavigateToExplorerPages', () => ({
	__esModule: true,
	default: (): { navigateToExplorerPages: jest.Mock } => ({
		navigateToExplorerPages: jest.fn(),
	}),
}));

jest.mock('hooks/useDarkMode', () => ({
	useIsDarkMode: (): boolean => false,
}));

jest.mock('hooks/useDimensions', () => ({
	useResizeObserver: (): { width: number; height: number } => ({
		width: 800,
		height: 400,
	}),
}));

jest.mock('hooks/useNotifications', () => ({
	useNotifications: (): { notifications: [] } => ({ notifications: [] }),
}));

jest.mock('lib/uPlotLib/getUplotChartOptions', () => ({
	getUPlotChartOptions: jest.fn().mockReturnValue({}),
}));

jest.mock('lib/uPlotLib/utils/getUplotChartData', () => ({
	getUPlotChartData: jest.fn().mockReturnValue([]),
}));

// Mock utility functions
jest.mock('container/ApiMonitoring/utils', () => ({
	getFormattedEndPointStatusCodeChartData: jest.fn(),
	getStatusCodeBarChartWidgetData: jest.fn(),
	getCustomFiltersForBarChart: jest.fn(),
	statusCodeWidgetInfo: [
		{ title: 'Status Code Count', yAxisUnit: 'count' },
		{ title: 'Status Code Latency', yAxisUnit: 'ms' },
	],
}));

// Mock the ErrorState component
jest.mock('../Explorer/Domains/DomainDetails/components/ErrorState', () => ({
	__esModule: true,
	default: jest.fn().mockImplementation(({ refetch }) => (
		<div data-testid="error-state-mock">
			<button type="button" data-testid="refetch-button" onClick={refetch}>
				Retry
			</button>
		</div>
	)),
}));

// Mock antd components
jest.mock('antd', () => {
	const originalModule = jest.requireActual('antd');
	return {
		...originalModule,
		Card: jest.fn().mockImplementation(({ children, className }) => (
			<div data-testid="card-mock" className={className}>
				{children}
			</div>
		)),
		Typography: {
			Text: jest
				.fn()
				.mockImplementation(({ children }) => (
					<div data-testid="typography-text">{children}</div>
				)),
		},
		Button: {
			...originalModule.Button,
			Group: jest.fn().mockImplementation(({ children, className }) => (
				<div data-testid="button-group" className={className}>
					{children}
				</div>
			)),
		},
		Skeleton: jest
			.fn()
			.mockImplementation(() => (
				<div data-testid="skeleton-mock">Loading skeleton...</div>
			)),
	};
});

describe('StatusCodeBarCharts', () => {
	// Default props for tests
	const mockFilters: IBuilderQuery['filters'] = { items: [], op: 'AND' };
	const mockTimeRange = {
		startTime: 1609459200000,
		endTime: 1609545600000,
	};
	const mockDomainName = 'test-domain';
	const mockEndPointName = '/api/test';
	const onDragSelectMock = jest.fn();
	const refetchFn = jest.fn();

	// Mock formatted data
	const mockFormattedData = {
		data: {
			result: [
				{
					values: [[1609459200, 10]],
					metric: { statusCode: '200-299' },
					queryName: 'A',
				},
				{
					values: [[1609459200, 5]],
					metric: { statusCode: '400-499' },
					queryName: 'B',
				},
			],
			resultType: 'matrix',
		},
	};

	// Mock filter values
	const mockStatusCodeFilters = [
		{
			id: 'test-id-1',
			key: {
				dataType: 'string',
				id: 'response_status_code--string--tag--false',
				key: 'response_status_code',
				type: 'tag',
			},
			op: '>=',
			value: '200',
		},
		{
			id: 'test-id-2',
			key: {
				dataType: 'string',
				id: 'response_status_code--string--tag--false',
				key: 'response_status_code',
				type: 'tag',
			},
			op: '<=',
			value: '299',
		},
	];

	beforeEach(() => {
		jest.clearAllMocks();
		(getFormattedEndPointStatusCodeChartData as jest.Mock).mockReturnValue(
			mockFormattedData,
		);
		(getStatusCodeBarChartWidgetData as jest.Mock).mockReturnValue({
			id: 'test-widget',
			title: 'Status Code',
			description: 'Shows status code distribution',
			query: { builder: { queryData: [] } },
			panelTypes: 'bar',
		});
		(getCustomFiltersForBarChart as jest.Mock).mockReturnValue(
			mockStatusCodeFilters,
		);
	});

	it('renders loading state correctly', () => {
		// Arrange
		const mockStatusCodeQuery: MockQueryResult = {
			isLoading: true,
			isRefetching: false,
			isError: false,
			data: undefined,
			refetch: refetchFn,
		};

		const mockLatencyQuery: MockQueryResult = {
			isLoading: false,
			isRefetching: false,
			isError: false,
			data: undefined,
			refetch: refetchFn,
		};

		// Act
		render(
			<StatusCodeBarCharts
				endPointStatusCodeBarChartsDataQuery={mockStatusCodeQuery as any}
				endPointStatusCodeLatencyBarChartsDataQuery={mockLatencyQuery as any}
				domainName={mockDomainName}
				endPointName={mockEndPointName}
				filters={mockFilters}
				timeRange={mockTimeRange}
				onDragSelect={onDragSelectMock}
			/>,
		);

		// Assert
		expect(screen.getByTestId('skeleton-mock')).toBeInTheDocument();
	});

	it('renders error state correctly', () => {
		// Arrange
		const mockStatusCodeQuery: MockQueryResult = {
			isLoading: false,
			isRefetching: false,
			isError: true,
			error: new Error('Test error'),
			data: undefined,
			refetch: refetchFn,
		};

		const mockLatencyQuery: MockQueryResult = {
			isLoading: false,
			isRefetching: false,
			isError: false,
			data: undefined,
			refetch: refetchFn,
		};

		// Act
		render(
			<StatusCodeBarCharts
				endPointStatusCodeBarChartsDataQuery={mockStatusCodeQuery as any}
				endPointStatusCodeLatencyBarChartsDataQuery={mockLatencyQuery as any}
				domainName={mockDomainName}
				endPointName={mockEndPointName}
				filters={mockFilters}
				timeRange={mockTimeRange}
				onDragSelect={onDragSelectMock}
			/>,
		);

		// Assert
		expect(screen.getByTestId('error-state-mock')).toBeInTheDocument();
		expect(ErrorState).toHaveBeenCalledWith(
			{ refetch: expect.any(Function) },
			expect.anything(),
		);
	});

	it('renders chart data correctly when loaded', () => {
		// Arrange
		const mockData = {
			payload: mockFormattedData,
		} as SuccessResponse<any>;

		const mockStatusCodeQuery: MockQueryResult = {
			isLoading: false,
			isRefetching: false,
			isError: false,
			data: mockData,
			refetch: refetchFn,
		};

		const mockLatencyQuery: MockQueryResult = {
			isLoading: false,
			isRefetching: false,
			isError: false,
			data: mockData,
			refetch: refetchFn,
		};

		// Act
		render(
			<StatusCodeBarCharts
				endPointStatusCodeBarChartsDataQuery={mockStatusCodeQuery as any}
				endPointStatusCodeLatencyBarChartsDataQuery={mockLatencyQuery as any}
				domainName={mockDomainName}
				endPointName={mockEndPointName}
				filters={mockFilters}
				timeRange={mockTimeRange}
				onDragSelect={onDragSelectMock}
			/>,
		);

		// Assert
		expect(getFormattedEndPointStatusCodeChartData).toHaveBeenCalledWith(
			mockData.payload,
			'sum',
		);
		expect(screen.getByTestId('uplot-mock')).toBeInTheDocument();
		expect(screen.getByText('Number of calls')).toBeInTheDocument();
		expect(screen.getByText('Latency')).toBeInTheDocument();
	});

	it('switches between number of calls and latency views', () => {
		// Arrange
		const mockData = {
			payload: mockFormattedData,
		} as SuccessResponse<any>;

		const mockStatusCodeQuery: MockQueryResult = {
			isLoading: false,
			isRefetching: false,
			isError: false,
			data: mockData,
			refetch: refetchFn,
		};

		const mockLatencyQuery: MockQueryResult = {
			isLoading: false,
			isRefetching: false,
			isError: false,
			data: mockData,
			refetch: refetchFn,
		};

		// Act
		render(
			<StatusCodeBarCharts
				endPointStatusCodeBarChartsDataQuery={mockStatusCodeQuery as any}
				endPointStatusCodeLatencyBarChartsDataQuery={mockLatencyQuery as any}
				domainName={mockDomainName}
				endPointName={mockEndPointName}
				filters={mockFilters}
				timeRange={mockTimeRange}
				onDragSelect={onDragSelectMock}
			/>,
		);

		// Initially should be showing number of calls (index 0)
		const latencyButton = screen.getByText('Latency');

		// Click to switch to latency view
		fireEvent.click(latencyButton);

		// Should now format with the latency data
		expect(getFormattedEndPointStatusCodeChartData).toHaveBeenCalledWith(
			mockData.payload,
			'average',
		);
	});

	it('uses getCustomFiltersForBarChart when needed', () => {
		// Arrange
		const mockData = {
			payload: mockFormattedData,
		} as SuccessResponse<any>;

		const mockStatusCodeQuery: MockQueryResult = {
			isLoading: false,
			isRefetching: false,
			isError: false,
			data: mockData,
			refetch: refetchFn,
		};

		const mockLatencyQuery: MockQueryResult = {
			isLoading: false,
			isRefetching: false,
			isError: false,
			data: mockData,
			refetch: refetchFn,
		};

		// Act
		render(
			<StatusCodeBarCharts
				endPointStatusCodeBarChartsDataQuery={mockStatusCodeQuery as any}
				endPointStatusCodeLatencyBarChartsDataQuery={mockLatencyQuery as any}
				domainName={mockDomainName}
				endPointName={mockEndPointName}
				filters={mockFilters}
				timeRange={mockTimeRange}
				onDragSelect={onDragSelectMock}
			/>,
		);

		// Assert
		// Initially getCustomFiltersForBarChart won't be called until a graph click event
		expect(getCustomFiltersForBarChart).not.toHaveBeenCalled();

		// We can't easily test the graph click handler directly,
		// but we've confirmed the function is mocked and ready to be tested
		expect(getStatusCodeBarChartWidgetData).toHaveBeenCalledWith(
			mockDomainName,
			mockEndPointName,
			expect.objectContaining({
				items: [],
				op: 'AND',
			}),
		);
	});

	it('handles widget generation with current filters', () => {
		// Arrange
		const mockCustomFilters = {
			items: [
				{
					id: 'custom-filter',
					key: { key: 'test-key' },
					op: '=',
					value: 'test-value',
				},
			],
			op: 'AND',
		};

		const mockData = {
			payload: mockFormattedData,
		} as SuccessResponse<any>;

		const mockStatusCodeQuery: MockQueryResult = {
			isLoading: false,
			isRefetching: false,
			isError: false,
			data: mockData,
			refetch: refetchFn,
		};

		const mockLatencyQuery: MockQueryResult = {
			isLoading: false,
			isRefetching: false,
			isError: false,
			data: mockData,
			refetch: refetchFn,
		};

		// Act
		render(
			<StatusCodeBarCharts
				endPointStatusCodeBarChartsDataQuery={mockStatusCodeQuery as any}
				endPointStatusCodeLatencyBarChartsDataQuery={mockLatencyQuery as any}
				domainName={mockDomainName}
				endPointName={mockEndPointName}
				filters={mockCustomFilters as IBuilderQuery['filters']}
				timeRange={mockTimeRange}
				onDragSelect={onDragSelectMock}
			/>,
		);

		// Assert widget creation was called with the correct parameters
		expect(getStatusCodeBarChartWidgetData).toHaveBeenCalledWith(
			mockDomainName,
			mockEndPointName,
			expect.objectContaining({
				items: expect.arrayContaining([
					expect.objectContaining({ id: 'custom-filter' }),
				]),
				op: 'AND',
			}),
		);
	});
});
