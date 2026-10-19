import {
	expect,
	type Locator,
	type Page,
	type Response,
} from '@playwright/test';

import { antdDriver } from './antd';
import { apiDriver } from './api';
import type { ConsoleWatch } from './console';
import { driver, kit, seeded, type Layer, type WorkerLayer } from './kit';

/**
 * The integrations surface: the list, a built-in integration's detail page, and
 * the AWS / GCP / Azure one-click pages.
 *
 * Built-in installs and cloud accounts are org-global. Specs assert only on
 * what they seeded; install state of any integration other than the spec's own
 * is never asserted.
 */

export const INTEGRATIONS_PATH = '/integrations';

export type CloudProvider = 'aws' | 'gcp' | 'azure';
export type DetailTab = 'Overview' | 'Configure' | 'Data Collected';

const INTEGRATIONS_API = '/api/v1/integrations';
const cloudApi = (provider: CloudProvider): string =>
	`/api/v1/cloud_integrations/${provider}`;

/**
 * `IntegrationDetailPage` calls `GET /api/v1/integrations/<id>` (and its
 * connection status) before it branches to the cloud page, so every
 * `/integrations/{aws,gcp,azure}` load 404s on a result nobody reads.
 */
const CLOUD_DETAIL_404 = /\/api\/v1\/integrations\/(aws|gcp|azure)(\/|\?|$)/;

/** Mirrors `CloudintegrationtypesCredentialsDTO`. */
interface Credentials {
	ingestionKey: string;
	ingestionUrl: string;
	sigNozApiKey: string;
	sigNozApiUrl: string;
}

/** Mirrors `CloudintegrationtypesAccountDTO`, trimmed to what specs read. */
export interface CloudAccountDto {
	id: string;
	providerAccountId: string | null;
	config: { aws?: { regions: string[] } };
}

/** Mirrors `CloudintegrationtypesServiceConfigDTO` for one provider. */
export interface ServiceSignals {
	metrics: boolean;
	logs: boolean;
}

export const E2E_CREDENTIALS: Credentials = {
	ingestionUrl: 'https://ingest.test.signoz.cloud',
	ingestionKey: 'e2e-ingestion-key',
	sigNozApiUrl: 'https://e2e.test.signoz.cloud',
	sigNozApiKey: 'e2e-api-key',
};

const isCall =
	(method: string, path: string | RegExp) =>
	(response: Response): boolean =>
		response.request().method() === method &&
		(typeof path === 'string'
			? new URL(response.url()).pathname === path
			: path.test(new URL(response.url()).pathname));

// ─── Built-in integrations ─────────────────────────────────────────────────

export interface Integrations {
	gotoList(): Promise<void>;
	searchBox(): Locator;
	search(text: string): Promise<void>;
	row(id: string): Locator;
	rowStatus(id: string): Locator;
	oneClick(id: CloudProvider): Locator;

	gotoDetail(id: string): Promise<void>;
	backToList(): Promise<void>;
	tab(name: DetailTab): Locator;
	openTab(name: DetailTab): Promise<void>;
	categories(): Locator;
	assets(): Locator;
	configureSteps(): Locator;
	/** Body rows of the Data Collected metrics table. */
	metricsRows(): Locator;
	connectButton(): Locator;
	/** Connect through the modal. Resolves the install response. */
	connect(): Promise<Response>;
	connectionStatus(): Locator;
	removeButton(): Locator;
	/** Remove through the confirm modal. Resolves the uninstall response. */
	remove(): Promise<Response>;
	uninstallViaApi(id: string): Promise<void>;

	toast(text: string | RegExp): Locator;
	/** `noise.failedResponses` minus the cloud detail page's known 404. */
	unexpectedFailures(noise: ConsoleWatch): string[];
}

