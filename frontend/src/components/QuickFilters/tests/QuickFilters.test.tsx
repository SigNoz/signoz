import '@testing-library/jest-dom';

import { ENVIRONMENT } from 'constants/env';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import {
	otherFiltersResponse,
	quickFiltersAttributeValuesResponse,
	quickFiltersListResponse,
} from 'mocks-server/__mockdata__/customQuickFilters';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { render, screen, userEvent, waitFor } from 'tests/test-utils';

import QuickFilters from '../QuickFilters';
import { IQuickFiltersConfig, QuickFiltersSource, SignalType } from '../types';
import { QuickFiltersConfig } from './constants';

jest.mock('hooks/queryBuilder/useQueryBuilder', () => ({
	useQueryBuilder: jest.fn(),
}));

const handleFilterVisibilityChange = jest.fn();
const redirectWithQueryBuilderData = jest.fn();
const putHandler = jest.fn();

const BASE_URL = ENVIRONMENT.baseURL;
const SIGNAL = SignalType.LOGS;
const quickFiltersListURL = `${BASE_URL}/api/v1/orgs/me/filters/${SIGNAL}`;
const saveQuickFiltersURL = `${BASE_URL}/api/v1/orgs/me/filters`;
const quickFiltersSuggestionsURL = `${BASE_URL}/api/v3/filter_suggestions`;
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

beforeAll(() => {
	server.listen();
});

afterEach(() => {
	server.resetHandlers();
	jest.clearAllMocks();
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
	setupServer();
});

describe('Quick Filters', () => {
	it('displays the correct query name in the header', () => {
		render(<TestQuickFilters />);
		expect(screen.getByText('Filters for')).toBeInTheDocument();
		expect(screen.getByText(QUERY_NAME)).toBeInTheDocument();
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
});

describe('Quick Filters with custom filters', () => {
	it('loads the custom filters correctly', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		render(<TestQuickFilters signal={SIGNAL} />);

		expect(screen.getByText('Filters for')).toBeInTheDocument();
		expect(screen.getByText(QUERY_NAME)).toBeInTheDocument();

		await screen.findByText(FILTER_SERVICE_NAME);
		const allByText = await screen.findAllByText('otel-demo');
		expect(allByText).toHaveLength(2);

		const icon = await screen.findByTestId(SETTINGS_ICON_TEST_ID);
		const settingsButton = icon.closest('button') ?? icon;
		await user.click(settingsButton);

		expect(await screen.findByText('Edit quick filters')).toBeInTheDocument();

		const addedSection = screen.getByText(ADDED_FILTERS_LABEL).parentElement!;
		expect(addedSection).toContainElement(
			await screen.findByText(FILTER_OS_DESCRIPTION),
		);

		const otherSection = screen.getByText(OTHER_FILTERS_LABEL).parentElement!;
		expect(otherSection).toContainElement(
			await screen.findByText(FILTER_K8S_DEPLOYMENT_NAME),
		);
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
		expect(requestBody.filters).toEqual(
			expect.arrayContaining([
				expect.not.objectContaining({ key: FILTER_OS_DESCRIPTION }),
			]),
		);
		expect(requestBody.signal).toBe(SIGNAL);
	});

	it('should render duration slider for duration_nono filter', async () => {
		// Use fake timers only in this test (for debounce), and wire them to userEvent
		jest.useFakeTimers();
		const user = userEvent.setup({
			advanceTimers: (ms) => jest.advanceTimersByTime(ms),
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
		await user.clear(minDuration);
		await user.type(minDuration, '10000');
		await user.clear(maxDuration);
		await user.type(maxDuration, '20000');
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
	it('fetches custom filters on every mount when signal is provided', async () => {
		let getCalls = 0;

		server.use(
			rest.get(quickFiltersListURL, (_req, res, ctx) => {
				getCalls += 1;
				return res(ctx.status(200), ctx.json(quickFiltersListResponse));
			}),
		);

		const { unmount } = render(<TestQuickFilters signal={SIGNAL} />);
		expect(await screen.findByText(FILTER_SERVICE_NAME)).toBeInTheDocument();

		unmount();

		render(<TestQuickFilters signal={SIGNAL} />);
		expect(await screen.findByText(FILTER_SERVICE_NAME)).toBeInTheDocument();

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

		expect(await screen.findByText(FILTER_SERVICE_NAME)).toBeInTheDocument();

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
						key: 'new.custom.filter',
						dataType: 'string',
						type: 'resource',
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

		expect(await screen.findByText(FILTER_SERVICE_NAME)).toBeInTheDocument();

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

		expect(await screen.findByText('No filters found')).toBeInTheDocument();
	});
});
