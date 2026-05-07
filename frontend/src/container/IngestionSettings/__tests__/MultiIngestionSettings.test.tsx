import { GatewaytypesGettableIngestionKeysDTO } from 'api/generated/services/sigNoz.schemas';
import { QueryParams } from 'constants/query';
import { rest, server } from 'mocks-server/server';
import {
	fireEvent,
	render,
	screen,
	userEvent,
	waitFor,
} from 'tests/test-utils';

import MultiIngestionSettings from '../MultiIngestionSettings';

// Gateway API response type (uses actual schema types for contract safety)
interface TestGatewayIngestionKeysResponse {
	status: string;
	data: GatewaytypesGettableIngestionKeysDTO;
}

// Mock useHistory.push to capture navigation URL used by MultiIngestionSettings
const mockPush = jest.fn() as jest.MockedFunction<(path: string) => void>;
jest.mock('react-router-dom', () => {
	const actual = jest.requireActual('react-router-dom');
	return {
		...actual,
		useHistory: (): { push: typeof mockPush } => ({ push: mockPush }),
	};
});

const TEST_CREATED_UPDATED = '2024-01-01T00:00:00Z';
const TEST_EXPIRES_AT = '2030-01-01T00:00:00Z';
const TEST_WORKSPACE_ID = 'w1';
const INGESTION_SETTINGS_ROUTE = '/ingestion-settings';

