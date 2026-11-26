import {
	QuickfiltertypesSourceDTO,
	TelemetrytypesSignalDTO,
} from 'api/generated/services/sigNoz.schemas';
import { ENVIRONMENT } from 'constants/env';
import {
	ApiMonitoringParams,
	useApiMonitoringParams,
} from 'container/ApiMonitoring/queryParams';
import { getHostsQuickFiltersConfig } from 'container/InfraMonitoringHostsV2/utils';
import { INFRA_MONITORING_ATTR_KEYS } from 'container/InfraMonitoringK8sV2/constants';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useAuthZ } from 'lib/authz/hooks/useAuthZ/useAuthZ';
import { mockUseAuthZGrantAll } from 'lib/authz/utils/authz-test-utils';
import {
	otherFiltersResponse,
	quickFiltersFieldValuesResponse,
	quickFiltersListResponse,
} from 'mocks-server/__mockdata__/customQuickFilters';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { render, screen, userEvent, waitFor, within } from 'tests/test-utils';
import { NO_DELAY_USER_EVENT } from 'tests/noDelayUserEvent';
import { TelemetryFieldKey } from 'types/api/v5/queryRange';
import { QueryBuilderContextType } from 'types/common/queryBuilder';

import '@testing-library/jest-dom';

import QuickFilters from '../QuickFilters';
import QuickFiltersSettings from '../QuickFiltersSettings/QuickFiltersSettings';
import { IQuickFiltersConfig, QuickFiltersSource } from '../types';
import { QuickFiltersConfig, QuickFiltersFieldApis } from './constants';

jest.mock('hooks/queryBuilder/useQueryBuilder', () => ({
	useQueryBuilder: jest.fn(),
}));
jest.mock('container/ApiMonitoring/queryParams');
jest.mock('lib/authz/hooks/useAuthZ/useAuthZ');
jest.mock(
	'components/OverlayScrollbar/OverlayScrollbar',
	() =>
		function MockOverlayScrollbar({
			children,
		}: {
			children: React.ReactNode;
		}): JSX.Element {
			return <div>{children}</div>;
		},
);

const handleFilterVisibilityChange = jest.fn();
const redirectWithQueryBuilderData = jest.fn() as jest.MockedFunction<
	QueryBuilderContextType['redirectWithQueryBuilderData']
>;
const putHandler = jest.fn() as jest.MockedFunction<
	(body: { filters: TelemetryFieldKey[] }) => void
>;
const mockSetApiMonitoringParams = jest.fn() as jest.MockedFunction<
	(newParams: Partial<ApiMonitoringParams>, replace?: boolean) => void
>;
const mockUseApiMonitoringParams = jest.mocked(useApiMonitoringParams);
const mockedUseAuthZ = jest.mocked(useAuthZ);

const BASE_URL = ENVIRONMENT.baseURL;
const quickFiltersListURL = `${BASE_URL}/api/v2/quick_filters/logs`;
const saveQuickFiltersURL = `${BASE_URL}/api/v2/quick_filters/logs`;
const anyQuickFiltersListURL = `${BASE_URL}/api/v2/quick_filters/:source`;
const quickFiltersSuggestionsURL = `${BASE_URL}/api/v1/fields/keys`;
const fieldsValuesURL = `${BASE_URL}/api/v1/fields/values`;

const FILTER_OS_DESCRIPTION = 'os.description';
const FILTER_K8S_DEPLOYMENT_NAME = 'k8s.deployment.name';
const ADDED_FILTERS_TEST_ID = 'quick-filters-added';
const OTHER_FILTERS_TEST_ID = 'quick-filters-other';
const SAVE_TEST_ID = 'quick-filters-settings-save';
const SETTINGS_TEST_ID = 'settings-icon-container';
const REMOVE_OS_DESCRIPTION_TEST_ID =
	'quick-filters-remove-resource:os.description:string';
const ADD_K8S_DEPLOYMENT_NAME_TEST_ID =
	'quick-filters-add-resource:k8s.deployment.name:string';
const FILTER_SERVICE_NAME = 'Service Name';
const QUERY_NAME = 'Test Query';

const savedFilters = quickFiltersListResponse.data
	.filters as TelemetryFieldKey[];
const smallSavedFilters = savedFilters.slice(0, 2);
const smallFiltersListResponse = {
	...quickFiltersListResponse,
	data: {
		...quickFiltersListResponse.data,
		filters: smallSavedFilters,
	},
};

