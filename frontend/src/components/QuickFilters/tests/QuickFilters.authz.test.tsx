import { ENVIRONMENT } from 'constants/env';
import {
	ApiMonitoringParams,
	useApiMonitoringParams,
} from 'container/ApiMonitoring/queryParams';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import {
	QuickFilterReadPermission,
	QuickFilterUpdatePermission,
} from 'lib/authz/hooks/useAuthZ/permissions/quick-filter.permissions';
import {
	AUTHZ_CHECK_URL,
	setupAuthzAdmin,
	setupAuthzDeny,
	setupAuthzDenyAll,
} from 'lib/authz/utils/authz-test-utils';
import {
	otherFiltersResponse,
	quickFiltersAttributeValuesResponse,
	quickFiltersListResponse,
} from 'mocks-server/__mockdata__/customQuickFilters';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { render, screen, userEvent, waitFor } from 'tests/test-utils';

import QuickFilters from '../QuickFilters';
import { QuickFiltersSource, SignalType } from '../types';
import { QuickFiltersConfig } from './constants';

jest.mock('hooks/queryBuilder/useQueryBuilder', () => ({
	useQueryBuilder: jest.fn(),
}));
jest.mock('container/ApiMonitoring/queryParams');

const mockUseApiMonitoringParams = jest.mocked(useApiMonitoringParams);

const BASE_URL = ENVIRONMENT.baseURL;
const SIGNAL = SignalType.LOGS;
const quickFiltersListURL = `${BASE_URL}/api/v2/quick_filters/${SIGNAL}`;
const fieldsKeysURL = `${BASE_URL}/api/v1/fields/keys`;
const attributeValuesURL = `${BASE_URL}/api/v3/autocomplete/attribute_values`;
const fieldsValuesURL = `${BASE_URL}/api/v1/fields/values`;

const NOT_AUTHORIZED_TEXT = /is not authorized to perform/i;
const FILTER_SERVICE_NAME = 'Service Name';
const SETTINGS_CONTAINER_TEST_ID = 'settings-icon-container';

beforeEach(() => {
	(useQueryBuilder as jest.Mock).mockReturnValue({
		currentQuery: {
			builder: {
				queryData: [
					{
						queryName: 'Test Query',
						filters: { items: [] },
					},
				],
			},
		},
		lastUsedQuery: 0,
		redirectWithQueryBuilderData: jest.fn(),
	});
	mockUseApiMonitoringParams.mockReturnValue([
		{ showIP: true } as ApiMonitoringParams,
		jest.fn(),
	]);
	server.use(
		rest.get(quickFiltersListURL, (_req, res, ctx) =>
			res(ctx.status(200), ctx.json(quickFiltersListResponse)),
		),
		rest.get(fieldsKeysURL, (_req, res, ctx) =>
			res(ctx.status(200), ctx.json(otherFiltersResponse)),
		),
		rest.get(attributeValuesURL, (_req, res, ctx) =>
			res(ctx.status(200), ctx.json(quickFiltersAttributeValuesResponse)),
		),
		rest.get(fieldsValuesURL, (_req, res, ctx) =>
			res(ctx.status(200), ctx.json(quickFiltersAttributeValuesResponse)),
		),
	);
});

afterEach(() => {
	server.resetHandlers();
	jest.clearAllMocks();
});

function renderWithSignal(): void {
	render(
		<QuickFilters
			source={QuickFiltersSource.LOGS_EXPLORER}
			signal={SIGNAL}
			handleFilterVisibilityChange={jest.fn()}
		/>,
	);
}

function renderStaticConfig(): void {
	render(
		<QuickFilters
			source={QuickFiltersSource.EXCEPTIONS}
			config={QuickFiltersConfig}
			handleFilterVisibilityChange={jest.fn()}
		/>,
	);
}

describe('QuickFilters - AuthZ', () => {
	describe('read denied', () => {
		it('shows the inline denial instead of the filters, header stays', async () => {
			server.use(setupAuthzDeny(QuickFilterReadPermission));

			renderWithSignal();

			await expect(
				screen.findByText(NOT_AUTHORIZED_TEXT),
			).resolves.toBeInTheDocument();

			expect(screen.queryByText(FILTER_SERVICE_NAME)).not.toBeInTheDocument();
			expect(screen.getByText('Filters for')).toBeInTheDocument();

			const settingsTrigger = await screen.findByTestId(
				SETTINGS_CONTAINER_TEST_ID,
			);
			await waitFor(() =>
				expect(settingsTrigger).toHaveAttribute(
					'data-denied-permissions',
					expect.stringContaining('read'),
				),
			);
		});
	});

	describe('update denied', () => {
		it('renders the filters but disables the settings trigger', async () => {
			server.use(setupAuthzDeny(QuickFilterUpdatePermission));

			renderWithSignal();

			await expect(
				screen.findByText(FILTER_SERVICE_NAME),
			).resolves.toBeInTheDocument();

			const settingsTrigger = await screen.findByTestId(
				SETTINGS_CONTAINER_TEST_ID,
			);
			await waitFor(() =>
				expect(settingsTrigger).toHaveAttribute(
					'data-denied-permissions',
					expect.stringContaining('update'),
				),
			);

			await userEvent.click(settingsTrigger);
			expect(screen.queryByText(/ADDED FILTERS/i)).not.toBeInTheDocument();
		});
	});

	describe('all permissions granted', () => {
		it('renders the filters and opens settings from the trigger', async () => {
			server.use(setupAuthzAdmin());

			renderWithSignal();

			await expect(
				screen.findByText(FILTER_SERVICE_NAME),
			).resolves.toBeInTheDocument();

			const settingsTrigger = await screen.findByTestId(
				SETTINGS_CONTAINER_TEST_ID,
			);
			expect(settingsTrigger).not.toHaveAttribute('data-denied-permissions');

			await userEvent.click(settingsTrigger);
			await expect(
				screen.findByText(/ADDED FILTERS/i),
			).resolves.toBeInTheDocument();
		});
	});

	describe('static config pages (no signal)', () => {
		it('is not gated even when every permission is denied', async () => {
			server.use(setupAuthzDenyAll());

			renderStaticConfig();

			await expect(
				screen.findByText(FILTER_SERVICE_NAME),
			).resolves.toBeInTheDocument();
			expect(screen.queryByText(NOT_AUTHORIZED_TEXT)).not.toBeInTheDocument();
		});
	});

	describe('permission check loading', () => {
		it('shows the skeleton, not the filters or a denial', async () => {
			server.use(
				rest.post(AUTHZ_CHECK_URL, (_req, res, ctx) => res(ctx.delay('infinite'))),
			);

			renderWithSignal();

			await waitFor(() =>
				// eslint-disable-next-line testing-library/no-node-access
				expect(
					document.querySelector('.quick-filters-skeleton'),
				).toBeInTheDocument(),
			);
			expect(screen.queryByText(NOT_AUTHORIZED_TEXT)).not.toBeInTheDocument();
			expect(screen.queryByText(FILTER_SERVICE_NAME)).not.toBeInTheDocument();
		});
	});
});
