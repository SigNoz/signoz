import { fireEvent, render, screen, within } from '@testing-library/react';
import { useNavigateToExplorer } from 'components/CeleryTask/useNavigateToExplorer';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import {
	formatTopErrorsDataForTable,
	getEndPointDetailsQueryPayload,
	getTopErrorsColumnsConfig,
	getTopErrorsCoRelationQueryFilters,
	getTopErrorsQueryPayload,
} from 'container/ApiMonitoring/utils';
import { useQueries } from 'react-query';
import { DataSource } from 'types/common/queryBuilder';

import TopErrors from '../Explorer/Domains/DomainDetails/TopErrors';

// Mock the EndPointsDropDown component to avoid issues
jest.mock(
	'../Explorer/Domains/DomainDetails/components/EndPointsDropDown',
	() => ({
		__esModule: true,
		default: jest.fn().mockImplementation(
			({ setSelectedEndPointName }): JSX.Element => (
				<div data-testid="endpoints-dropdown-mock">
					<select
						data-testid="endpoints-select"
						onChange={(e): void => setSelectedEndPointName(e.target.value)}
						role="combobox"
					>
						<option value="/api/test">/api/test</option>
						<option value="/api/new-endpoint">/api/new-endpoint</option>
					</select>
				</div>
			),
		),
	}),
);

// Mock dependencies
jest.mock('react-query', () => ({
	useQueries: jest.fn(),
}));

jest.mock('components/CeleryTask/useNavigateToExplorer', () => ({
	useNavigateToExplorer: jest.fn(),
}));

jest.mock('container/ApiMonitoring/utils', () => ({
	END_POINT_DETAILS_QUERY_KEYS_ARRAY: ['key1', 'key2', 'key3', 'key4', 'key5'],
	formatTopErrorsDataForTable: jest.fn(),
	getEndPointDetailsQueryPayload: jest.fn(),
	getTopErrorsColumnsConfig: jest.fn(),
	getTopErrorsCoRelationQueryFilters: jest.fn(),
	getTopErrorsQueryPayload: jest.fn(),
}));

