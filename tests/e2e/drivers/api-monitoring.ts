import { expect, type Locator, type Page } from '@playwright/test';

import {
	allowFor,
	driver,
	kit,
	seeded,
	SEEDED_TEST_BUDGET,
	type Layer,
	type WorkerLayer,
} from './kit';
import { querySearchDriver, type QuerySearch } from './querysearch';
import { clientCall, STATUS, stamp as stampFor } from './spans';
import { seedTracesViaSeeder } from './traces';

/**
 * External API monitoring: the domain list and the domain drawer. A domain is a
 * CLIENT span's `http.host`; an endpoint is its full `http.url`.
 */

const PATH = '/api-monitoring/explorer';
const PARAM = 'apiMonitoringParams';

export type DomainView = 'all_endpoints' | 'endpoint_stats' | 'top_errors';

export interface ApiSeed {
	stamp: string;
	host: string;
	/** Full URLs, as the drawer lists them. */
	endpoints: { items: string; pay: string };
	callers: { orders: string; billing: string };
	errorMessage: string;
	errorStatus: number;
	/** Seeded CLIENT spans; the drawer's "External API" metric counts them. */
	callCount: number;
}

/** Shape of the `apiMonitoringParams` URL param (`ApiMonitoring/queryParams.ts`). */
interface ApiMonitoringParams {
	showIP?: boolean;
	selectedDomain?: string;
	selectedView?: string;
	selectedEndPointName?: string;
	/** Epoch seconds. */
	modalTimeRange?: { startTime: number; endTime: number };
}

export interface DomainDrawer {
	root(): Locator;
	title(): Locator;
	metrics(): Locator;
	/** The four metric values, in label order. */
	metricValues(): Promise<string[]>;
	view(view: DomainView): Promise<void>;
	viewButton(view: DomainView): Locator;
	endpointsTable(): Locator;
	topErrorsTable(): Locator;
	topErrorRow(endpoint: string): Locator;
	/** The row's last column, its error count. */
	topErrorCount(endpoint: string): Locator;
	statusMessageToggle(): Locator;
	dependentServices(): Locator;
	statusCodeTable(): Locator;
	statusCodeCell(code: string): Locator;
	next(): Promise<void>;
	prev(): Promise<void>;
}

export interface ApiMonitoring {
	goto(params?: Record<string, string>): Promise<void>;
	search: QuerySearch;
	domainTable(): Locator;
	emptyState(): Locator;
	headers(): Promise<string[]>;
	domainRow(host: string): Locator;
	domainCell(host: string, header: string): Promise<Locator>;
	/** Reload until `host` is listed: the list fetches once per load. */
	waitForDomain(host: string): Promise<void>;
	openDomain(host: string): Promise<void>;
	/** Deep-link the drawer on `view`, with a modal range covering the last 15 m. */
	gotoDomain(
		host: string,
		view: DomainView,
		extra?: { endpoint?: string },
	): Promise<void>;
	params(): ApiMonitoringParams;
	drawer: DomainDrawer;
}

const normalise = (text: string): string => text.replace(/\s+/g, ' ').trim();