const setupServer = (): void => {
	server.use(
		rest.get(quickFiltersListURL, (_, res, ctx) =>
			res(ctx.status(200), ctx.json(quickFiltersListResponse)),
		),
		rest.get(anyQuickFiltersListURL, (_, res, ctx) =>
			res(ctx.status(200), ctx.json({ status: 'success', data: { filters: [] } })),
		),
		rest.get(quickFiltersSuggestionsURL, (_, res, ctx) =>
			res(ctx.status(200), ctx.json(otherFiltersResponse)),
		),
		rest.put(saveQuickFiltersURL, async (req, res, ctx) => {
			putHandler(await req.json());
			return res(ctx.status(200), ctx.json({}));
		}),
		rest.get(fieldsValuesURL, (_req, res, ctx) =>
			res(ctx.status(200), ctx.json(quickFiltersFieldValuesResponse)),
		),
	);
};

function TestQuickFilters({
	quickFilterSource = QuickFiltersSource.EXCEPTIONS,
	config = QuickFiltersConfig,
}: {
	quickFilterSource?: QuickFiltersSource;
	config?: IQuickFiltersConfig[];
}): JSX.Element {
	return (
		<QuickFilters
			quickFilterSource={quickFilterSource}
			config={config}
			handleFilterVisibilityChange={handleFilterVisibilityChange}
			useFieldApis={QuickFiltersFieldApis}
		/>
	);
}

TestQuickFilters.defaultProps = {
	quickFilterSource: QuickFiltersSource.EXCEPTIONS,
	config: QuickFiltersConfig,
};

function renderSettings(): void {
	render(
		<QuickFiltersSettings
			savedFiltersSource={QuickfiltertypesSourceDTO.logs}
			setIsSettingsOpen={jest.fn()}
			customFilters={smallSavedFilters}
			refetchCustomFilters={jest.fn()}
		/>,
	);
}

async function openSettings(
	user: ReturnType<typeof userEvent.setup>,
): Promise<void> {
	await screen.findByText(FILTER_SERVICE_NAME);
	await user.click(screen.getByTestId(SETTINGS_TEST_ID));
}

beforeAll(() => {
	server.listen();
});

afterEach(() => {
	server.resetHandlers();
	jest.clearAllMocks();
	jest.useRealTimers();
});

afterAll(() => {
	server.close();
});

beforeEach(() => {
	(useQueryBuilder as jest.Mock).mockReturnValue({
		currentQuery: {
			builder: {
				queryData: [
					{
						queryName: QUERY_NAME,
						filters: { items: [{ key: 'test', value: 'value' }] },
					},
				],
			},
		},
		lastUsedQuery: 0,
		redirectWithQueryBuilderData,
	});
	mockUseApiMonitoringParams.mockReturnValue([
		{ showIP: true } as ApiMonitoringParams,
		mockSetApiMonitoringParams,
	]);
	mockedUseAuthZ.mockImplementation(mockUseAuthZGrantAll);
	setupServer();
});