const GLOBAL_CONFIG_RESPONSE = {
	status: 'success',
	data: {
		external_url: '',
		ingestion_url: 'http://ingest.example.com',
		ai_assistant_url: null,
		mcp_url: null,
	},
};

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
		const response: TestGatewayIngestionKeysResponse = {
			status: 'success',
			data: {
				keys: [
					{
						name: 'Key One',
						expires_at: new Date(TEST_EXPIRES_AT),
						value: 'secret',
						workspace_id: TEST_WORKSPACE_ID,
						id: 'k1',
						created_at: new Date(TEST_CREATED_UPDATED),
						updated_at: new Date(TEST_CREATED_UPDATED),
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
			},
		};

		server.use(
			rest.get('*/api/v1/global/config*', (_req, res, ctx) =>
				res(ctx.status(200), ctx.json(GLOBAL_CONFIG_RESPONSE)),
			),
			rest.get('*/api/v2/gateway/ingestion_keys*', (_req, res, ctx) =>
				res(ctx.status(200), ctx.json(response)),
			),
		);

		render(<MultiIngestionSettings />, undefined, {
			initialRoute: INGESTION_SETTINGS_ROUTE,
		});
		await screen.findByText('Key One');
		fireEvent.click(screen.getByRole('button', { name: /right Key One/i }));

		await screen.findByText('LIMITS');
		fireEvent.click(
			(await screen.findByTestId('set-alert-btn-metrics')) as HTMLButtonElement,
		);

		await waitFor(() => {
			expect(mockPush).toHaveBeenCalledTimes(1);
		});

		const navigationCall = mockPush.mock.calls[0][0] as string;
		expect(navigationCall).toContain('/alerts/new');

		const urlParams = new URLSearchParams(navigationCall.split('?')[1]);

		const thresholds = JSON.parse(urlParams.get(QueryParams.thresholds) || '{}');
		expect(thresholds[0].thresholdValue).toBe(1000);
		expect(thresholds[0].unit).toBe('{count}');

		const compositeQuery = JSON.parse(
			urlParams.get(QueryParams.compositeQuery) || '{}',
		);
		expect(compositeQuery.unit).toBe('{count}');
		expect(compositeQuery.builder.queryData).toBeDefined();

		const firstQueryData = compositeQuery.builder.queryData[0];
		expect(firstQueryData.filter.expression).toContain(
			"signoz.workspace.key.id='k1'",
		);
		expect(firstQueryData.aggregations[0].metricName).toBe(
			'signoz.meter.metric.datapoint.count',
		);

		expect(urlParams.get(QueryParams.yAxisUnit)).toBe('{count}');
		expect(urlParams.get(QueryParams.ruleName)).toContain('metrics');
	});

	it('navigates to create alert for logs with GiB threshold and bytes yAxisUnit', async () => {
		const GIB = 1073741824;
		const sizeInBytes = 400 * GIB;

		const response: TestGatewayIngestionKeysResponse = {
			status: 'success',
			data: {
				keys: [
					{
						name: 'Key Logs',
						expires_at: new Date(TEST_EXPIRES_AT),
						value: 'secret',
						workspace_id: TEST_WORKSPACE_ID,
						id: 'k2',
						created_at: new Date(TEST_CREATED_UPDATED),
						updated_at: new Date(TEST_CREATED_UPDATED),
						tags: [],
						limits: [
							{
								id: 'l2',
								signal: 'logs',
								config: { day: { size: sizeInBytes } },
							},
						],
					},
				],
				_pagination: { page: 1, per_page: 10, pages: 1, total: 1 },
			},
		};

		server.use(
			rest.get('*/api/v1/global/config*', (_req, res, ctx) =>
				res(ctx.status(200), ctx.json(GLOBAL_CONFIG_RESPONSE)),
			),
			rest.get('*/api/v2/gateway/ingestion_keys*', (_req, res, ctx) =>
				res(ctx.status(200), ctx.json(response)),
			),
		);

		render(<MultiIngestionSettings />, undefined, {
			initialRoute: INGESTION_SETTINGS_ROUTE,
		});
		await screen.findByText('Key Logs');
		fireEvent.click(screen.getByRole('button', { name: /right Key Logs/i }));

		await screen.findByText('LIMITS');
		fireEvent.click(
			(await screen.findByTestId('set-alert-btn-logs')) as HTMLButtonElement,
		);

		await waitFor(() => {
			expect(mockPush).toHaveBeenCalledTimes(1);
		});

		const navigationCall = mockPush.mock.calls[0][0] as string;
		expect(navigationCall).toContain('/alerts/new');

		const urlParams = new URLSearchParams(navigationCall.split('?')[1]);

		const thresholds = JSON.parse(urlParams.get(QueryParams.thresholds) || '{}');
		expect(thresholds[0].thresholdValue).toBe(400);
		expect(thresholds[0].unit).toBe('GiBy');

		const compositeQuery = JSON.parse(
			urlParams.get(QueryParams.compositeQuery) || '{}',
		);
		expect(compositeQuery.unit).toBe('bytes');

		const firstQueryData = compositeQuery.builder.queryData[0];
		expect(firstQueryData.filter.expression).toContain(
			"signoz.workspace.key.id='k2'",
		);
		expect(firstQueryData.aggregations[0].metricName).toBe(
			'signoz.meter.log.size',
		);

		expect(urlParams.get(QueryParams.yAxisUnit)).toBe('bytes');
		expect(urlParams.get(QueryParams.ruleName)).toContain('logs');
	});

	it('shows alert CTAs in view mode and helper text in edit mode for configured limits', async () => {
		const KEY_NAME = 'Key With Limits';
		const response: TestGatewayIngestionKeysResponse = {
			status: 'success',
			data: {
				keys: [
					{
						name: KEY_NAME,
						expires_at: new Date(TEST_EXPIRES_AT),
						value: 'secret',
						workspace_id: TEST_WORKSPACE_ID,
						id: 'k1',
						created_at: new Date(TEST_CREATED_UPDATED),
						updated_at: new Date(TEST_CREATED_UPDATED),
						tags: [],
						limits: [
							{
								id: 'l1',
								signal: 'metrics',
								config: { day: { count: 1000 } },
							},
							{
								id: 'l2',
								signal: 'logs',
								config: { day: { size: 1073741824 } },
							},
						],
					},
				],
				_pagination: { page: 1, per_page: 10, pages: 1, total: 1 },
			},
		};

		server.use(
			rest.get('*/api/v1/global/config*', (_req, res, ctx) =>
				res(ctx.status(200), ctx.json(GLOBAL_CONFIG_RESPONSE)),
			),
			rest.get('*/api/v2/gateway/ingestion_keys*', (_req, res, ctx) =>
				res(ctx.status(200), ctx.json(response)),
			),
		);

		render(<MultiIngestionSettings />, undefined, {
			initialRoute: INGESTION_SETTINGS_ROUTE,
		});

		await screen.findByText(KEY_NAME);
		fireEvent.click(
			screen.getByRole('button', { name: new RegExp(`right ${KEY_NAME}`, 'i') }),
		);
		await screen.findByText('LIMITS');

		expect(screen.getAllByText('Set alert').length).toBeGreaterThan(0);

		fireEvent.click(screen.getByRole('button', { name: 'Edit logs limit' }));
		expect(
			screen.getByText('You can set up an alert after saving'),
		).toBeInTheDocument();
	});

	it('switches to search API when search text is entered', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		const getResponse: TestGatewayIngestionKeysResponse = {
			status: 'success',
			data: {
				keys: [
					{
						name: 'Key Regular',
						expires_at: new Date(TEST_EXPIRES_AT),
						value: 'secret1',
						workspace_id: TEST_WORKSPACE_ID,
						id: 'k1',
						created_at: new Date(TEST_CREATED_UPDATED),
						updated_at: new Date(TEST_CREATED_UPDATED),
						tags: [],
						limits: [],
					},
				],
				_pagination: { page: 1, per_page: 10, pages: 1, total: 1 },
			},
		};

		const searchResponse: TestGatewayIngestionKeysResponse = {
			status: 'success',
			data: {
				keys: [
					{
						name: 'Key Search Result',
						expires_at: new Date(TEST_EXPIRES_AT),
						value: 'secret2',
						workspace_id: TEST_WORKSPACE_ID,
						id: 'k2',
						created_at: new Date(TEST_CREATED_UPDATED),
						updated_at: new Date(TEST_CREATED_UPDATED),
						tags: [],
						limits: [],
					},
				],
				_pagination: { page: 1, per_page: 10, pages: 1, total: 1 },
			},
		};

		const getHandler = jest.fn();
		const searchHandler = jest.fn();

		server.use(
			rest.get('*/api/v1/global/config*', (_req, res, ctx) =>
				res(ctx.status(200), ctx.json(GLOBAL_CONFIG_RESPONSE)),
			),
			rest.get('*/api/v2/gateway/ingestion_keys', (req, res, ctx) => {
				if (req.url.pathname.endsWith('/search')) {
					return undefined;
				}
				getHandler();
				return res(ctx.status(200), ctx.json(getResponse));
			}),
			rest.get('*/api/v2/gateway/ingestion_keys/search', (_req, res, ctx) => {
				searchHandler();
				return res(ctx.status(200), ctx.json(searchResponse));
			}),
		);

		render(<MultiIngestionSettings />, undefined, {
			initialRoute: INGESTION_SETTINGS_ROUTE,
		});

		await screen.findByText('Key Regular');
		expect(getHandler).toHaveBeenCalled();
		expect(searchHandler).not.toHaveBeenCalled();

		// Reset getHandler count to verify it's not called again during search
		getHandler.mockClear();

		// Type in search box
		const searchInput = screen.getByPlaceholderText(
			'Search for ingestion key...',
		);
		await user.type(searchInput, 'test');

		await screen.findByText('Key Search Result');
		expect(searchHandler).toHaveBeenCalled();
		expect(getHandler).not.toHaveBeenCalled();

		// Clear search
		searchHandler.mockClear();
		getHandler.mockClear();
		await user.clear(searchInput);

		await screen.findByText('Key Regular');
		// Search API should be disabled when not searching
		expect(searchHandler).not.toHaveBeenCalled();
	});
});
