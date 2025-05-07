import '@testing-library/jest-dom';

import { render, screen } from '@testing-library/react';

import StatusCodeTable from '../Explorer/Domains/DomainDetails/components/StatusCodeTable';

// Mock the ErrorState component
jest.mock('../Explorer/Domains/DomainDetails/components/ErrorState', () =>
	jest.fn().mockImplementation(({ refetch }) => (
		<div
			data-testid="error-state-mock"
			onClick={refetch}
			onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>): void => {
				if (e.key === 'Enter' || e.key === ' ') {
					refetch();
				}
			}}
			role="button"
			tabIndex={0}
		>
			Error state
		</div>
	)),
);

// Mock antd components
jest.mock('antd', () => {
	const originalModule = jest.requireActual('antd');
	return {
		...originalModule,
		Table: jest
			.fn()
			.mockImplementation(({ loading, dataSource, columns, locale }) => (
				<div data-testid="table-mock">
					{loading && <div data-testid="loading-indicator">Loading...</div>}
					{dataSource &&
						dataSource.length === 0 &&
						!loading &&
						locale?.emptyText && (
							<div data-testid="empty-table">{locale.emptyText}</div>
						)}
					{dataSource && dataSource.length > 0 && (
						<div data-testid="table-data">
							Data loaded with {dataSource.length} rows and {columns.length} columns
						</div>
					)}
				</div>
			)),
		Typography: {
			Text: jest.fn().mockImplementation(({ children, className }) => (
				<div data-testid="typography-text" className={className}>
					{children}
				</div>
			)),
		},
	};
});

// Create a mock query result type
interface MockQueryResult {
	isLoading: boolean;
	isRefetching: boolean;
	isError: boolean;
	error?: Error;
	data?: any;
	refetch: () => void;
}

describe('StatusCodeTable', () => {
	const refetchFn = jest.fn();

	it('renders loading state correctly', () => {
		// Arrange
		const mockQuery: MockQueryResult = {
			isLoading: true,
			isRefetching: false,
			isError: false,
			data: undefined,
			refetch: refetchFn,
		};

		// Act
		render(<StatusCodeTable endPointStatusCodeDataQuery={mockQuery as any} />);

		// Assert
		expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
	});

	it('renders error state correctly', () => {
		// Arrange
		const mockQuery: MockQueryResult = {
			isLoading: false,
			isRefetching: false,
			isError: true,
			error: new Error('Test error'),
			data: undefined,
			refetch: refetchFn,
		};

		// Act
		render(<StatusCodeTable endPointStatusCodeDataQuery={mockQuery as any} />);

		// Assert
		expect(screen.getByTestId('error-state-mock')).toBeInTheDocument();
	});

	it('renders empty state when no data is available', () => {
		// Arrange
		const mockQuery: MockQueryResult = {
			isLoading: false,
			isRefetching: false,
			isError: false,
			data: {
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
			},
			refetch: refetchFn,
		};

		// Act
		render(<StatusCodeTable endPointStatusCodeDataQuery={mockQuery as any} />);

		// Assert
		expect(screen.getByTestId('empty-table')).toBeInTheDocument();
	});

	it('renders table data correctly when data is available', () => {
		// Arrange
		const mockData = [
			{
				data: {
					response_status_code: '200',
					A: '150', // count
					B: '10000000', // latency in nanoseconds
					C: '5', // rate
				},
			},
		];

		const mockQuery: MockQueryResult = {
			isLoading: false,
			isRefetching: false,
			isError: false,
			data: {
				payload: {
					data: {
						result: [
							{
								table: {
									rows: mockData,
								},
							},
						],
					},
				},
			},
			refetch: refetchFn,
		};

		// Act
		render(<StatusCodeTable endPointStatusCodeDataQuery={mockQuery as any} />);

		// Assert
		expect(screen.getByTestId('table-data')).toBeInTheDocument();
	});
});