describe('Quick Filters', () => {
	it('displays the correct query name in the header', () => {
		render(<TestQuickFilters config={[]} />);
		expect(screen.getByText('Filters for')).toBeInTheDocument();
		expect(screen.getByText(QUERY_NAME)).toBeInTheDocument();
	});

	it('should display and allow selection from query dropdown when multiple queries exist', async () => {
		const setLastUsedQuery = jest.fn() as jest.MockedFunction<
			QueryBuilderContextType['setLastUsedQuery']
		>;
		const user = userEvent.setup(NO_DELAY_USER_EVENT);

		(useQueryBuilder as jest.Mock).mockReturnValue({
			currentQuery: {
				builder: {
					queryData: [
						{
							queryName: 'Query A',
							filters: { items: [] },
						},
						{
							queryName: 'Query B',
							filters: { items: [] },
						},
						{
							queryName: 'Query C',
							filters: { items: [] },
						},
					],
				},
			},
			lastUsedQuery: 0,
			setLastUsedQuery,
			redirectWithQueryBuilderData,
			panelType: 'graph', // not LIST view
		});

		render(<TestQuickFilters config={[]} />);

		// The dropdown trigger should show the first query name
		const trigger = screen.getByTestId('quick-filters-query-select');
		expect(trigger).toHaveTextContent('Query A');

		// Click to open the dropdown
		await user.click(trigger);

		// All query options should be visible
		await expect(
			screen.findByTestId('quick-filters-query-select-item-0'),
		).resolves.toHaveTextContent('Query A');
		expect(
			screen.getByTestId('quick-filters-query-select-item-1'),
		).toHaveTextContent('Query B');
		expect(
			screen.getByTestId('quick-filters-query-select-item-2'),
		).toHaveTextContent('Query C');

		// jsdom cannot deliver the pointer click Base UI expects on an option,
		// so pick Query B with the arrow keys and Enter
		await user.type(
			screen.getByTestId('quick-filters-query-select-search'),
			'{ArrowDown}{Enter}',
		);

		// Verify setLastUsedQuery was called with index 1
		expect(setLastUsedQuery).toHaveBeenCalledWith(1);
	});

	it('should not display query dropdown in ListView', () => {
		(useQueryBuilder as jest.Mock).mockReturnValue({
			currentQuery: {
				builder: {
					queryData: [
						{
							queryName: 'Query A',
							filters: { items: [] },
						},
						{
							queryName: 'Query B',
							filters: { items: [] },
						},
					],
				},
			},
			lastUsedQuery: 0,
			redirectWithQueryBuilderData,
			panelType: 'list', // ListView
		});

		render(<TestQuickFilters config={[]} />);

		// Should show static query name without dropdown
		expect(screen.getByText('Query A')).toBeInTheDocument();

		// Dropdown trigger should not be interactive (no button/combobox)
		const queryText = screen.getByText('Query A');
		expect(queryText.tagName).not.toBe('BUTTON');
	});

	it('should display static query name when only one query exists', () => {
		render(<TestQuickFilters config={[]} />);

		// Should show static query name
		expect(screen.getByText(QUERY_NAME)).toBeInTheDocument();

		// No dropdown should be present
		expect(
			screen.queryByTestId('quick-filters-query-select'),
		).not.toBeInTheDocument();
	});

	it('should add filter data to query when checkbox is clicked', async () => {
		const user = userEvent.setup(NO_DELAY_USER_EVENT);

		render(<TestQuickFilters />);

		// Prefer role if possible; if label text isn’t wired to input, clicking the label text is OK
		const target = await screen.findByText('mq-kafka');
		await user.click(target);

		await waitFor(() => {
			expect(redirectWithQueryBuilderData).toHaveBeenCalledWith(
				expect.objectContaining({
					builder: {
						queryData: expect.arrayContaining([
							expect.objectContaining({
								filters: expect.objectContaining({
									items: expect.arrayContaining([
										expect.objectContaining({
											key: expect.objectContaining({
												key: 'deployment.environment',
											}),
											value: 'mq-kafka',
										}),
									]),
								}),
							}),
						]),
					},
				}),
			);
		});
	});
	it('toggles Show IP addresses and updates API Monitoring params', async () => {
		const user = userEvent.setup(NO_DELAY_USER_EVENT);

		render(
			<TestQuickFilters quickFilterSource={QuickFiltersSource.API_MONITORING} />,
		);

		// Switch should be rendered and initially checked
		const toggle = await screen.findByTestId('quick-filters-show-ip');
		expect(screen.getByText('Show IP addresses')).toBeInTheDocument();
		expect(toggle).toHaveAttribute('aria-checked', 'true');

		await user.click(toggle);

		expect(mockSetApiMonitoringParams).toHaveBeenCalledWith(
			expect.objectContaining({ showIP: false }),
		);
	});
});

