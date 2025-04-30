import { render, screen } from '@testing-library/react';
import { getFormattedEndPointMetricsData } from 'container/ApiMonitoring/utils';
import { SuccessResponse } from 'types/api';

import EndPointMetrics from '../Explorer/Domains/DomainDetails/components/EndPointMetrics';
import ErrorState from '../Explorer/Domains/DomainDetails/components/ErrorState';

// Create a partial mock of the UseQueryResult interface for testing
interface MockQueryResult {
	isLoading: boolean;
	isRefetching: boolean;
	isError: boolean;
	data?: any;
	refetch: () => void;
}

// Mock the utils function
jest.mock('container/ApiMonitoring/utils', () => ({
	getFormattedEndPointMetricsData: jest.fn(),
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
		Progress: jest
			.fn()
			.mockImplementation(() => <div data-testid="progress-bar-mock" />),
		Skeleton: {
			Button: jest
				.fn()
				.mockImplementation(() => <div data-testid="skeleton-button-mock" />),
		},
		Tooltip: jest
			.fn()
			.mockImplementation(({ children }) => (
				<div data-testid="tooltip-mock">{children}</div>
			)),
		Typography: {
			Text: jest.fn().mockImplementation(({ children, className }) => (
				<div data-testid={`typography-${className}`} className={className}>
					{children}
				</div>
			)),
		},
	};
});

describe('EndPointMetrics', () => {
	// Common metric data to use in tests
	const mockMetricsData = {
		key: 'test-key',
		rate: '42',
		latency: 99,
		errorRate: 5.5,
		lastUsed: '5 minutes ago',
	};

	// Basic props for tests
	const refetchFn = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();
		(getFormattedEndPointMetricsData as jest.Mock).mockReturnValue(
			mockMetricsData,
		);
	});

	it('renders loading state correctly', () => {
		const mockQuery: MockQueryResult = {
			isLoading: true,
			isRefetching: false,
			isError: false,
			data: undefined,
			refetch: refetchFn,
		};

		render(<EndPointMetrics endPointMetricsDataQuery={mockQuery as any} />);

		// Verify skeleton loaders are visible
		const skeletonElements = screen.getAllByTestId('skeleton-button-mock');
		expect(skeletonElements.length).toBe(4);

		// Verify labels are visible even during loading
		expect(screen.getByText('Rate')).toBeInTheDocument();
		expect(screen.getByText('AVERAGE LATENCY')).toBeInTheDocument();
		expect(screen.getByText('ERROR %')).toBeInTheDocument();
		expect(screen.getByText('LAST USED')).toBeInTheDocument();
	});

	it('renders error state correctly', () => {
		const mockQuery: MockQueryResult = {
			isLoading: false,
			isRefetching: false,
			isError: true,
			data: undefined,
			refetch: refetchFn,
		};

		render(<EndPointMetrics endPointMetricsDataQuery={mockQuery as any} />);

		// Verify error state is shown
		expect(screen.getByTestId('error-state-mock')).toBeInTheDocument();
		expect(ErrorState).toHaveBeenCalledWith(
			{ refetch: expect.any(Function) },
			expect.anything(),
		);
	});

	it('renders data correctly when loaded', () => {
		const mockData = {
			payload: {
				data: {
					result: [
						{
							table: {
								rows: [
									{ data: { A: '42', B: '99000000', D: '1609459200000000', F1: '5.5' } },
								],
							},
						},
					],
				},
			},
		} as SuccessResponse<any>;

		const mockQuery: MockQueryResult = {
			isLoading: false,
			isRefetching: false,
			isError: false,
			data: mockData,
			refetch: refetchFn,
		};

		render(<EndPointMetrics endPointMetricsDataQuery={mockQuery as any} />);

		// Verify the utils function was called with the data
		expect(getFormattedEndPointMetricsData).toHaveBeenCalledWith(
			mockData.payload.data.result[0].table.rows,
		);

		// Verify data is displayed
		expect(
			screen.getByText(`${mockMetricsData.rate} ops/sec`),
		).toBeInTheDocument();
		expect(screen.getByText(`${mockMetricsData.latency}ms`)).toBeInTheDocument();
		expect(screen.getByText(mockMetricsData.lastUsed)).toBeInTheDocument();
		expect(screen.getByTestId('progress-bar-mock')).toBeInTheDocument(); // For error rate
	});

	it('handles refetching state correctly', () => {
		const mockQuery: MockQueryResult = {
			isLoading: false,
			isRefetching: true,
			isError: false,
			data: undefined,
			refetch: refetchFn,
		};

		render(<EndPointMetrics endPointMetricsDataQuery={mockQuery as any} />);

		// Verify skeleton loaders are visible during refetching
		const skeletonElements = screen.getAllByTestId('skeleton-button-mock');
		expect(skeletonElements.length).toBe(4);
	});

	it('handles null metrics data gracefully', () => {
		// Mock the utils function to return null to simulate missing data
		(getFormattedEndPointMetricsData as jest.Mock).mockReturnValue(null);

		const mockData = {
			payload: {
				data: {
					result: [
						{
							table: {
								rows: [],
							},
						},
					],
				},
			},
		} as SuccessResponse<any>;

		const mockQuery: MockQueryResult = {
			isLoading: false,
			isRefetching: false,
			isError: false,
			data: mockData,
			refetch: refetchFn,
		};

		render(<EndPointMetrics endPointMetricsDataQuery={mockQuery as any} />);

		// Even with null data, the component should render without crashing
		expect(screen.getByText('Rate')).toBeInTheDocument();
	});
});
