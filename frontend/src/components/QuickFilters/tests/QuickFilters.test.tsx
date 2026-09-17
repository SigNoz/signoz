import { ENVIRONMENT } from 'constants/env';
import {
	ApiMonitoringParams,
	useApiMonitoringParams,
} from 'container/ApiMonitoring/queryParams';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import {
	otherFiltersResponse,
	quickFiltersAttributeValuesResponse,
	quickFiltersListResponse,
} from 'mocks-server/__mockdata__/customQuickFilters';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { render, screen, userEvent, waitFor, within } from 'tests/test-utils';

import '@testing-library/jest-dom';

import QuickFilters from '../QuickFilters';
import { IQuickFiltersConfig, QuickFiltersSource, SignalType } from '../types';
import { QuickFiltersConfig } from './constants';
import type { Mock, MockedFunction } from 'vitest';

vi.mock('hooks/queryBuilder/useQueryBuilder', () => ({
	useQueryBuilder: vi.fn(),
}));
vi.mock('container/ApiMonitoring/queryParams');

const handleFilterVisibilityChange = vi.fn();
const redirectWithQueryBuilderData = vi.fn();
const putHandler = vi.fn();
const mockSetApiMonitoringParams = vi.fn() as MockedFunction<
	(newParams: Partial<ApiMonitoringParams>, replace?: boolean) => void
>;
const mockUseApiMonitoringParams = vi.mocked(useApiMonitoringParams);

const BASE_URL = ENVIRONMENT.baseURL;
const SIGNAL = SignalType.LOGS;
const quickFiltersListURL = `${BASE_URL}/api/v2/quick_filters/${SIGNAL}`;
const saveQuickFiltersURL = `${BASE_URL}/api/v2/quick_filters/${SIGNAL}`;
const quickFiltersSuggestionsURL = `${BASE_URL}/api/v1/fields/keys`;
const quickFiltersAttributeValuesURL = `${BASE_URL}/api/v3/autocomplete/attribute_values`;
const fieldsValuesURL = `${BASE_URL}/api/v1/fields/values`;

const FILTER_OS_DESCRIPTION = 'os.description';
const FILTER_K8S_DEPLOYMENT_NAME = 'k8s.deployment.name';
const ADDED_FILTERS_LABEL = /ADDED FILTERS/i;
const OTHER_FILTERS_LABEL = /OTHER FILTERS/i;
const SAVE_CHANGES_TEXT = 'Save changes';
const DISCARD_TEXT = 'Discard';
const FILTER_SERVICE_NAME = 'Service Name';
const SETTINGS_ICON_TEST_ID = 'settings-icon';
const QUERY_NAME = 'Test Query';

const setupServer = (): void => {
	server.use(
		rest.get(quickFiltersListURL, (_, res, ctx) =>
			res(ctx.status(200), ctx.json(quickFiltersListResponse)),
		),
		rest.get(quickFiltersSuggestionsURL, (_, res, ctx) =>
			res(ctx.status(200), ctx.json(otherFiltersResponse)),
		),
		rest.put(saveQuickFiltersURL, async (req, res, ctx) => {
			putHandler(await req.json());
			return res(ctx.status(200), ctx.json({}));
		}),
		rest.get(quickFiltersAttributeValuesURL, (_req, res, ctx) =>
			res(ctx.status(200), ctx.json(quickFiltersAttributeValuesResponse)),
		),
		rest.get(fieldsValuesURL, (_req, res, ctx) =>
			res(ctx.status(200), ctx.json(quickFiltersAttributeValuesResponse)),
		),
	);
};

function TestQuickFilters({
	signal = SignalType.LOGS,
	config = QuickFiltersConfig,
}: {
	signal?: SignalType;
	config?: IQuickFiltersConfig[];
}): JSX.Element {
	return (
		<QuickFilters
			source={QuickFiltersSource.EXCEPTIONS}
			config={config}
			handleFilterVisibilityChange={handleFilterVisibilityChange}
			signal={signal}
		/>
	);
}

TestQuickFilters.defaultProps = {
	signal: '',
	config: QuickFiltersConfig,
};

