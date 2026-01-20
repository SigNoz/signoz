/* eslint-disable sonarjs/no-identical-functions */
import useGetTopLevelOperations from 'hooks/useGetTopLevelOperations';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { act, render, screen } from 'tests/test-utils';

import ServicesUsingMetrics from './index';

// Mock the useGetTopLevelOperations hook
jest.mock('hooks/useGetTopLevelOperations', () => ({
	__esModule: true,
	default: jest.fn(),
}));

const mockUseGetTopLevelOperations = useGetTopLevelOperations as jest.MockedFunction<
	typeof useGetTopLevelOperations
>;

describe('ServicesUsingMetrics', () => {
	beforeEach(() => {
		// Reset all mocks before each test
		jest.clearAllMocks();
	});

	test('should render the ServicesUsingMetrics component', async () => {
		// Mock successful API response
		mockUseGetTopLevelOperations.mockReturnValue({
			data: {
				SampleApp: ['GET'],
				TestApp: ['POST'],
			},
			isLoading: false,
			isError: false,
			error: null,
			isIdle: false,
			isLoadingError: false,
			isRefetchError: false,
			isSuccess: true,
			status: 'success',
			dataUpdatedAt: 0,
			errorUpdatedAt: 0,
			failureCount: 0,
			failureReason: null,
			isFetching: false,
			isFetchingNextPage: false,
			isFetchingPreviousPage: false,
			isPlaceholderData: false,
			isPreviousData: false,
			isStale: false,
			refetch: jest.fn(),
			remove: jest.fn(),
		} as any);

		// Mock the query range API responses
		server.use(
			rest.post('*/api/v1/query_range', (req, res, ctx) =>
				res(
					ctx.status(200),
					ctx.json({
						status: 'success',
						data: {
							resultType: 'matrix',
							result: [
								{
									metric: { __name__: 'A' },
									values: [[Date.now() / 1000, '100']],
								},
								{
									metric: { __name__: 'D' },
									values: [[Date.now() / 1000, '50']],
								},
								{
									metric: { __name__: 'F1' },
									values: [[Date.now() / 1000, '2.5']],
								},
							],
						},
					}),
				),
			),
		);

		await act(async () => {
			render(<ServicesUsingMetrics />);
		});

		// Wait for the component to load and render
		await screen.findByText(/application/i);
		expect(screen.getByText(/p99 latency \(in ns\)/i)).toBeInTheDocument();
		expect(screen.getByText(/error rate \(% of total\)/i)).toBeInTheDocument();
	});

	test('should render the ServicesUsingMetrics component with loading', async () => {
		// Mock loading state
		mockUseGetTopLevelOperations.mockReturnValue({
			data: undefined,
			isLoading: true,
			isError: false,
			error: null,
			isIdle: false,
			isLoadingError: false,
			isRefetchError: false,
			isSuccess: false,
			status: 'loading',
			dataUpdatedAt: 0,
			errorUpdatedAt: 0,
			failureCount: 0,
			failureReason: null,
			isFetching: true,
			isFetchingNextPage: false,
			isFetchingPreviousPage: false,
			isPlaceholderData: false,
			isPreviousData: false,
			isStale: false,
			refetch: jest.fn(),
			remove: jest.fn(),
		} as any);

		await act(async () => {
			render(<ServicesUsingMetrics />);
		});

		// Should show loading spinner
		expect(screen.getByLabelText(/loading/i)).toBeInTheDocument();
	});

	test('should not render if the data is not present', async () => {
		// Mock successful API response with data
		mockUseGetTopLevelOperations.mockReturnValue({
			data: {
				SampleApp: ['GET'],
				TestApp: ['GET'],
			},
			isLoading: false,
			isError: false,
			error: null,
			isIdle: false,
			isLoadingError: false,
			isRefetchError: false,
			isSuccess: true,
			status: 'success',
			dataUpdatedAt: 0,
			errorUpdatedAt: 0,
			failureCount: 0,
			failureReason: null,
			isFetching: false,
			isFetchingNextPage: false,
			isFetchingPreviousPage: false,
			isPlaceholderData: false,
			isPreviousData: false,
			isStale: false,
			refetch: jest.fn(),
			remove: jest.fn(),
		} as any);

		// Mock the query range API responses
		server.use(
			rest.post('*/api/v1/query_range', (req, res, ctx) =>
				res(
					ctx.status(200),
					ctx.json({
						status: 'success',
						data: {
							resultType: 'matrix',
							result: [
								{
									metric: { __name__: 'A' },
									values: [[Date.now() / 1000, '100']],
								},
								{
									metric: { __name__: 'D' },
									values: [[Date.now() / 1000, '50']],
								},
								{
									metric: { __name__: 'F1' },
									values: [[Date.now() / 1000, '2.5']],
								},
							],
						},
					}),
				),
			),
		);

		await act(async () => {
			render(<ServicesUsingMetrics />);
		});

		// Wait for the services to be rendered
		await screen.findByText(/SampleApp/i);
		expect(screen.getByText(/TestApp/i)).toBeInTheDocument();
	});
});