export function integrationsDriver(page: Page): Integrations {
	const api = apiDriver(page);

	const integrations: Integrations = {
		searchBox: () => page.getByPlaceholder('Search for an integration...'),

		gotoList: async () => {
			await page.goto(INTEGRATIONS_PATH);
			await expect(integrations.searchBox()).toBeVisible();
		},

		search: async (text) => {
			await integrations.searchBox().fill(text);
		},

		row: (id) => page.getByTestId(`integration-row-${id}`),
		rowStatus: (id) => integrations.row(id).getByTestId('integration-row-status'),
		oneClick: (id) => page.getByTestId(`one-click-integration-${id}`),

		gotoDetail: async (id) => {
			await page.goto(`${INTEGRATIONS_PATH}/${id}`);
			await expect(integrations.connectButton()).toBeEnabled();
		},

		backToList: async () => {
			await page.getByRole('button', { name: 'All Integrations' }).click();
			await expect(page).toHaveURL(/\/integrations$/);
			await expect(integrations.searchBox()).toBeVisible();
		},

		tab: (name) => page.getByRole('tab', { name }),

		openTab: async (name) => {
			await integrations.tab(name).click();
			await expect(integrations.tab(name)).toHaveAttribute(
				'aria-selected',
				'true',
			);
		},

		categories: () => page.getByTestId('integration-category'),
		assets: () => page.getByTestId('integration-assets'),
		configureSteps: () => page.getByTestId('integration-configure-step'),
		metricsRows: () =>
			page
				.getByTestId('integration-metrics-table')
				.locator('tbody')
				.getByRole('row'),

		connectButton: () => page.getByTestId('integration-connect-btn'),

		connect: async () => {
			await integrations.connectButton().click();
			const installed = page.waitForResponse(
				isCall('POST', `${INTEGRATIONS_API}/install`),
			);
			await page.getByTestId('integration-modal-primary-btn').click();
			return installed;
		},

		// The header and the (closed) modal both render one while installed.
		connectionStatus: () =>
			page.getByTestId('integration-connection-status').filter({ visible: true }),

		removeButton: () => page.getByTestId('integration-remove-btn'),

		remove: async () => {
			await integrations.removeButton().click();
			const removed = page.waitForResponse(
				isCall('POST', `${INTEGRATIONS_API}/uninstall`),
			);
			await page.getByTestId('integration-remove-confirm').click();
			return removed;
		},

		uninstallViaApi: async (id) => {
			await api
				.post(`${INTEGRATIONS_API}/uninstall`, { integration_id: id })
				.catch(() => undefined);
		},

		toast: (text) =>
			page.locator('[data-sonner-toast]').filter({ hasText: text }),

		unexpectedFailures: (noise) =>
			noise.failedResponses.filter((entry) => {
				const url = entry.split(' ').slice(2).join(' ');
				try {
					return !CLOUD_DETAIL_404.test(new URL(url).pathname);
				} catch {
					return true;
				}
			}),
	};

	return integrations;
}

// ─── Cloud providers ─────────────────────────────────────────────────────────

export interface AwsFlow {
	pickDeploymentRegion(label: string): Promise<void>;
	region(code: string): Locator;
	toggleRegion(code: string): Promise<void>;
	/** Fill whichever credential inputs the credentials endpoint left empty. */
	fillMissingCredentials(): Promise<void>;
	/**
	 * Submit the add-account drawer. `window.open` is replaced first, so no AWS
	 * console tab opens; the URL it was called with is returned instead.
	 */
	launch(): Promise<{
		accountId: string;
		connectionUrl: string;
		body: { config?: { aws?: { regions?: string[] } } };
	}>;
	/** Set exactly `codes` in the edit drawer and press Update Changes. */
	updateRegions(codes: string[]): Promise<Response>;
}

export interface GcpForm {
	name: string;
	projectId: string;
	/** Option text, `<label> (<value>)`. */
	region: string;
	projectIds: string[];
}

export interface GcpFlow {
	fill(form: GcpForm): Promise<void>;
	connectButton(): Locator;
	/** Resolves the create and check-in responses. */
	connect(): Promise<{ created: Response; checkedIn: Response }>;
}

export interface Cloud {
	provider: CloudProvider;
	seedAccount(providerAccountId: string, regions?: string[]): Promise<string>;
	createAccount(regions?: string[]): Promise<string>;
	checkIn(id: string, providerAccountId: string): Promise<void>;
	/** Best-effort; an empty id (nothing was created) is a no-op. */
	removeAccount(id: string): Promise<void>;
	listAccounts(): Promise<CloudAccountDto[]>;
	setService(
		id: string,
		serviceId: string,
		signals: ServiceSignals,
	): Promise<void>;

	goto(accountId?: string): Promise<void>;
	breadcrumb(): Locator;
	accountSelector(): Locator;
	integrateNowButton(): Locator;
	addAccountButton(): Locator;
	editAccountButton(): Locator;
	/** Add New Account when an account exists, Integrate Now otherwise. */
	addAccount(): Promise<void>;
	editAccount(): Promise<void>;
	services(): Locator;
	service(id: string): Locator;
	enabledSection(): Locator;
	notEnabledSection(): Locator;
	enabledService(id: string): Locator;
	notEnabledService(id: string): Locator;
	detailsTab(name: 'Overview' | 'Data Collected'): Locator;
	metricsSwitch(): Locator;
	logsSwitch(): Locator;
	saveButton(): Locator;
	discardButton(): Locator;
	/** Press Save. Resolves the service PUT. */
	saveService(): Promise<Response>;
	dashboardCards(): Locator;
	/** Only a provisioned dashboard's card is a button. */
	provisionedDashboardCards(): Locator;
	/** The title of the dashboard a card opened. */
	dashboardTitle(): Locator;
	waitingCallout(): Locator;
	/** Disconnect from the edit drawer. Resolves the DELETE. */
	disconnect(): Promise<Response>;