describe('Quick Filters with custom filters', () => {
	it('loads the custom filters correctly', async () => {
		render(
			<TestQuickFilters quickFilterSource={QuickFiltersSource.LOGS_EXPLORER} />,
		);

		expect(screen.getByText('Filters for')).toBeInTheDocument();
		expect(screen.getByText(QUERY_NAME)).toBeInTheDocument();

		await screen.findByText(FILTER_SERVICE_NAME);
		const allByText = await screen.findAllByText('otel-demo');
		expect(allByText).toHaveLength(2);
	});

	it('opens the settings with the saved filters added and the rest under other filters', async () => {
		const user = userEvent.setup(NO_DELAY_USER_EVENT);
		server.use(
			rest.get(quickFiltersListURL, (_, res, ctx) =>
				res(ctx.status(200), ctx.json(smallFiltersListResponse)),
			),
		);

		render(
			<TestQuickFilters quickFilterSource={QuickFiltersSource.LOGS_EXPLORER} />,
		);
		await openSettings(user);

		expect(screen.getByText('Edit quick filters')).toBeInTheDocument();
		expect(screen.getByTestId(ADDED_FILTERS_TEST_ID)).toContainElement(
			screen.getByText(FILTER_OS_DESCRIPTION),
		);
		expect(screen.getByTestId(OTHER_FILTERS_TEST_ID)).toContainElement(
			await screen.findByText(FILTER_K8S_DEPLOYMENT_NAME),
		);
	});

	it('keeps same-name fields with different context as distinct entries', async () => {
		const user = userEvent.setup(NO_DELAY_USER_EVENT);
		server.use(
			rest.get(quickFiltersSuggestionsURL, (_req, res, ctx) =>
				res(
					ctx.status(200),
					ctx.json({
						status: 'success',
						data: {
							complete: true,
							keys: {
								level: [
									{
										name: 'level',
										fieldContext: 'attribute',
										fieldDataType: 'string',
										signal: 'logs',
									},
									{
										name: 'level',
										fieldContext: 'span',
										fieldDataType: 'string',
										signal: 'logs',
									},
								],
							},
						},
					}),
				),
			),
		);

		renderSettings();

		const otherSection = screen.getByTestId(OTHER_FILTERS_TEST_ID);
		// Both `level` variants are shown despite sharing a name.
		const addButton = await screen.findByTestId(
			'quick-filters-add-attribute:level:string',
		);
		expect(within(otherSection).getAllByText('level')).toHaveLength(2);

		// Adding one variant removes only that one; the other stays.
		await user.click(addButton);

		const addedSection = screen.getByTestId(ADDED_FILTERS_TEST_ID);
		expect(within(addedSection).getAllByText('level')).toHaveLength(1);
		expect(within(otherSection).getAllByText('level')).toHaveLength(1);
		expect(
			screen.getByTestId('quick-filters-add-span:level:string'),
		).toBeInTheDocument();
	});

	it('adds a filter from OTHER FILTERS to ADDED FILTERS when clicked', async () => {
		const user = userEvent.setup(NO_DELAY_USER_EVENT);

		renderSettings();

		await user.click(await screen.findByTestId(ADD_K8S_DEPLOYMENT_NAME_TEST_ID));

		expect(screen.getByTestId(ADDED_FILTERS_TEST_ID)).toHaveTextContent(
			FILTER_K8S_DEPLOYMENT_NAME,
		);
	});

	it('removes a filter from ADDED FILTERS and moves it to OTHER FILTERS', async () => {
		const user = userEvent.setup(NO_DELAY_USER_EVENT);

		renderSettings();
		const addedSection = screen.getByTestId(ADDED_FILTERS_TEST_ID);
		const otherSection = screen.getByTestId(OTHER_FILTERS_TEST_ID);
		await screen.findByTestId(ADD_K8S_DEPLOYMENT_NAME_TEST_ID);

		await user.click(screen.getByTestId(REMOVE_OS_DESCRIPTION_TEST_ID));

		expect(addedSection).not.toContainElement(
			screen.getByText(FILTER_OS_DESCRIPTION),
		);
		expect(otherSection).toContainElement(
			screen.getByText(FILTER_OS_DESCRIPTION),
		);
	});

	it('restores original filter state on Discard', async () => {
		const user = userEvent.setup(NO_DELAY_USER_EVENT);

		renderSettings();
		const addedSection = screen.getByTestId(ADDED_FILTERS_TEST_ID);
		const otherSection = screen.getByTestId(OTHER_FILTERS_TEST_ID);
		await screen.findByTestId(ADD_K8S_DEPLOYMENT_NAME_TEST_ID);

		await user.click(screen.getByTestId(REMOVE_OS_DESCRIPTION_TEST_ID));
		expect(otherSection).toContainElement(
			screen.getByText(FILTER_OS_DESCRIPTION),
		);

		await user.click(screen.getByTestId('quick-filters-settings-discard'));

		expect(addedSection).toContainElement(
			screen.getByText(FILTER_OS_DESCRIPTION),
		);
		expect(otherSection).not.toContainElement(
			screen.getByText(FILTER_OS_DESCRIPTION),
		);
	});

	it('saves the updated filters by calling PUT with correct payload', async () => {
		const user = userEvent.setup(NO_DELAY_USER_EVENT);

		renderSettings();

		await user.click(screen.getByTestId(REMOVE_OS_DESCRIPTION_TEST_ID));
		await user.click(screen.getByTestId(SAVE_TEST_ID));

		await waitFor(() => {
			expect(putHandler).toHaveBeenCalled();
		});

		const requestBody = putHandler.mock.calls[0][0];
		expect(requestBody.filters).not.toContainEqual(
			expect.objectContaining({ name: FILTER_OS_DESCRIPTION }),
		);
		expect(requestBody.filters).toHaveLength(smallSavedFilters.length - 1);
	});

	it('should render duration slider for duration_nono filter', async () => {
		server.use(
			rest.get(quickFiltersListURL, (_, res, ctx) =>
				res(
					ctx.status(200),
					ctx.json({
						...quickFiltersListResponse,
						data: {
							...quickFiltersListResponse.data,
							filters: savedFilters.filter(({ name }) => name === 'duration_nano'),
						},
					}),
				),
			),
		);
		// Use fake timers only in this test (for debounce), and wire them to userEvent
		jest.useFakeTimers();
		const user = userEvent.setup({
			advanceTimers: (ms) => jest.advanceTimersByTime(ms),
		});

		render(
			<TestQuickFilters quickFilterSource={QuickFiltersSource.LOGS_EXPLORER} />,
		);
		await screen.findByTestId('collapse-duration');
		expect(screen.getByText('Duration')).toBeInTheDocument();

		// Open the duration section (use role if it’s a button/collapse)
		await user.click(screen.getByText('Duration'));

		const minDuration = screen.getByTestId('min-input') as HTMLInputElement;
		const maxDuration = screen.getByTestId('max-input') as HTMLInputElement;

		expect(minDuration).toHaveValue(null);
		expect(minDuration).toHaveProperty('placeholder', '0');
		expect(maxDuration).toHaveValue(null);
		expect(maxDuration).toHaveProperty('placeholder', '100000000');

		// Type values and advance debounce
		await user.click(minDuration);
		await user.paste('10000');
		await user.click(maxDuration);
		await user.paste('20000');
		jest.advanceTimersByTime(2000);

		await waitFor(() => {
			expect(redirectWithQueryBuilderData).toHaveBeenCalledWith(
				expect.objectContaining({
					builder: {
						queryData: expect.arrayContaining([
							expect.objectContaining({
								filters: expect.objectContaining({
									items: expect.arrayContaining([
										expect.objectContaining({
											key: expect.objectContaining({ key: 'durationNano' }),
											op: '>=',
											value: 10000000000,
										}),
										expect.objectContaining({
											key: expect.objectContaining({ key: 'durationNano' }),
											op: '<=',
											value: 20000000000,
										}),
									]),
								}),
							}),
						]),
					},
				}),
			);
		});

		jest.useRealTimers();
	});
});

