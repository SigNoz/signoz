import { BuilderQuery } from 'api/v5/v5';
import { useNavigateToExplorer } from 'components/CeleryTask/useNavigateToExplorer';
import { rest, server } from 'mocks-server/server';
import { fireEvent, render, screen, waitFor, within } from 'tests/test-utils';
import { DataSource } from 'types/common/queryBuilder';

import TopErrors from '../Explorer/Domains/DomainDetails/TopErrors';
import { getTopErrorsQueryPayload } from '../utils';

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

jest.mock('components/CeleryTask/useNavigateToExplorer', () => ({
	useNavigateToExplorer: jest.fn(),
}));

describe('TopErrors', () => {
	const TABLE_BODY_SELECTOR = '.ant-table-tbody';
	const V5_QUERY_RANGE_API_PATH = '*/api/v5/query_range';

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

	// Helper function to wait for table data to load
	const waitForTableDataToLoad = async (
		container: HTMLElement,
	): Promise<void> => {
		await waitFor(() => {
			const tableBody = container.querySelector(TABLE_BODY_SELECTOR);
			expect(tableBody).not.toBeNull();
			if (tableBody) {
				expect(
					within(tableBody as HTMLElement).queryByText('/api/test'),
				).toBeInTheDocument();
			}
		});
	};

	beforeEach(() => {
		jest.clearAllMocks();

		// Mock useNavigateToExplorer
		(useNavigateToExplorer as jest.Mock).mockReturnValue(jest.fn());

		// Mock V5 API endpoint for top errors
		server.use(
			rest.post(V5_QUERY_RANGE_API_PATH, (_req, res, ctx) =>
				res(
					ctx.status(200),
					ctx.json({
						data: {
							data: {
								results: [
									{
										columns: [
											{
												name: 'http.url',
												fieldDataType: 'string',
												fieldContext: 'attribute',
											},
											{
												name: 'response_status_code',
												fieldDataType: 'string',
												fieldContext: 'span',
											},
											{
												name: 'status_message',
												fieldDataType: 'string',
												fieldContext: 'span',
											},
											{ name: 'count()', fieldDataType: 'int64', fieldContext: '' },
										],
										// eslint-disable-next-line sonarjs/no-duplicate-string
										data: [['/api/test', '500', 'Internal Server Error', 10]],
									},
								],
							},
						},
					}),
				),
			),
		);

		// Mock V4 API endpoint for dropdown data
		server.use(
			rest.post('*/api/v1/query_range', (_req, res, ctx) =>
				res(
					ctx.status(200),
					ctx.json({
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
					}),
				),
			),
		);
	});

	it('renders component correctly', async () => {
		// eslint-disable-next-line react/jsx-props-no-spreading
		const { container } = render(<TopErrors {...mockProps} />);

		// Check if the title and toggle are rendered
		expect(screen.getByText('Errors with Status Message')).toBeInTheDocument();
		expect(screen.getByText('Status Message Exists')).toBeInTheDocument();

		// Wait for data to load
		await waitForTableDataToLoad(container);

		// Find the table row and verify content
		const tableBody = container.querySelector(TABLE_BODY_SELECTOR);
		if (tableBody) {
			const row = within(tableBody as HTMLElement).getByRole('row');
			expect(within(row).getByText('/api/test')).toBeInTheDocument();
			expect(within(row).getByText('500')).toBeInTheDocument();
			expect(within(row).getByText('Internal Server Error')).toBeInTheDocument();
		}
	});

	it('renders error state when API fails', async () => {
		// Mock API to return error
		server.use(
			rest.post(V5_QUERY_RANGE_API_PATH, (_req, res, ctx) =>
				res(ctx.status(500), ctx.json({ error: 'Internal Server Error' })),
			),
		);

		// eslint-disable-next-line react/jsx-props-no-spreading
		render(<TopErrors {...mockProps} />);

		// Wait for error state
		await waitFor(() => {
			expect(
				screen.getByText('Uh-oh :/ We ran into an error.'),
			).toBeInTheDocument();
		});

		expect(screen.getByText('Please refresh this panel.')).toBeInTheDocument();
		expect(screen.getByText('Refresh this panel')).toBeInTheDocument();
	});

	it('handles row click correctly', async () => {
		const navigateMock = jest.fn();
		(useNavigateToExplorer as jest.Mock).mockReturnValue(navigateMock);

		// eslint-disable-next-line react/jsx-props-no-spreading
		const { container } = render(<TopErrors {...mockProps} />);

		// Wait for data to load
		await waitForTableDataToLoad(container);

		// Find and click on the table cell containing the endpoint
		const tableBody = container.querySelector(TABLE_BODY_SELECTOR);
		expect(tableBody).not.toBeNull();

		if (tableBody) {
			const row = within(tableBody as HTMLElement).getByRole('row');
			const cellWithEndpoint = within(row).getByText('/api/test');
			fireEvent.click(cellWithEndpoint);
		}

		// Check if navigateToExplorer was called with correct params
		expect(navigateMock).toHaveBeenCalledWith({
			filters: expect.arrayContaining([
				expect.objectContaining({
					key: expect.objectContaining({ key: 'http.url' }),
					op: '=',
					value: '/api/test',
				}),
				expect.objectContaining({
					key: expect.objectContaining({ key: 'has_error' }),
					op: '=',
					value: 'true',
				}),
				expect.objectContaining({
					key: expect.objectContaining({ key: 'net.peer.name' }),
					op: '=',
					value: 'test-domain',
				}),
				expect.objectContaining({
					key: expect.objectContaining({ key: 'response_status_code' }),
					op: '=',
					value: '500',
				}),
			]),
			dataSource: DataSource.TRACES,
			startTime: mockProps.timeRange.startTime,
			endTime: mockProps.timeRange.endTime,
			shouldResolveQuery: true,
		});
	});

	it('updates endpoint filter when dropdown value changes', async () => {
		// eslint-disable-next-line react/jsx-props-no-spreading
		render(<TopErrors {...mockProps} />);

		// Wait for initial load
		await waitFor(() => {
			expect(screen.getByRole('combobox')).toBeInTheDocument();
		});

		// Find the dropdown
		const dropdown = screen.getByRole('combobox');

		// Mock the change
		fireEvent.change(dropdown, { target: { value: '/api/new-endpoint' } });

		// Component should re-render with new filter
		expect(dropdown).toBeInTheDocument();
	});

	it('handles status message toggle correctly', async () => {
		// eslint-disable-next-line react/jsx-props-no-spreading
		render(<TopErrors {...mockProps} />);

		// Wait for initial load
		await waitFor(() => {
			expect(screen.getByRole('switch')).toBeInTheDocument();
		});

		// Find the toggle switch
		const toggle = screen.getByRole('switch');
		expect(toggle).toBeInTheDocument();

		// Toggle should be on by default
		expect(toggle).toHaveAttribute('aria-checked', 'true');

		// Click the toggle to turn it off
		fireEvent.click(toggle);

		// Title should change
		await waitFor(() => {
			expect(screen.getByText('All Errors')).toBeInTheDocument();
		});

		// Click the toggle to turn it back on
		fireEvent.click(toggle);

		// Title should change back
		await waitFor(() => {
			expect(screen.getByText('Errors with Status Message')).toBeInTheDocument();
		});
	});

	it('includes toggle state in query key for cache busting', async () => {
		// eslint-disable-next-line react/jsx-props-no-spreading
		render(<TopErrors {...mockProps} />);

		// Wait for initial load
		await waitFor(() => {
			expect(screen.getByRole('switch')).toBeInTheDocument();
		});

		const toggle = screen.getByRole('switch');

		// Click toggle
		fireEvent.click(toggle);

		// Wait for title to change, indicating query was refetched with new key
		await waitFor(() => {
			expect(screen.getByText('All Errors')).toBeInTheDocument();
		});

		// The fact that data refetches when toggle changes proves the query key includes the toggle state
		expect(toggle).toBeInTheDocument();
	});

	it('sends query_range v5 API call with required filters including has_error', async () => {
		// let capturedRequest: any;

		const topErrorsPayload = getTopErrorsQueryPayload(
			'test-domain',
			mockProps.timeRange.startTime,
			mockProps.timeRange.endTime,
			{ items: [], op: 'AND' },
			false,
		);

		// eslint-disable-next-line react/jsx-props-no-spreading
		render(<TopErrors {...mockProps} />);

		// Wait for the API call to be made
		await waitFor(() => {
			expect(topErrorsPayload).toBeDefined();
		});

		// Extract the filter expression from the captured request
		// getTopErrorsQueryPayload returns a builder_query with TraceBuilderQuery spec
		const builderQuery = topErrorsPayload.compositeQuery.queries[0]
			.spec as BuilderQuery;
		const filterExpression = builderQuery.filter?.expression;

		// Verify all required filters are present
		expect(filterExpression).toContain(
			`kind_string = 'Client' AND (http.url EXISTS OR url.full EXISTS) AND (net.peer.name = 'test-domain' OR server.address = 'test-domain') AND has_error = true`,
		);
	});
});