describe('TopErrors', () => {
	const mockProps = {
		// eslint-disable-next-line sonarjs/no-duplicate-string
		domainName: 'test-domain',
		timeRange: {
			startTime: 1000000000,
			endTime: 1000010000,
		},
		initialFilters: {
			items: [],
			op: 'AND',
		},
	};

	// Setup basic mocks
	beforeEach(() => {
		jest.clearAllMocks();

		// Mock getTopErrorsColumnsConfig
		(getTopErrorsColumnsConfig as jest.Mock).mockReturnValue([
			{
				title: 'Endpoint',
				dataIndex: 'endpointName',
				key: 'endpointName',
			},
			{
				title: 'Status Code',
				dataIndex: 'statusCode',
				key: 'statusCode',
			},
			{
				title: 'Status Message',
				dataIndex: 'statusMessage',
				key: 'statusMessage',
			},
			{
				title: 'Count',
				dataIndex: 'count',
				key: 'count',
			},
		]);

		// Mock useQueries
		(useQueries as jest.Mock).mockImplementation((queryConfigs) => {
			// For topErrorsDataQueries
			if (
				queryConfigs.length === 1 &&
				queryConfigs[0].queryKey &&
				queryConfigs[0].queryKey[0] === REACT_QUERY_KEY.GET_TOP_ERRORS_BY_DOMAIN
			) {
				return [
					{
						data: {
							payload: {
								data: {
									result: [
										{
											metric: {
												'http.url': '/api/test',
												status_code: '500',
												// eslint-disable-next-line sonarjs/no-duplicate-string
												status_message: 'Internal Server Error',
											},
											values: [[1000000100, '10']],
											queryName: 'A',
											legend: 'Test Legend',
										},
									],
								},
							},
						},
						isLoading: false,
						isRefetching: false,
						isError: false,
						refetch: jest.fn(),
					},
				];
			}

			// For endPointDropDownDataQueries
			return [
				{
					data: {
						payload: {
							data: {
								result: [
									{
										table: {
											rows: [
												{
													'http.url': '/api/test',
													A: 100,
												},
											],
										},
									},
								],
							},
						},
					},
					isLoading: false,
					isRefetching: false,
					isError: false,
				},
			];
		});

		// Mock formatTopErrorsDataForTable
		(formatTopErrorsDataForTable as jest.Mock).mockReturnValue([
			{
				key: '1',
				endpointName: '/api/test',
				statusCode: '500',
				statusMessage: 'Internal Server Error',
				count: 10,
			},
		]);

		// Mock getTopErrorsQueryPayload
		(getTopErrorsQueryPayload as jest.Mock).mockReturnValue([
			{
				queryName: 'TopErrorsQuery',
				start: mockProps.timeRange.startTime,
				end: mockProps.timeRange.endTime,
				step: 60,
			},
		]);

		// Mock getEndPointDetailsQueryPayload
		(getEndPointDetailsQueryPayload as jest.Mock).mockReturnValue([
			{},
			{},
			{
				queryName: 'EndpointDropdownQuery',
				start: mockProps.timeRange.startTime,
				end: mockProps.timeRange.endTime,
				step: 60,
			},
		]);

		// Mock useNavigateToExplorer
		(useNavigateToExplorer as jest.Mock).mockReturnValue(jest.fn());

		// Mock getTopErrorsCoRelationQueryFilters
		(getTopErrorsCoRelationQueryFilters as jest.Mock).mockReturnValue({
			items: [
				{ id: 'test1', key: { key: 'domain' }, op: '=', value: 'test-domain' },
				{ id: 'test2', key: { key: 'endpoint' }, op: '=', value: '/api/test' },
				{ id: 'test3', key: { key: 'status' }, op: '=', value: '500' },
			],
			op: 'AND',
		});
	});

	it('renders component correctly', () => {
		// eslint-disable-next-line react/jsx-props-no-spreading
		const { container } = render(<TopErrors {...mockProps} />);

		// Check if the title and toggle are rendered
		expect(screen.getByText('Errors with Status Message')).toBeInTheDocument();
		expect(screen.getByText('Status Message Exists')).toBeInTheDocument();

		// Find the table row and verify content
		const tableBody = container.querySelector('.ant-table-tbody');
		expect(tableBody).not.toBeNull();

		if (tableBody) {
			const row = within(tableBody as HTMLElement).getByRole('row');
			expect(within(row).getByText('/api/test')).toBeInTheDocument();
			expect(within(row).getByText('500')).toBeInTheDocument();
			expect(within(row).getByText('Internal Server Error')).toBeInTheDocument();
		}
	});

	it('renders error state when isError is true', () => {
		// Mock useQueries to return isError: true
		(useQueries as jest.Mock).mockImplementationOnce(() => [
			{
				isError: true,
				refetch: jest.fn(),
			},
		]);

		// eslint-disable-next-line react/jsx-props-no-spreading
		render(<TopErrors {...mockProps} />);

		// Error state should be shown with the actual text displayed in the UI
		expect(
			screen.getByText('Uh-oh :/ We ran into an error.'),
		).toBeInTheDocument();
		expect(screen.getByText('Please refresh this panel.')).toBeInTheDocument();
		expect(screen.getByText('Refresh this panel')).toBeInTheDocument();
	});

	it('handles row click correctly', () => {
		const navigateMock = jest.fn();
		(useNavigateToExplorer as jest.Mock).mockReturnValue(navigateMock);

		// eslint-disable-next-line react/jsx-props-no-spreading
		const { container } = render(<TopErrors {...mockProps} />);

		// Find and click on the table cell containing the endpoint
		const tableBody = container.querySelector('.ant-table-tbody');
		expect(tableBody).not.toBeNull();

		if (tableBody) {
			const row = within(tableBody as HTMLElement).getByRole('row');
			const cellWithEndpoint = within(row).getByText('/api/test');
			fireEvent.click(cellWithEndpoint);
		}

		// Check if navigateToExplorer was called with correct params
		expect(navigateMock).toHaveBeenCalledWith({
			filters: [
				{ id: 'test1', key: { key: 'domain' }, op: '=', value: 'test-domain' },
				{ id: 'test2', key: { key: 'endpoint' }, op: '=', value: '/api/test' },
				{ id: 'test3', key: { key: 'status' }, op: '=', value: '500' },
			],
			dataSource: DataSource.TRACES,
			startTime: mockProps.timeRange.startTime,
			endTime: mockProps.timeRange.endTime,
			shouldResolveQuery: true,
		});
	});

	it('updates endpoint filter when dropdown value changes', () => {
		// eslint-disable-next-line react/jsx-props-no-spreading
		render(<TopErrors {...mockProps} />);

		// Find the dropdown
		const dropdown = screen.getByRole('combobox');

		// Mock the change
		fireEvent.change(dropdown, { target: { value: '/api/new-endpoint' } });

		// Check if getTopErrorsQueryPayload was called with updated parameters
		expect(getTopErrorsQueryPayload).toHaveBeenCalled();
	});

	it('handles status message toggle correctly', () => {
		// eslint-disable-next-line react/jsx-props-no-spreading
		render(<TopErrors {...mockProps} />);

		// Find the toggle switch
		const toggle = screen.getByRole('switch');
		expect(toggle).toBeInTheDocument();

		// Toggle should be on by default
		expect(toggle).toHaveAttribute('aria-checked', 'true');

		// Click the toggle to turn it off
		fireEvent.click(toggle);

		// Check if getTopErrorsQueryPayload was called with showStatusCodeErrors=false
		expect(getTopErrorsQueryPayload).toHaveBeenCalledWith(
			mockProps.domainName,
			mockProps.timeRange.startTime,
			mockProps.timeRange.endTime,
			expect.any(Object),
			false,
		);

		// Title should change
		expect(screen.getByText('All Errors')).toBeInTheDocument();

		// Click the toggle to turn it back on
		fireEvent.click(toggle);

		// Check if getTopErrorsQueryPayload was called with showStatusCodeErrors=true
		expect(getTopErrorsQueryPayload).toHaveBeenCalledWith(
			mockProps.domainName,
			mockProps.timeRange.startTime,
			mockProps.timeRange.endTime,
			expect.any(Object),
			true,
		);

		// Title should change back
		expect(screen.getByText('Errors with Status Message')).toBeInTheDocument();
	});

	it('includes toggle state in query key for cache busting', () => {
		// eslint-disable-next-line react/jsx-props-no-spreading
		render(<TopErrors {...mockProps} />);

		const toggle = screen.getByRole('switch');

		// Initial query should include showStatusCodeErrors=true
		expect(useQueries).toHaveBeenCalledWith(
			expect.arrayContaining([
				expect.objectContaining({
					queryKey: expect.arrayContaining([
						REACT_QUERY_KEY.GET_TOP_ERRORS_BY_DOMAIN,
						expect.any(Object),
						expect.any(String),
						true,
					]),
				}),
			]),
		);

		// Click toggle
		fireEvent.click(toggle);

		// Query should be called with showStatusCodeErrors=false in key
		expect(useQueries).toHaveBeenCalledWith(
			expect.arrayContaining([
				expect.objectContaining({
					queryKey: expect.arrayContaining([
						REACT_QUERY_KEY.GET_TOP_ERRORS_BY_DOMAIN,
						expect.any(Object),
						expect.any(String),
						false,
					]),
				}),
			]),
		);
	});
});