	aws: AwsFlow;
	gcp: GcpFlow;
}

export function cloudDriver(page: Page, provider: CloudProvider): Cloud {
	const api = apiDriver(page);
	const antd = antdDriver(page);
	const base = cloudApi(provider);

	const awsConfig = (regions: string[]): Record<string, unknown> => ({
		aws: { deploymentRegion: regions[0], regions },
	});
	const configFor = (regions: string[]): Record<string, unknown> => {
		if (provider === 'aws') {
			return awsConfig(regions);
		}
		if (provider === 'gcp') {
			return {
				gcp: {
					deploymentProjectId: 'e2e-deploy',
					deploymentRegion: 'us-central1',
					projectIds: ['e2e-deploy'],
				},
			};
		}
		return { azure: { deploymentRegion: 'eastus', resourceGroups: ['e2e-rg'] } };
	};

	const cloud: Cloud = {
		provider,

		createAccount: (regions = ['us-east-1']) =>
			api.create(`${base}/accounts`, {
				config: configFor(regions),
				credentials: E2E_CREDENTIALS,
			}),

		checkIn: async (id, providerAccountId) => {
			await api.post(`${base}/accounts/check_in`, {
				cloudIntegrationId: id,
				providerAccountId,
				data: {},
			});
		},

		seedAccount: async (providerAccountId, regions) => {
			const id = await cloud.createAccount(regions);
			await cloud.checkIn(id, providerAccountId);
			return id;
		},

		removeAccount: async (id) => {
			if (id) {
				await api.tryDel(`${base}/accounts/${id}`);
			}
		},

		listAccounts: async () =>
			(
				await api.get<{ data: { accounts: CloudAccountDto[] | null } }>(
					`${base}/accounts`,
				)
			).data.accounts ?? [],

		setService: async (id, serviceId, { metrics, logs }) => {
			await api.put(`${base}/accounts/${id}/services/${serviceId}`, {
				config: {
					[provider]: {
						metrics: { enabled: metrics },
						...(provider === 'gcp' ? {} : { logs: { enabled: logs } }),
					},
				},
			});
		},

		// `?cloudAccountId=` does not survive the load: AccountActions strips it
		// while the account list is still pending, then falls back to the first
		// account. Accounts are org-global, so pick ours in the selector.
		goto: async (accountId) => {
			await page.goto(`${INTEGRATIONS_PATH}/${provider}`);
			await expect(cloud.breadcrumb()).toBeVisible();
			if (!accountId) {
				return;
			}
			const account = (await cloud.listAccounts()).find((a) => a.id === accountId);
			const label = account?.providerAccountId;
			expect(label, `account ${accountId} is not listed`).toBeTruthy();
			const select = cloud.accountSelector();
			await expect(select).toBeVisible();
			if (!((await select.textContent()) ?? '').includes(label!)) {
				await select.click();
				const dropdown = await antd.ownDropdown(select);
				await dropdown
					.locator('.ant-select-item-option')
					.filter({ has: page.getByText(label!, { exact: true }) })
					.click();
			}
			await expect(select).toContainText(label!);
			await expect(page).toHaveURL(new RegExp(`cloudAccountId=${accountId}`));
		},

		breadcrumb: () =>
			page
				.getByTestId('cloud-header-breadcrumb')
				.getByRole('link', { name: 'Integrations' }),

		accountSelector: () => page.getByTestId('cloud-account-selector'),
		integrateNowButton: () => page.getByTestId('cloud-integrate-now-btn'),
		addAccountButton: () => page.getByTestId('cloud-add-account-btn'),
		editAccountButton: () => page.getByTestId('cloud-edit-account-btn'),

		// The form hides each credential field the credentials response fills, and
		// submits without waiting for it, so the fields are only known after it.
		addAccount: async () => {
			const credentials = page.waitForResponse(
				isCall('GET', `${base}/credentials`),
			);
			const entry = cloud.addAccountButton().or(cloud.integrateNowButton());
			await entry.click();
			await expect(page.getByRole('dialog')).toBeVisible();
			expect((await credentials).ok()).toBe(true);
		},

		editAccount: async () => {
			await cloud.editAccountButton().click();
			await expect(
				page.getByRole('dialog').filter({ hasText: 'Account Settings' }),
			).toBeVisible();
		},

		services: () => page.locator('[data-testid^="cloud-service-item-"]'),
		service: (id) => page.getByTestId(`cloud-service-item-${id}`),
		enabledSection: () => page.getByTestId('cloud-services-enabled'),
		notEnabledSection: () => page.getByTestId('cloud-services-not-enabled'),
		enabledService: (id) =>
			cloud.enabledSection().getByTestId(`cloud-service-item-${id}`),
		notEnabledService: (id) =>
			cloud.notEnabledSection().getByTestId(`cloud-service-item-${id}`),
		detailsTab: (name) => page.getByRole('tab', { name }),
		metricsSwitch: () => page.getByTestId('cloud-service-metrics-switch'),
		logsSwitch: () => page.getByTestId('cloud-service-logs-switch'),
		saveButton: () => page.getByTestId('cloud-service-save-btn'),
		discardButton: () => page.getByTestId('cloud-service-discard-btn'),

		saveService: async () => {
			const saved = page.waitForResponse(
				isCall('PUT', new RegExp(`^${base}/accounts/[^/]+/services/[^/]+$`)),
			);
			await cloud.saveButton().click();
			return saved;
		},

		dashboardCards: () =>
			page.locator('[data-testid^="cloud-service-dashboard-"]'),
		provisionedDashboardCards: () =>
			cloud.dashboardCards().and(page.getByRole('button')),
		dashboardTitle: () => page.getByTestId('dashboard-title'),

		waitingCallout: () => page.getByTestId('cloud-connect-waiting'),

		disconnect: async () => {
			await page
				.getByTestId('cloud-disconnect-account-btn')
				.dispatchEvent('click');
			const deleted = page.waitForResponse(
				isCall('DELETE', new RegExp(`^${base}/accounts/[^/]+$`)),
			);
			await page.getByTestId('cloud-remove-account-confirm').click();
			return deleted;
		},

		aws: {
			pickDeploymentRegion: async (label) => {
				const select = page.getByTestId('aws-deployment-region-select');
				await select.click();
				const dropdown = await antd.ownDropdown(select);
				await dropdown
					.locator('.ant-select-item-option')
					.filter({ has: page.getByText(label, { exact: true }) })
					.click();
				await expect(select).toContainText(label);
			},

			region: (code) => page.getByTestId(`aws-region-${code}`),

			toggleRegion: async (code) => {
				const box = cloud.aws.region(code);
				const before = await box.getAttribute('aria-checked');
				await box.click();
				await expect(box).not.toHaveAttribute('aria-checked', before ?? '');
			},

			fillMissingCredentials: async () => {
				const fields: [string, string][] = [
					['Enter ingestion URL', E2E_CREDENTIALS.ingestionUrl],
					['Enter ingestion key', E2E_CREDENTIALS.ingestionKey],
					['Enter SigNoz API URL', E2E_CREDENTIALS.sigNozApiUrl],
					['Enter SigNoz API Key', E2E_CREDENTIALS.sigNozApiKey],
				];
				for (const [placeholder, value] of fields) {
					const input = page.getByPlaceholder(placeholder, { exact: true });
					// eslint-disable-next-line no-await-in-loop
					if (await input.isVisible()) {
						// eslint-disable-next-line no-await-in-loop
						await input.fill(value);
					}
				}
			},

			launch: async () => {
				await page.evaluate(() => {
					const w = window as unknown as {
						open: (url?: string) => null;
						__e2eOpened?: string;
					};
					w.open = (url?: string): null => {
						w.__e2eOpened = String(url ?? '');
						return null;
					};
				});
				const created = page.waitForResponse(isCall('POST', `${base}/accounts`));
				await page.getByTestId('aws-launch-cfn-btn').click();
				const response = await created;
				expect(response.status(), await response.text()).toBe(201);
				const { data } = (await response.json()) as { data: { id: string } };
				const connectionUrl = await page
					.waitForFunction(
						() => (window as unknown as { __e2eOpened?: string }).__e2eOpened,
					)
					.then((handle) => handle.jsonValue() as Promise<string>);
				return {
					accountId: data.id,
					connectionUrl,
					body: response.request().postDataJSON(),
				};
			},

			updateRegions: async (codes) => {
				const boxes = page.locator('[data-testid^="aws-region-"]');
				await expect(boxes.first()).toBeVisible();
				for (const box of await boxes.all()) {
					// eslint-disable-next-line no-await-in-loop
					const testId = (await box.getAttribute('data-testid')) ?? '';
					const want = codes.includes(testId.replace('aws-region-', ''));
					// eslint-disable-next-line no-await-in-loop
					const checked = (await box.getAttribute('aria-checked')) === 'true';
					if (want !== checked) {
						// eslint-disable-next-line no-await-in-loop
						await box.click();
					}
				}
				// The drawer footer sits below the 720px viewport once the region grid
				// renders, so a coordinate click never lands.
				const updated = page.waitForResponse(
					isCall('PUT', new RegExp(`^${base}/accounts/[^/]+$`)),
				);
				await page.getByTestId('aws-update-account-btn').dispatchEvent('click');
				return updated;
			},
		},

		gcp: {
			fill: async ({ name, projectId, region, projectIds }) => {
				await page.getByTestId('gcp-account-name-input').fill(name);
				await page.getByTestId('gcp-deployment-project-id-input').fill(projectId);
				await page.getByTestId('gcp-deployment-region-select').click();
				await page.getByText(region, { exact: true }).click();
				const projects = page.locator('#gcp-project-ids-select');
				for (const id of projectIds) {
					// eslint-disable-next-line no-await-in-loop
					await projects.fill(id);
					// eslint-disable-next-line no-await-in-loop
					await projects.press('Enter');
				}
				// Escape would close the drawer itself when the tags list is shut.
				await projects.blur();
				const secrets: [string, string][] = [
					['gcp-signoz-api-url-input', E2E_CREDENTIALS.sigNozApiUrl],
					['gcp-signoz-api-key-input', E2E_CREDENTIALS.sigNozApiKey],
					['gcp-ingestion-url-input', E2E_CREDENTIALS.ingestionUrl],
					['gcp-ingestion-key-input', E2E_CREDENTIALS.ingestionKey],
				];
				for (const [testId, value] of secrets) {
					// A backend-provided secret renders read-only under the same testid.
					const input = page.locator(`input[data-testid="${testId}"]`);
					// eslint-disable-next-line no-await-in-loop
					if (await input.isVisible()) {
						// eslint-disable-next-line no-await-in-loop
						await input.fill(value);
					}
				}
			},

			connectButton: () => page.getByTestId('gcp-connect-account-btn'),

			connect: async () => {
				const created = page.waitForResponse(isCall('POST', `${base}/accounts`));
				const checkedIn = page.waitForResponse(
					isCall('POST', `${base}/accounts/check_in`),
				);
				await cloud.gcp.connectButton().click();
				return { created: await created, checkedIn: await checkedIn };
			},
		},
	};

	return cloud;
}