export function apiMonitoringDriver(page: Page): ApiMonitoring {
	const domainTable = (): Locator =>
		page.getByTestId('api-monitoring-domain-table');
	const emptyState = (): Locator =>
		page.getByTestId('api-monitoring-empty-state');
	const root = (): Locator => page.getByTestId('domain-details-drawer');

	const headers = async (): Promise<string[]> =>
		// Text content, not inner text: the headers are uppercased in CSS.
		(await domainTable().getByRole('columnheader').allTextContents())
			.map(normalise)
			.filter(Boolean);

	const readyList = async (): Promise<void> => {
		await expect(domainTable().or(emptyState()).first()).toBeVisible();
	};

	const api: ApiMonitoring = {
		search: querySearchDriver(page, { runTestId: 'explorer-run-query-btn' }),
		domainTable,
		emptyState,
		headers,

		goto: async (params = {}) => {
			const query = new URLSearchParams({ relativeTime: '15m', ...params });
			await page.goto(`${PATH}?${query.toString()}`);
			await readyList();
		},

		domainRow: (host) => page.getByTestId(`domain-row-${host}`),

		domainCell: async (host, header) => {
			const index = (await headers()).indexOf(header);
			if (index === -1) {
				throw new Error(`domain table has no "${header}" column`);
			}
			return api.domainRow(host).getByRole('cell').nth(index);
		},

		waitForDomain: async (host) => {
			allowFor(SEEDED_TEST_BUDGET);
			await expect(async () => {
				await page.reload();
				await expect(api.domainRow(host)).toBeVisible({ timeout: 5_000 });
			}).toPass({ timeout: SEEDED_TEST_BUDGET - 15_000 });
		},

		openDomain: async (host) => {
			await api.domainRow(host).click();
			await expect(root()).toBeVisible();
			await expect(api.drawer.title()).toHaveText(host);
		},

		gotoDomain: async (host, view, extra = {}) => {
			allowFor(SEEDED_TEST_BUDGET);
			const nowS = Math.floor(Date.now() / 1000);
			const params: ApiMonitoringParams = {
				showIP: true,
				selectedDomain: host,
				selectedView: view,
				selectedEndPointName: extra.endpoint ?? '',
				modalTimeRange: { startTime: nowS - 15 * 60, endTime: nowS },
			};
			const query = new URLSearchParams({
				relativeTime: '15m',
				[PARAM]: encodeURIComponent(JSON.stringify(params)),
			});
			// The drawer opens only once the list response contains the domain, so
			// a seed that is not queryable yet leaves it closed.
			await expect(async () => {
				await page.goto(`${PATH}?${query.toString()}`);
				await expect(root()).toBeVisible({ timeout: 8_000 });
			}).toPass({ timeout: SEEDED_TEST_BUDGET - 15_000 });
			await expect(api.drawer.title()).toHaveText(host);
		},

		params: () => {
			const raw = new URL(page.url()).searchParams.get(PARAM);
			if (!raw) {
				return {};
			}
			return JSON.parse(decodeURIComponent(raw)) as ApiMonitoringParams;
		},

		drawer: {
			root,
			title: () => page.getByTestId('domain-details-title'),
			metrics: () => page.getByTestId('domain-metrics'),
			metricValues: async () => {
				const values = page.getByTestId('domain-metrics-values');
				await expect(values.locator('.ant-skeleton')).toHaveCount(0);
				return (await values.locator('> *').allInnerTexts()).map(normalise);
			},
			viewButton: (view) => page.getByTestId(`domain-view-${view}`),
			view: async (view) => {
				await api.drawer.viewButton(view).click();
				await expect(async () => {
					expect(api.params().selectedView).toBe(view);
				}).toPass();
			},
			endpointsTable: () => root().getByRole('table').first(),
			topErrorsTable: () => page.getByTestId('top-errors-table'),
			// The table prints the endpoint's path, not its full URL.
			topErrorRow: (endpoint) =>
				api.drawer
					.topErrorsTable()
					.getByRole('row')
					.filter({ hasText: new URL(endpoint).pathname }),
			topErrorCount: (endpoint) =>
				api.drawer.topErrorRow(endpoint).getByRole('cell').last(),
			statusMessageToggle: () =>
				page.getByTestId('top-errors-status-message-toggle'),
			dependentServices: () => page.getByTestId('dependent-services-table'),
			statusCodeTable: () => page.getByTestId('endpoint-status-code-table'),
			statusCodeCell: (code) =>
				api.drawer.statusCodeTable().getByRole('cell', { name: code, exact: true }),
			next: async () => {
				await root().getByRole('button', { name: 'Next domain' }).click();
			},
			prev: async () => {
				await root().getByRole('button', { name: 'Previous domain' }).click();
			},
		},
	};

	return api;
}

export const withApiMonitoring: Layer<{ apiMonitoring: ApiMonitoring }> =
	driver('apiMonitoring', ({ page }) => apiMonitoringDriver(page));

/**
 * Six CLIENT spans to one stamped host: four OK and one 503 on `/v1/items` from
 * the orders service, one `POST /v1/pay` from billing. No teardown: telemetry
 * has no scoped delete, and the host is unique to the worker.
 */
export const withApiSeed: WorkerLayer<{ apiSeed: ApiSeed }> = seeded(
	'apiSeed',
	async ({ page, workerIndex }) => {
		const stamp = stampFor('api', workerIndex);
		const host = `${stamp}.example.com`;
		const endpoints = {
			items: `https://${host}/v1/items`,
			pay: `https://${host}/v1/pay`,
		};
		const callers = { orders: `${stamp}-orders`, billing: `${stamp}-billing` };
		const errorMessage = 'upstream 503';
		const errorStatus = 503;
		const spans = [
			...[50_000, 40_000, 30_000, 20_000].map((agoMs) =>
				clientCall({ service: callers.orders, url: endpoints.items, agoMs }),
			),
			clientCall({
				service: callers.orders,
				url: endpoints.items,
				httpStatus: errorStatus,
				status: STATUS.error,
				statusMessage: errorMessage,
				agoMs: 25_000,
			}),
			clientCall({
				service: callers.billing,
				url: endpoints.pay,
				method: 'POST',
				agoMs: 35_000,
			}),
		];
		await seedTracesViaSeeder(page.request, spans);
		return {
			stamp,
			host,
			endpoints,
			callers,
			errorMessage,
			errorStatus,
			callCount: spans.length,
		};
	},
);

/** The API monitoring `test`. */
export const test = withApiSeed(withApiMonitoring(kit));
export { expect } from './kit';