describe('Quick Filters refetch behavior', () => {
	it('fetches custom filters on every mount for a page with a saved list', async () => {
		let getCalls = 0;

		server.use(
			rest.get(quickFiltersListURL, (_req, res, ctx) => {
				getCalls += 1;
				return res(ctx.status(200), ctx.json(quickFiltersListResponse));
			}),
		);

		const { unmount } = render(
			<TestQuickFilters quickFilterSource={QuickFiltersSource.LOGS_EXPLORER} />,
		);
		await expect(
			screen.findByText(FILTER_SERVICE_NAME),
		).resolves.toBeInTheDocument();

		unmount();

		render(
			<TestQuickFilters quickFilterSource={QuickFiltersSource.LOGS_EXPLORER} />,
		);
		await expect(
			screen.findByText(FILTER_SERVICE_NAME),
		).resolves.toBeInTheDocument();

		expect(getCalls).toBe(2);
	});

	it('does not fetch custom filters for a page without a saved list', async () => {
		let getCalls = 0;

		server.use(
			rest.get(anyQuickFiltersListURL, (_req, res, ctx) => {
				getCalls += 1;
				return res(ctx.status(200), ctx.json(quickFiltersListResponse));
			}),
		);

		render(
			<TestQuickFilters quickFilterSource={QuickFiltersSource.INFRA_MONITORING} />,
		);

		await expect(
			screen.findByText(FILTER_SERVICE_NAME),
		).resolves.toBeInTheDocument();
		expect(getCalls).toBe(0);
	});

	it('refetches custom filters after saving settings', async () => {
		let getCalls = 0;
		putHandler.mockClear();

		server.use(
			rest.get(quickFiltersListURL, (_req, res, ctx) => {
				getCalls += 1;
				return res(ctx.status(200), ctx.json(smallFiltersListResponse));
			}),
			rest.put(saveQuickFiltersURL, async (req, res, ctx) => {
				putHandler(await req.json());
				return res(ctx.status(200), ctx.json({}));
			}),
		);

		const user = userEvent.setup(NO_DELAY_USER_EVENT);
		render(
			<TestQuickFilters quickFilterSource={QuickFiltersSource.LOGS_EXPLORER} />,
		);

		await openSettings(user);
		await user.click(screen.getByTestId(REMOVE_OS_DESCRIPTION_TEST_ID));
		await user.click(screen.getByTestId(SAVE_TEST_ID));

		await waitFor(() => expect(putHandler).toHaveBeenCalled());
		await waitFor(() => expect(getCalls).toBeGreaterThanOrEqual(2));
	});

	it('renders updated filters after refetch post-save', async () => {
		const updatedResponse = {
			...smallFiltersListResponse,
			data: {
				...smallFiltersListResponse.data,
				filters: [
					...smallFiltersListResponse.data.filters,
					{
						name: 'new.custom.filter',
						fieldDataType: 'string',
						fieldContext: 'resource',
					} as const,
				],
			},
		};

		let getCount = 0;
		server.use(
			rest.get(quickFiltersListURL, (_req, res, ctx) => {
				getCount += 1;
				return getCount >= 2
					? res(ctx.status(200), ctx.json(updatedResponse))
					: res(ctx.status(200), ctx.json(smallFiltersListResponse));
			}),
			rest.put(saveQuickFiltersURL, async (_req, res, ctx) =>
				res(ctx.status(200), ctx.json({})),
			),
		);

		const user = userEvent.setup(NO_DELAY_USER_EVENT);
		render(
			<TestQuickFilters quickFilterSource={QuickFiltersSource.LOGS_EXPLORER} />,
		);

		await openSettings(user);
		// Make a minimal change so Save button appears
		await user.click(screen.getByTestId(REMOVE_OS_DESCRIPTION_TEST_ID));
		await user.click(screen.getByTestId(SAVE_TEST_ID));

		await expect(
			screen.findByText('New Custom Filter'),
		).resolves.toBeInTheDocument();
	});

	it('shows empty state when GET fails', async () => {
		server.use(
			rest.get(quickFiltersListURL, (_req, res, ctx) =>
				res(ctx.status(500), ctx.json({})),
			),
		);

		render(
			<TestQuickFilters
				quickFilterSource={QuickFiltersSource.LOGS_EXPLORER}
				config={[]}
			/>,
		);

		await expect(
			screen.findByText('No filters found'),
		).resolves.toBeInTheDocument();
	});
});

describe('Quick Filters field APIs', () => {
	it('sends the page signal for every filter, the infra Environment filter included', async () => {
		const requests: URLSearchParams[] = [];
		server.use(
			rest.get(fieldsValuesURL, (req, res, ctx) => {
				requests.push(req.url.searchParams);
				return res(ctx.status(200), ctx.json(quickFiltersFieldValuesResponse));
			}),
		);

		render(
			<QuickFilters
				quickFilterSource={QuickFiltersSource.INFRA_MONITORING}
				config={getHostsQuickFiltersConfig()}
				handleFilterVisibilityChange={handleFilterVisibilityChange}
				useFieldApis={QuickFiltersFieldApis}
			/>,
		);

		await waitFor(() =>
			expect(requests.map((params) => params.get('name'))).toContain(
				INFRA_MONITORING_ATTR_KEYS.DEPLOYMENT_ENVIRONMENT,
			),
		);
		const environment = requests.find(
			(params) =>
				params.get('name') === INFRA_MONITORING_ATTR_KEYS.DEPLOYMENT_ENVIRONMENT,
		);
		expect(environment?.get('signal')).toBe(TelemetrytypesSignalDTO.metrics);
	});
});