// ─── Layers ──────────────────────────────────────────────────────────────────

export const withIntegrations: Layer<{ integrations: Integrations }> = driver(
	'integrations',
	({ page }) => integrationsDriver(page),
);

export const withCloud: Layer<{
	cloud: (provider: CloudProvider) => Cloud;
}> = driver(
	'cloud',
	({ page }) =>
		(provider: CloudProvider) =>
			cloudDriver(page, provider),
);

export interface AwsAccountSeed {
	id: string;
	providerAccountId: string;
}

/** One checked-in AWS account per worker, with two regions. */
export const withAwsAccount: WorkerLayer<{ awsAccount: AwsAccountSeed }> =
	seeded(
		'awsAccount',
		async ({ page, workerIndex }) => {
			const providerAccountId = `e2e-aws-w${workerIndex}-${Date.now()}`;
			const id = await cloudDriver(page, 'aws').seedAccount(providerAccountId, [
				'us-east-1',
				'us-west-2',
			]);
			return { id, providerAccountId };
		},
		async ({ page, value }) => cloudDriver(page, 'aws').removeAccount(value.id),
	);

/**
 * The one built-in integration the install spec owns. Uninstalled on open and
 * on close, so a crashed run cannot leave it installed for the next.
 */
export const OWNED_INTEGRATION = 'builtin-nginx';

export const withOwnedIntegration: WorkerLayer<{ ownedIntegration: string }> =
	seeded(
		'ownedIntegration',
		async ({ page }) => {
			await integrationsDriver(page).uninstallViaApi(OWNED_INTEGRATION);
			return OWNED_INTEGRATION;
		},
		async ({ page, value }) => integrationsDriver(page).uninstallViaApi(value),
	);

/** The integrations `test`. */
export const test = withOwnedIntegration(
	withAwsAccount(withIntegrations(withCloud(kit))),
);
export { expect } from './kit';