function TestQuickFiltersApiMonitoring({
	signal = SignalType.LOGS,
	config = QuickFiltersConfig,
}: {
	signal?: SignalType;
	config?: IQuickFiltersConfig[];
}): JSX.Element {
	return (
		<QuickFilters
			source={QuickFiltersSource.API_MONITORING}
			config={config}
			handleFilterVisibilityChange={handleFilterVisibilityChange}
			signal={signal}
		/>
	);
}

TestQuickFiltersApiMonitoring.defaultProps = {
	signal: '',
	config: QuickFiltersConfig,
};

afterEach(() => {
	server.resetHandlers();
	vi.clearAllMocks();
	// One test below swaps in fake timers. Restoring them here rather than at the
	// end of that test keeps a failure there from hanging every test after it.
	vi.useRealTimers();
});

beforeEach(() => {
	(useQueryBuilder as Mock).mockReturnValue({
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
	setupServer();
});

describe('Quick Filters', () => {
	it('displays the correct query name in the header', () => {
		render(<TestQuickFilters />);
		expect(screen.getByText('Filters for')).toBeInTheDocument();
		expect(screen.getByText(QUERY_NAME)).toBeInTheDocument();
	});

	it('should display and allow selection from query dropdown when multiple queries exist', async () => {
		const setLastUsedQuery = vi.fn();
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		(useQueryBuilder as Mock).mockReturnValue({
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

		render(<TestQuickFilters />);

		// The dropdown trigger should show the first query name
		const trigger = screen.getByText('Query A');
		expect(trigger).toBeInTheDocument();

		// Click to open the dropdown
		await user.click(trigger);

		// All query options should be visible
		await waitFor(() => {
			expect(screen.getByRole('option', { name: 'Query A' })).toBeInTheDocument();
			expect(screen.getByRole('option', { name: 'Query B' })).toBeInTheDocument();
			expect(screen.getByRole('option', { name: 'Query C' })).toBeInTheDocument();
		});

		// Select Query B
		const queryBOption = screen.getByRole('option', { name: 'Query B' });
		await user.click(queryBOption);

		// Verify setLastUsedQuery was called with index 1
		await waitFor(() => {
			expect(setLastUsedQuery).toHaveBeenCalledWith(1);
		});
	});

	it('should not display query dropdown in ListView', () => {
		(useQueryBuilder as Mock).mockReturnValue({
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

		render(<TestQuickFilters />);

		// Should show static query name without dropdown
		expect(screen.getByText('Query A')).toBeInTheDocument();

		// Dropdown trigger should not be interactive (no button/combobox)
		const queryText = screen.getByText('Query A');
		expect(queryText.tagName).not.toBe('BUTTON');
	});

	it('should display static query name when only one query exists', () => {
		render(<TestQuickFilters />);

		// Should show static query name
		expect(screen.getByText(QUERY_NAME)).toBeInTheDocument();

		// No dropdown should be present
		const queryText = screen.getByText(QUERY_NAME);
		expect(queryText.closest('[role="combobox"]')).not.toBeInTheDocument();
	});

	it('should add filter data to query when checkbox is clicked', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });

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
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		render(<TestQuickFiltersApiMonitoring />);

		// Switch should be rendered and initially checked
		expect(screen.getByText('Show IP addresses')).toBeInTheDocument();
		const toggle = screen.getByRole('switch');
		expect(toggle).toHaveAttribute('aria-checked', 'true');

		await user.click(toggle);

		await waitFor(() => {
			expect(mockSetApiMonitoringParams).toHaveBeenCalledWith(
				expect.objectContaining({ showIP: false }),
			);
		});
	});
});

describe('Quick Filters with custom filters', () => {
	it('loads the custom filters correctly', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		render(<TestQuickFilters signal={SIGNAL} />);

		expect(screen.getByText('Filters for')).toBeInTheDocument();
		expect(screen.getByText(QUERY_NAME)).toBeInTheDocument();

		await screen.findByText(FILTER_SERVICE_NAME);
		// findAllBy* resolves on the first match, and the second occurrence only
		// arrives with the values fetch.
		await waitFor(() => expect(screen.getAllByText('otel-demo')).toHaveLength(2));

		const icon = await screen.findByTestId(SETTINGS_ICON_TEST_ID);
		const settingsButton = icon.closest('button') ?? icon;
		await user.click(settingsButton);

		await expect(
			screen.findByText('Edit quick filters'),
		).resolves.toBeInTheDocument();

		const addedSection = screen.getByText(ADDED_FILTERS_LABEL).parentElement!;
		expect(addedSection).toContainElement(
			await screen.findByText(FILTER_OS_DESCRIPTION),
		);

		const otherSection = screen.getByText(OTHER_FILTERS_LABEL).parentElement!;
		expect(otherSection).toContainElement(
			await screen.findByText(FILTER_K8S_DEPLOYMENT_NAME),
		);
	});

	it('keeps same-name fields with different context as distinct entries', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
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

		render(<TestQuickFilters signal={SIGNAL} />);
		await screen.findByText(FILTER_SERVICE_NAME);

		const icon = await screen.findByTestId(SETTINGS_ICON_TEST_ID);
		const settingsButton = icon.closest('button') ?? icon;
		await user.click(settingsButton);

		const otherSection = screen.getByText(OTHER_FILTERS_LABEL).parentElement!;
		// Both `level` variants are shown despite sharing a name.
		await waitFor(() =>
			expect(within(otherSection).getAllByText('level')).toHaveLength(2),
		);

		// Adding one variant removes only that one; the other stays.
		const firstLevel = within(otherSection).getAllByText('level')[0];
		const addButton = firstLevel.parentElement?.querySelector('button');
		await user.click(addButton as HTMLButtonElement);

		const addedSection = screen.getByText(ADDED_FILTERS_LABEL).parentElement!;
		await waitFor(() => {
			expect(within(addedSection).getAllByText('level')).toHaveLength(1);
			expect(within(otherSection).getAllByText('level')).toHaveLength(1);
		});
	});

	it('adds a filter from OTHER FILTERS to ADDED FILTERS when clicked', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		render(<TestQuickFilters signal={SIGNAL} />);
		await screen.findByText(FILTER_SERVICE_NAME);

		const icon = await screen.findByTestId(SETTINGS_ICON_TEST_ID);
		const settingsButton = icon.closest('button') ?? icon;
		await user.click(settingsButton);

		const otherFilterItem = await screen.findByText(FILTER_K8S_DEPLOYMENT_NAME);
		const addButton = otherFilterItem.parentElement?.querySelector('button');
		expect(addButton).not.toBeNull();
		await user.click(addButton as HTMLButtonElement);

		const addedSection = screen.getByText(ADDED_FILTERS_LABEL).parentElement!;
		await waitFor(() => {
			expect(addedSection).toHaveTextContent(FILTER_K8S_DEPLOYMENT_NAME);
		});
	});

	it('removes a filter from ADDED FILTERS and moves it to OTHER FILTERS', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		render(<TestQuickFilters signal={SIGNAL} />);
		await screen.findByText(FILTER_SERVICE_NAME);

		const icon = await screen.findByTestId(SETTINGS_ICON_TEST_ID);
		const settingsButton = icon.closest('button') ?? icon;
		await user.click(settingsButton);

		const addedSection = screen.getByText(ADDED_FILTERS_LABEL).parentElement!;
		const target = await screen.findByText(FILTER_OS_DESCRIPTION);
		const removeBtn = target.parentElement?.querySelector('button');
		expect(removeBtn).not.toBeNull();

		await user.click(removeBtn as HTMLButtonElement);

		await waitFor(() => {
			expect(addedSection).not.toContainElement(
				screen.getByText(FILTER_OS_DESCRIPTION),
			);
		});

		const otherSection = screen.getByText(OTHER_FILTERS_LABEL).parentElement!;
		expect(otherSection).toContainElement(
			screen.getByText(FILTER_OS_DESCRIPTION),
		);
	});

	it('restores original filter state on Discard', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		render(<TestQuickFilters signal={SIGNAL} />);
		await screen.findByText(FILTER_SERVICE_NAME);

		const icon = await screen.findByTestId(SETTINGS_ICON_TEST_ID);
		const settingsButton = icon.closest('button') ?? icon;
		await user.click(settingsButton);

		const addedSection = screen.getByText(ADDED_FILTERS_LABEL).parentElement!;
		const target = await screen.findByText(FILTER_OS_DESCRIPTION);
		const removeBtn = target.parentElement?.querySelector('button');
		expect(removeBtn).not.toBeNull();
		await user.click(removeBtn as HTMLButtonElement);

		const otherSection = screen.getByText(OTHER_FILTERS_LABEL).parentElement!;
		await waitFor(() => {
			expect(addedSection).not.toContainElement(
				screen.getByText(FILTER_OS_DESCRIPTION),
			);
			expect(otherSection).toContainElement(
				screen.getByText(FILTER_OS_DESCRIPTION),
			);
		});

		const discardBtn = screen
			.getByText(DISCARD_TEXT)
			.closest('button') as HTMLButtonElement;
		expect(discardBtn).not.toBeNull();
		await user.click(discardBtn);

		await waitFor(() => {
			expect(addedSection).toContainElement(
				screen.getByText(FILTER_OS_DESCRIPTION),
			);
			expect(otherSection).not.toContainElement(
				screen.getByText(FILTER_OS_DESCRIPTION),
			);
		});
	});

	it('saves the updated filters by calling PUT with correct payload', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		render(<TestQuickFilters signal={SIGNAL} />);
		await screen.findByText(FILTER_SERVICE_NAME);

		const icon = await screen.findByTestId(SETTINGS_ICON_TEST_ID);
		const settingsButton = icon.closest('button') ?? icon;
		await user.click(settingsButton);

		const target = await screen.findByText(FILTER_OS_DESCRIPTION);
		const removeBtn = target.parentElement?.querySelector('button');
		expect(removeBtn).not.toBeNull();
		await user.click(removeBtn as HTMLButtonElement);

		const saveBtn = screen
			.getByText(SAVE_CHANGES_TEXT)
			.closest('button') as HTMLButtonElement;
		expect(saveBtn).not.toBeNull();
		await user.click(saveBtn);

		await waitFor(() => {
			expect(putHandler).toHaveBeenCalled();
		});

		const requestBody = putHandler.mock.calls[0][0];
		expect(requestBody.filters).not.toContainEqual(
			expect.objectContaining({ name: FILTER_OS_DESCRIPTION }),
		);
		expect(requestBody.filters).toHaveLength(10);
	});

	it('should render duration slider for duration_nono filter', async () => {
		// Fake timers cover the debounce only. `findBy*` does not advance vitest's
		// fake clock, so the initial fetch has to settle on real timers first.
		const user = userEvent.setup({
			// userEvent calls this for its own inter-event delay too, which happens
			// before the clock is faked below.
			advanceTimers: (ms) => {
				if (vi.isFakeTimers()) {
					vi.advanceTimersByTime(ms);
				}
			},
			pointerEventsCheck: 0,
		});

		const { getByTestId } = render(<TestQuickFilters signal={SIGNAL} />);
		await screen.findByText(FILTER_SERVICE_NAME);
		expect(screen.getByText('Duration')).toBeInTheDocument();

		// Open the duration section (use role if it’s a button/collapse)
		await user.click(screen.getByText('Duration'));

		const minDuration = getByTestId('min-input') as HTMLInputElement;
		const maxDuration = getByTestId('max-input') as HTMLInputElement;

		expect(minDuration).toHaveValue(null);
		expect(minDuration).toHaveProperty('placeholder', '0');
		expect(maxDuration).toHaveValue(null);
		expect(maxDuration).toHaveProperty('placeholder', '100000000');

		// Type values and advance debounce
		vi.useFakeTimers();
		await user.clear(minDuration);
		await user.type(minDuration, '10000');
		await user.clear(maxDuration);
		await user.type(maxDuration, '20000');
		vi.advanceTimersByTime(2000);
		vi.useRealTimers();

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
	});
});

