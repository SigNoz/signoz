import { authToken } from '../helpers/common';
import type { PostableDashboardV2 } from '../helpers/dashboard-v2-spec';
import {
	createDashboardV2ViaApi,
	deleteDashboardV2ViaApi,
	gotoDashboardV2,
	gotoPanelEditor,
} from '../helpers/dashboards-v2';

import { expect, test as base } from './auth';

// Seeding fixtures for the Dashboards V2 suite.
//
// Fixture teardown runs before its dependencies, so cleanup reuses the test's
// own authenticated context — no `seedIds` set, no `afterAll`, and no second
// admin browser context (which `authedPage` being test-scoped would force).

export interface SeedApi {
	/** Create a dashboard for this test; deleted automatically when it ends. */
	seed: (dashboard: PostableDashboardV2) => Promise<string>;
	/** Seed, then open the dashboard and wait for its grid to mount. */
	seedAndOpen: (dashboard: PostableDashboardV2) => Promise<string>;
	/** Seed, then open one panel directly in the editor. */
	seedAndEdit: (
		dashboard: PostableDashboardV2,
		panelId: string,
	) => Promise<string>;
}

export const test = base.extend<{ dashboards: SeedApi }>({
	dashboards: async ({ authedPage }, use) => {
		const created: string[] = [];

		const seed = async (dashboard: PostableDashboardV2): Promise<string> => {
			const id = await createDashboardV2ViaApi(authedPage, dashboard);
			created.push(id);
			return id;
		};

		await use({
			seed,
			seedAndOpen: async (dashboard) => {
				const id = await seed(dashboard);
				await gotoDashboardV2(authedPage, id);
				return id;
			},
			seedAndEdit: async (dashboard, panelId) => {
				const id = await seed(dashboard);
				await gotoPanelEditor(authedPage, id, panelId);
				return id;
			},
		});

		if (created.length === 0) {
			return;
		}
		// Not asserted: a spec that deleted its own dashboard must not fail here.
		const token = await authToken(authedPage);
		for (const id of created) {
			await deleteDashboardV2ViaApi(authedPage.request, id, token);
		}
	},
});

export { expect };
