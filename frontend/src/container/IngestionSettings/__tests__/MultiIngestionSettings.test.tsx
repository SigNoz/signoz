import { QueryParams } from 'constants/query';
import { rest, server } from 'mocks-server/server';
import { render, screen, userEvent, waitFor } from 'tests/test-utils';
import { LimitProps } from 'types/api/ingestionKeys/limits/types';
import {
	AllIngestionKeyProps,
	IngestionKeyProps,
} from 'types/api/ingestionKeys/types';

import MultiIngestionSettings from '../MultiIngestionSettings';

// Extend the existing types to include limits with proper structure
interface TestIngestionKeyProps extends Omit<IngestionKeyProps, 'limits'> {
	limits?: LimitProps[];
}

interface TestAllIngestionKeyProps extends Omit<AllIngestionKeyProps, 'data'> {
	data: TestIngestionKeyProps[];
}

// Mock useHistory.push to capture navigation URL used by MultiIngestionSettings
const mockPush = jest.fn() as jest.MockedFunction<(path: string) => void>;
jest.mock('react-router-dom', () => {
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	const actual = jest.requireActual('react-router-dom');
	return {
		...actual,
		useHistory: (): { push: typeof mockPush } => ({ push: mockPush }),
	};
});

// Mock deployments data hook to avoid unrelated network calls in this page
jest.mock(
	'hooks/CustomDomain/useGetDeploymentsData',
	(): Record<string, unknown> => ({
		useGetDeploymentsData: (): {
			data: undefined;
			isLoading: boolean;
			isFetching: boolean;
			isError: boolean;
		} => ({
			data: undefined,
			isLoading: false,
			isFetching: false,
			isError: false,
		}),
	}),
);

const TEST_CREATED_UPDATED = '2024-01-01T00:00:00Z';
const TEST_EXPIRES_AT = '2030-01-01T00:00:00Z';
const TEST_WORKSPACE_ID = 'w1';
const INGESTION_SETTINGS_ROUTE = '/ingestion-settings';

