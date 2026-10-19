import {
	expect,
	type Locator,
	type Page,
	type Response,
} from '@playwright/test';

import type { DashboardtypesGettablePublicDasbhboardDTO } from './schemas';
import { apiDriver } from './api';
import { dashboardsDriver, type DashboardSeed } from './dashboards';
import { driver, guestDriver, kit, type Layer } from './kit';

/**
 * Public dashboards: publishing from the dashboard's settings drawer, and the
 * logged-out page the public link opens.
 *
 * The API contract (anonymous role, filter redaction, authz) is covered by
 * `tests/integration/tests/dashboard/02_public_dashboard.py` and
 * `05_v2_public_dashboard.py`. What is left for a browser is a link published
 * in the UI rendering for a visitor with no session.
 */

export interface PublicDashboards {
	create(title: string): Promise<DashboardSeed>;
	remove(id: string): Promise<void>;
	/** Publish through the API. Resolves with the `/public/dashboard/<id>` path. */
	publish(
		id: string,
		options?: { timeRangeEnabled?: boolean; defaultTimeRange?: string },
	): Promise<string>;
	unpublish(id: string): Promise<void>;
	/** Resolves with the public path, or undefined while the dashboard is private. */
	publicPath(id: string): Promise<string | undefined>;

	/** Open the dashboard and its settings drawer on the Publish tab. */
	openPublishTab(id: string): Promise<void>;
	publishButton(): Locator;
	unpublishButton(): Locator;
	/** Click Publish and wait for the POST to land. */
	publishInUi(): Promise<void>;
	unpublishInUi(): Promise<void>;
	liveStatus(): Locator;
	privateStatus(): Locator;
	publicUrl(): Locator;
}

export function publicDashboardsDriver(page: Page): PublicDashboards {
	const api = apiDriver(page);
	const dashboards = dashboardsDriver(page);
	const publicEndpoint = (id: string): string =>
		`/api/v1/dashboards/${id}/public`;

	const isPublicCall =
		(method: string) =>
		(response: Response): boolean =>
			response.request().method() === method &&
			/^\/api\/v1\/dashboards\/[^/]+\/public$/.test(
				new URL(response.url()).pathname,
			);

	const publicDashboards: PublicDashboards = {
		create: (title) => dashboards.create(title),
		remove: (id) => dashboards.remove(id),

		publish: async (id, options = {}) => {
			await api.post(publicEndpoint(id), {
				timeRangeEnabled: options.timeRangeEnabled ?? true,
				defaultTimeRange: options.defaultTimeRange ?? '1h',
			});
			const path = await publicDashboards.publicPath(id);
			if (!path) {
				throw new Error(`dashboard ${id} has no publicPath after publishing`);
			}
			return path;
		},

		unpublish: (id) => api.tryDel(publicEndpoint(id)),

		publicPath: async (id) => {
			const res = await page.request.get(publicEndpoint(id), {
				headers: { Authorization: `Bearer ${await api.token()}` },
			});
			if (!res.ok()) {
				return undefined;
			}
			return (
				(await res.json()) as { data?: DashboardtypesGettablePublicDasbhboardDTO }
			).data?.publicPath;
		},

		openPublishTab: async (id) => {
			await dashboards.goto(id);
			await page.getByTestId('show-drawer').click();
			await page.getByRole('tab', { name: 'Publish' }).click();
			await expect(
				publicDashboards.publishButton().or(publicDashboards.unpublishButton()),
			).toBeVisible();
		},

		publishButton: () => page.getByTestId('public-dashboard-publish'),
		unpublishButton: () => page.getByTestId('public-dashboard-unpublish'),

		publishInUi: async () => {
			const saved = page.waitForResponse(isPublicCall('POST'));
			await publicDashboards.publishButton().click();
			expect((await saved).ok()).toBe(true);
		},

		unpublishInUi: async () => {
			const removed = page.waitForResponse(isPublicCall('DELETE'));
			await publicDashboards.unpublishButton().click();
			expect((await removed).ok()).toBe(true);
		},

		liveStatus: () => page.getByText('This dashboard is live'),
		privateStatus: () => page.getByText('This dashboard is private'),
		publicUrl: () => page.getByText(/\/public\/dashboard\//),
	};

	return publicDashboards;
}

/** The page a public link opens, seen by a visitor with no session. */
export interface PublicView {
	goto(publicPath: string): Promise<void>;
	title(text: string): Locator;
	unavailable(): Locator;
	sidenav(): Locator;
	settingsNavItem(): Locator;
}

export function publicViewDriver(page: Page): PublicView {
	return {
		goto: async (publicPath) => {
			await page.goto(publicPath);
		},
		title: (text) => page.getByText(text, { exact: true }),
		unavailable: () => page.getByTestId('public-dashboard-unavailable'),
		sidenav: () => page.getByTestId('sidenav'),
		settingsNavItem: () => page.getByTestId('settings-nav-item'),
	};
}

export const withPublicDashboards: Layer<{
	publicDashboards: PublicDashboards;
}> = driver('publicDashboards', ({ page }) => publicDashboardsDriver(page));

export const withPublicView: Layer<{ publicView: PublicView }> = guestDriver(
	'publicView',
	({ page }) => publicViewDriver(page),
);

/** The public-dashboard `test`. */
export const test = withPublicView(withPublicDashboards(kit));
export { expect } from './kit';
