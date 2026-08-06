import type { Page } from '@playwright/test';

import { expect, test } from '../../../fixtures/auth';
import { newAdminContext } from '../../../helpers/auth';
import { authToken } from '../../../helpers/dashboards';
import {
	createDashboardV2ViaApi,
	dashboardV2Path,
	deleteDashboardV2ViaApi,
	panelActions,
	panelByTitle,
	section,
	sectionToggle,
	variablesBar,
	WIDE_VIEWPORT,
} from '../../../helpers/dashboards-v2';
import sectionsFixture from '../../../testdata/sections-dashboard-v2.json';

// Sections and the panels inside them, seeded from a spec trimmed out of a real V2
// dashboard: three grid sections, six panels across six plugin kinds. Assertions are
// structural — titles, membership, collapse — never chart values, so nothing here
// depends on the stack holding telemetry.

test.use({ viewport: WIDE_VIEWPORT });

const seedIds = new Set<string>();

const SECTIONS = [
	{ title: 'Query Builder', firstPanel: 'p-timeseries' },
	{ title: 'PromQL', firstPanel: 'p-promql' },
	{ title: 'Mixed', firstPanel: 'p-pie' },
];
const PANEL_TITLES = [
	'Requests over time',
	'Requests by pod',
	'Duration rate (PromQL)',
	'Total requests',
	'Split by environment',
	'Stacked by pod',
];

async function seedAndOpen(page: Page, label: string): Promise<string> {
	const id = await createDashboardV2ViaApi(
		page,
		`detail-sections-${label}-${process.env.TEST_WORKER_INDEX ?? '0'}`,
		sectionsFixture.spec,
	);
	seedIds.add(id);
	await page.goto(dashboardV2Path(id));
	await expect(variablesBar(page)).toBeVisible();
	return id;
}

test.afterAll(async ({ browser }) => {
	if (seedIds.size === 0) {
		return;
	}
	const ctx = await newAdminContext(browser);
	const page = await ctx.newPage();
	try {
		const token = await authToken(page);
		for (const id of seedIds) {
			await deleteDashboardV2ViaApi(ctx.request, id, token);
			seedIds.delete(id);
		}
	} finally {
		await ctx.close();
	}
});

test.describe('Dashboard detail — sections and panels', () => {
	test('TC-01 every section in the spec renders with its title', async ({
		authedPage: page,
	}) => {
		await seedAndOpen(page, 'render');

		for (const { title, firstPanel } of SECTIONS) {
			await expect(section(page, firstPanel)).toBeVisible();
			await expect(section(page, firstPanel)).toContainText(title);
		}
	});

	test('TC-02 every panel in the spec renders with its title', async ({
		authedPage: page,
	}) => {
		await seedAndOpen(page, 'panels');

		for (const title of PANEL_TITLES) {
			await expect(panelByTitle(page, title).first()).toBeVisible();
		}
	});

	test('TC-03 a panel belongs to the section that references it', async ({
		authedPage: page,
	}) => {
		await seedAndOpen(page, 'membership');

		// The layout puts these two in "PromQL" and nothing else there.
		const promql = section(page, 'p-promql');
		await expect(promql).toContainText('Duration rate (PromQL)');
		await expect(promql).toContainText('Total requests');
		await expect(promql).not.toContainText('Requests over time');
	});

	test('TC-04 collapsing a section hides the panels inside it', async ({
		authedPage: page,
	}) => {
		await seedAndOpen(page, 'collapse');
		await expect(panelByTitle(page, 'Requests over time').first()).toBeVisible();

		await sectionToggle(page, 'p-timeseries').click();

		await expect(panelByTitle(page, 'Requests over time').first()).toBeHidden();
		// Its neighbours are untouched.
		await expect(panelByTitle(page, 'Total requests').first()).toBeVisible();
	});

	test('TC-05 expanding a collapsed section brings its panels back', async ({
		authedPage: page,
	}) => {
		await seedAndOpen(page, 'expand');
		const toggle = sectionToggle(page, 'p-timeseries');

		await toggle.click();
		await expect(panelByTitle(page, 'Requests over time').first()).toBeHidden();

		await toggle.click();
		await expect(panelByTitle(page, 'Requests over time').first()).toBeVisible();
	});

	test('TC-06 a panel exposes its actions menu', async ({
		authedPage: page,
	}) => {
		await seedAndOpen(page, 'actions');

		await panelByTitle(page, 'Requests over time').first().hover();
		await panelActions(page, 'p-timeseries').click();

		// Assert the affordances the menu offers rather than a container testid: the one
		// in the source is not rendered on this path, and the items are what users act on.
		await expect(page.getByRole('menu')).toBeVisible();
		for (const item of ['View', 'Edit panel', 'Clone', 'Delete panel']) {
			await expect(page.getByRole('menuitem', { name: item })).toBeVisible();
		}
	});

	test('TC-07 a panel with nothing to show renders its no-data state, not an error', async ({
		authedPage: page,
	}) => {
		await seedAndOpen(page, 'nodata');

		// The seeded queries target signals this stack holds nothing for, so the panels
		// resolve empty — that must read as "no data", never as a failure.
		await expect(page.getByTestId('panel-no-data').first()).toBeVisible();
		await expect(page.getByTestId('panel-error')).toHaveCount(0);
	});
});