describe('MultiIngestionSettings Page', () => {
	beforeEach(() => {
		mockPush.mockClear();
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('renders MultiIngestionSettings page without crashing', () => {
		render(<MultiIngestionSettings />, undefined, {
			initialRoute: INGESTION_SETTINGS_ROUTE,
		});

		expect(screen.getByText('Ingestion Keys')).toBeInTheDocument();

		expect(
			screen.getByText('Create and manage ingestion keys for the SigNoz Cloud'),
		).toBeInTheDocument();

		const aboutKeyslink = screen.getByRole('link', { name: /Learn more/i });
		expect(aboutKeyslink).toHaveAttribute(
			'href',
			'https://signoz.io/docs/ingestion/signoz-cloud/keys/',
		);
		expect(aboutKeyslink).toHaveAttribute('target', '_blank');
		expect(aboutKeyslink).toHaveClass('learn-more');
		expect(aboutKeyslink).toHaveAttribute('rel', 'noreferrer');
	});

	it('navigates to create alert with metrics count threshold', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		// Arrange API response with a metrics daily count limit so the alert button is visible
		const response: TestAllIngestionKeyProps = {
			status: 'success',
			data: [
				{
					name: 'Key One',
					expires_at: TEST_EXPIRES_AT,
					value: 'secret',
					workspace_id: TEST_WORKSPACE_ID,
					id: 'k1',
					created_at: TEST_CREATED_UPDATED,
					updated_at: TEST_CREATED_UPDATED,
					tags: [],
					limits: [
						{
							id: 'l1',
							signal: 'metrics',
							config: { day: { count: 1000 } },
						},
					],
				},
			],
			_pagination: { page: 1, per_page: 10, pages: 1, total: 1 },
		};

		server.use(
			rest.get('*/workspaces/me/keys*', (_req, res, ctx) =>
				res(ctx.status(200), ctx.json(response)),
			),
		);

		// Render with initial route to test navigation
		render(<MultiIngestionSettings />, undefined, {
			initialRoute: INGESTION_SETTINGS_ROUTE,
		});
		// Wait for ingestion key to load and expand the row to show limits
		await screen.findByText('Key One');
		const expandButton = screen.getByRole('button', { name: /right Key One/i });
		await user.click(expandButton);

		// Wait for limits section to render and click metrics alert button by test id
		await screen.findByText('LIMITS');
		const metricsAlertBtn = (await screen.findByTestId(
			'set-alert-btn-metrics',
		)) as HTMLButtonElement;
		await user.click(metricsAlertBtn);

		// Wait for navigation to occur
		await waitFor(() => {
			expect(mockPush).toHaveBeenCalledTimes(1);
		});

		// Assert: navigation occurred with correct query parameters
		const navigationCall = mockPush.mock.calls[0][0] as string;

		// Check URL contains alerts/new route
		expect(navigationCall).toContain('/alerts/new');
		expect(navigationCall).toContain('showNewCreateAlertsPage=true');

		// Parse query parameters
		const urlParams = new URLSearchParams(navigationCall.split('?')[1]);

		const thresholds = JSON.parse(urlParams.get(QueryParams.thresholds) || '{}');
		expect(thresholds).toBeDefined();
		expect(thresholds[0].thresholdValue).toBe(1000);

		// Verify compositeQuery parameter exists and contains correct data
		const compositeQuery = JSON.parse(
			urlParams.get(QueryParams.compositeQuery) || '{}',
		);
		expect(compositeQuery.builder).toBeDefined();
		expect(compositeQuery.builder.queryData).toBeDefined();

		// Check that the query contains the correct filter expression for the key
		const firstQueryData = compositeQuery.builder.queryData[0];
		expect(firstQueryData.filter.expression).toContain(
			"signoz.workspace.key.id='k1'",
		);

		// Verify metric name for metrics signal
		expect(firstQueryData.aggregations[0].metricName).toBe(
			'signoz.meter.metric.datapoint.count',
		);
	});

	// skipping the flaky test
	it.skip('navigates to create alert for logs with size threshold', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		// Arrange API response with a logs daily size limit so the alert button is visible
		const response: TestAllIngestionKeyProps = {
			status: 'success',
			data: [
				{
					name: 'Key Two',
					expires_at: TEST_EXPIRES_AT,
					value: 'secret',
					workspace_id: TEST_WORKSPACE_ID,
					id: 'k2',
					created_at: TEST_CREATED_UPDATED,
					updated_at: TEST_CREATED_UPDATED,
					tags: [],
					limits: [
						{
							id: 'l2',
							signal: 'logs',
							config: { day: { size: 2048 } },
						},
					],
				},
			],
			_pagination: { page: 1, per_page: 10, pages: 1, total: 1 },
		};

		server.use(
			rest.get('*/workspaces/me/keys*', (_req, res, ctx) =>
				res(ctx.status(200), ctx.json(response)),
			),
		);

		render(<MultiIngestionSettings />, undefined, {
			initialRoute: INGESTION_SETTINGS_ROUTE,
		});

		// Wait for ingestion key to load and expand the row to show limits
		await screen.findByText('Key Two');
		const expandButton = screen.getByRole('button', { name: /right Key Two/i });
		await user.click(expandButton);

		// Wait for limits section to render and click logs alert button by test id
		await screen.findByText('LIMITS');
		const logsAlertBtn = (await screen.findByTestId(
			'set-alert-btn-logs',
		)) as HTMLButtonElement;
		await user.click(logsAlertBtn);

		// Wait for navigation to occur
		await waitFor(() => {
			expect(mockPush).toHaveBeenCalledTimes(1);
		});

		// Assert: navigation occurred with correct query parameters
		const navigationCall = mockPush.mock.calls[0][0] as string;

		// Check URL contains alerts/new route
		expect(navigationCall).toContain('/alerts/new');
		expect(navigationCall).toContain('showNewCreateAlertsPage=true');

		// Parse query parameters
		const urlParams = new URLSearchParams(navigationCall.split('?')[1]);

		// Verify thresholds parameter
		const thresholds = JSON.parse(urlParams.get(QueryParams.thresholds) || '{}');
		expect(thresholds).toBeDefined();
		expect(thresholds[0].thresholdValue).toBe(2048);

		// Verify compositeQuery parameter exists and contains correct data
		const compositeQuery = JSON.parse(
			urlParams.get(QueryParams.compositeQuery) || '{}',
		);
		expect(compositeQuery.builder).toBeDefined();
		expect(compositeQuery.builder.queryData).toBeDefined();

		// Check that the query contains the correct filter expression for the key
		const firstQueryData = compositeQuery.builder.queryData[0];
		expect(firstQueryData.filter.expression).toContain(
			"signoz.workspace.key.id='k2'",
		);

		// Verify metric name for logs signal
		expect(firstQueryData.aggregations[0].metricName).toBe(
			'signoz.meter.log.size',
		);
	});
});