describe('Quick Filters refetch behavior', () => {
	it('fetches custom filters on every mount when signal is provided', async () => {
		let getCalls = 0;

		server.use(
			rest.get(quickFiltersListURL, (_req, res, ctx) => {
				getCalls += 1;
				return res(ctx.status(200), ctx.json(quickFiltersListResponse));
			}),
		);

		const { unmount } = render(<TestQuickFilters signal={SIGNAL} />);
		await expect(
			screen.findByText(FILTER_SERVICE_NAME),
		).resolves.toBeInTheDocument();

		unmount();

		render(<TestQuickFilters signal={SIGNAL} />);
		await expect(
			screen.findByText(FILTER_SERVICE_NAME),
		).resolves.toBeInTheDocument();

		expect(getCalls).toBe(2);
	});

	it('does not fetch custom filters when signal is undefined', async () => {
		let getCalls = 0;

		server.use(
			rest.get(quickFiltersListURL, (_req, res, ctx) => {
				getCalls += 1;
				return res(ctx.status(200), ctx.json(quickFiltersListResponse));
			}),
		);

		render(<TestQuickFilters signal={undefined} />);

		await waitFor(() => expect(getCalls).toBe(0));
	});

	it('refetches custom filters after saving settings', async () => {
		let getCalls = 0;
		putHandler.mockClear();

		server.use(
			rest.get(quickFiltersListURL, (_req, res, ctx) => {
				getCalls += 1;
				return res(ctx.status(200), ctx.json(quickFiltersListResponse));
			}),
			rest.put(saveQuickFiltersURL, async (req, res, ctx) => {
				putHandler(await req.json());
				return res(ctx.status(200), ctx.json({}));
			}),
		);

		const user = userEvent.setup({ pointerEventsCheck: 0 });
		render(<TestQuickFilters signal={SIGNAL} />);

		await expect(
			screen.findByText(FILTER_SERVICE_NAME),
		).resolves.toBeInTheDocument();

		const icon = await screen.findByTestId(SETTINGS_ICON_TEST_ID);
		const settingsButton = icon.closest('button') ?? icon;
		await user.click(settingsButton);

		const target = await screen.findByText(FILTER_OS_DESCRIPTION);
		const removeBtn = target.parentElement?.querySelector(
			'button',
		) as HTMLButtonElement;
		await user.click(removeBtn);

		await user.click(screen.getByText(SAVE_CHANGES_TEXT));

		await waitFor(() => expect(putHandler).toHaveBeenCalled());
		await waitFor(() => expect(getCalls).toBeGreaterThanOrEqual(2));
	});

	it('renders updated filters after refetch post-save', async () => {
		const updatedResponse = {
			...quickFiltersListResponse,
			data: {
				...quickFiltersListResponse.data,
				filters: [
					...(quickFiltersListResponse.data.filters ?? []),
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
					: res(ctx.status(200), ctx.json(quickFiltersListResponse));
			}),
			rest.put(saveQuickFiltersURL, async (_req, res, ctx) =>
				res(ctx.status(200), ctx.json({})),
			),
		);

		const user = userEvent.setup({ pointerEventsCheck: 0 });
		render(<TestQuickFilters signal={SIGNAL} />);

		await expect(
			screen.findByText(FILTER_SERVICE_NAME),
		).resolves.toBeInTheDocument();

		const icon = await screen.findByTestId(SETTINGS_ICON_TEST_ID);
		const settingsButton = icon.closest('button') ?? icon;
		await user.click(settingsButton);

		// Make a minimal change so Save button appears
		const target = await screen.findByText(FILTER_OS_DESCRIPTION);
		const removeBtn = target.parentElement?.querySelector(
			'button',
		) as HTMLButtonElement;
		await user.click(removeBtn);

		await user.click(screen.getByText(SAVE_CHANGES_TEXT));

		await waitFor(() => {
			expect(screen.getByText('New Custom Filter')).toBeInTheDocument();
		});
	});

	it('shows empty state when GET fails', async () => {
		server.use(
			rest.get(quickFiltersListURL, (_req, res, ctx) =>
				res(ctx.status(500), ctx.json({})),
			),
		);

		render(<TestQuickFilters signal={SIGNAL} config={[]} />);

		await expect(
			screen.findByText('No filters found'),
		).resolves.toBeInTheDocument();
	});
});
