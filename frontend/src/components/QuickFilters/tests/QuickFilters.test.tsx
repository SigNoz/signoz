import '@testing-library/jest-dom';

import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from '@testing-library/react';
import { ENVIRONMENT } from 'constants/env';
import ROUTES from 'constants/routes';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import {
	otherFiltersResponse,
	quickFiltersAttributeValuesResponse,
	quickFiltersListResponse,
} from 'mocks-server/__mockdata__/customQuickFilters';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import MockQueryClientProvider from 'providers/test/MockQueryClientProvider';
import { USER_ROLES } from 'types/roles';

import QuickFilters from '../QuickFilters';
import { IQuickFiltersConfig, QuickFiltersSource, SignalType } from '../types';
import { QuickFiltersConfig } from './constants';

jest.mock('hooks/queryBuilder/useQueryBuilder', () => ({
	useQueryBuilder: jest.fn(),
}));

// eslint-disable-next-line sonarjs/no-duplicate-string
jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useLocation: (): { pathname: string } => ({
		pathname: `${process.env.FRONTEND_API_ENDPOINT}/${ROUTES.TRACES_EXPLORER}/`,
	}),
}));

const userRole = USER_ROLES.ADMIN;

// mock useAppContext
jest.mock('providers/App/App', () => ({
	useAppContext: jest.fn(() => ({ user: { role: userRole } })),
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
		rest.get(quickFiltersAttributeValuesURL, (_, res, ctx) =>
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
		<MockQueryClientProvider>
			<QuickFilters
				source={QuickFiltersSource.EXCEPTIONS}
				config={config}
				handleFilterVisibilityChange={handleFilterVisibilityChange}
				signal={signal}
			/>
		</MockQueryClientProvider>
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
});

afterAll(() => {
	server.close();
	cleanup();
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
		render(<TestQuickFilters />);
		const checkbox = screen.getByText('mq-kafka');
		fireEvent.click(checkbox);

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
		render(<TestQuickFilters signal={SIGNAL} />);
		expect(screen.getByText('Filters for')).toBeInTheDocument();
		expect(screen.getByText(QUERY_NAME)).toBeInTheDocument();
		await screen.findByText(FILTER_SERVICE_NAME);
		const allByText = await screen.findAllByText('otel-demo');
		// since 2 filter collapse are open, there are 2 filter items visible
		expect(allByText).toHaveLength(2);

		const icon = await screen.findByTestId(SETTINGS_ICON_TEST_ID);
		fireEvent.click(icon);

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
		render(<TestQuickFilters signal={SIGNAL} />);
		await screen.findByText(FILTER_SERVICE_NAME);

		const icon = await screen.findByTestId(SETTINGS_ICON_TEST_ID);
		fireEvent.click(icon);

		const otherFilterItem = await screen.findByText(FILTER_K8S_DEPLOYMENT_NAME);
		const addButton = otherFilterItem.parentElement?.querySelector('button');
		expect(addButton).not.toBeNull();
		fireEvent.click(addButton as HTMLButtonElement);

		const addedSection = screen.getByText(ADDED_FILTERS_LABEL).parentElement!;
		await waitFor(() => {
			expect(addedSection).toHaveTextContent(FILTER_K8S_DEPLOYMENT_NAME);
		});
	});

	it('removes a filter from ADDED FILTERS and moves it to OTHER FILTERS', async () => {
		render(<TestQuickFilters signal={SIGNAL} />);
		await screen.findByText(FILTER_SERVICE_NAME);

		const icon = await screen.findByTestId(SETTINGS_ICON_TEST_ID);
		fireEvent.click(icon);

		const addedSection = screen.getByText(ADDED_FILTERS_LABEL).parentElement!;
		const target = await screen.findByText(FILTER_OS_DESCRIPTION);
		const removeBtn = target.parentElement?.querySelector('button');
		expect(removeBtn).not.toBeNull();
		fireEvent.click(removeBtn as HTMLButtonElement);

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
		render(<TestQuickFilters signal={SIGNAL} />);
		await screen.findByText(FILTER_SERVICE_NAME);

		const icon = await screen.findByTestId(SETTINGS_ICON_TEST_ID);
		fireEvent.click(icon);

		const addedSection = screen.getByText(ADDED_FILTERS_LABEL).parentElement!;
		const target = await screen.findByText(FILTER_OS_DESCRIPTION);
		const removeBtn = target.parentElement?.querySelector('button');
		expect(removeBtn).not.toBeNull();
		fireEvent.click(removeBtn as HTMLButtonElement);

		const otherSection = screen.getByText(OTHER_FILTERS_LABEL).parentElement!;
		await waitFor(() => {
			expect(addedSection).not.toContainElement(
				screen.getByText(FILTER_OS_DESCRIPTION),
			);
			expect(otherSection).toContainElement(
				screen.getByText(FILTER_OS_DESCRIPTION),
			);
		});

		fireEvent.click(screen.getByText(DISCARD_TEXT));

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
		render(<TestQuickFilters signal={SIGNAL} />);
		await screen.findByText(FILTER_SERVICE_NAME);

		const icon = await screen.findByTestId(SETTINGS_ICON_TEST_ID);
		fireEvent.click(icon);

		const target = await screen.findByText(FILTER_OS_DESCRIPTION);
		const removeBtn = target.parentElement?.querySelector('button');
		expect(removeBtn).not.toBeNull();
		fireEvent.click(removeBtn as HTMLButtonElement);

		fireEvent.click(screen.getByText(SAVE_CHANGES_TEXT));

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

	// render duration filter
	it('should render duration slider for duration_nono filter', async () => {
		// Set up fake timers **before rendering**
		jest.useFakeTimers();

		const { getByTestId } = render(<TestQuickFilters signal={SIGNAL} />);
		await screen.findByText(FILTER_SERVICE_NAME);
		expect(screen.getByText('Duration')).toBeInTheDocument();

		// click to open the duration filter
		fireEvent.click(screen.getByText('Duration'));

		const minDuration = getByTestId('min-input') as HTMLInputElement;
		const maxDuration = getByTestId('max-input') as HTMLInputElement;
		expect(minDuration).toHaveValue(null);
		expect(minDuration).toHaveProperty('placeholder', '0');
		expect(maxDuration).toHaveValue(null);
		expect(maxDuration).toHaveProperty('placeholder', '100000000');

		await act(async () => {
			// set values
			fireEvent.change(minDuration, { target: { value: '10000' } });
			fireEvent.change(maxDuration, { target: { value: '20000' } });
			jest.advanceTimersByTime(2000);
		});
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

		jest.useRealTimers(); // Clean up
	});
});
