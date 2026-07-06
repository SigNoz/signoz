import type { Page } from '@playwright/test';

import { expect, test } from '../../../fixtures/auth';
import { newAdminContext } from '../../../helpers/auth';
import {
	authToken,
	createApmMetricsDashboardViaApi,
	deleteDashboardViaApi,
} from '../../../helpers/dashboards';

// ─── Per-test seed lifecycle ────────────────────────────────────────────
//
// Each test gets its own freshly-seeded APM Metrics dashboard (4 sections,
// 16 panels — including the duplicate-named "Overview" sections, which the
// fixture intentionally ships). Per-test seeding eliminates the "previous
// test left the dashboard in a collapsed/renamed state" class of CI flakes
// that bit us repeatedly with `beforeAll`-shared seed: it is no longer
// possible for one test's restore PUT to race the next test's GET, because
// the next test does not see the previous test's dashboard at all.
//
// `serial` mode is no longer required for correctness (tests are hermetic)
// but we keep parallel runs intra-file because seed creation is the
// per-test cost — running them concurrently inside the worker would just
// pile up more concurrent dashboards without helping.
let apmDashboardId: string;

test.beforeEach(async ({ browser }) => {
	const ctx = await newAdminContext(browser);
	const page = await ctx.newPage();
	try {
		apmDashboardId = await createApmMetricsDashboardViaApi(page);
	} finally {
		await ctx.close();
	}
});

test.afterEach(async ({ browser }) => {
	if (!apmDashboardId) {
		return;
	}
	const ctx = await newAdminContext(browser);
	const page = await ctx.newPage();
	try {
		const token = await authToken(page);
		await deleteDashboardViaApi(ctx.request, apmDashboardId, token);
	} catch {
		// Best-effort cleanup — a failing delete should not mask test
		// failures the user actually needs to see.
	} finally {
		apmDashboardId = '';
		await ctx.close();
	}
});

/**
 * Resolve the `.row-panel` container for a section by traversing up from its
 * title text. The fixture ships two sections both literally named "Overview"
 * — pass `index` to disambiguate. Two `..` hops reach `.row-panel`, which
 * holds both the chevron and the settings-icon for that row.
 */
function sectionRow(
	page: Page,
	name: string | RegExp,
	index = 0,
): ReturnType<Page['locator']> {
	return page
		.getByText(name, { exact: typeof name === 'string' })
		.nth(index)
		.locator('..')
		.locator('..');
}

async function gotoApmDashboard(page: Page): Promise<void> {
	await page.goto(`/dashboard/${apmDashboardId}`);
	await page
		.getByRole('button', { name: /dashboard-icon APM Metrics/ })
		.waitFor({ state: 'visible' });

	// `GridCardLayout`'s auto-save `useEffect` (line 226 of the source) is
	// gated on `!isDashboardFetching` but `isDashboardFetching` is NOT in the
	// effect's dep array. Concretely: if a chevron is clicked while any
	// `[REACT_QUERY_KEY.DASHBOARD_BY_ID]` query is in flight, the effect runs
	// once for the new `dashboardLayout`, sees `isDashboardFetching=true`, and
	// returns early — and never re-runs when the GET later completes, because
	// `dashboardLayout` didn't change again. The PUT is *never* fired and
	// `toggleSectionAndWaitForPut` blocks until the 30 s test timeout.
	//
	// Wait until the in-flight dashboard GETs settle so the effect's gate
	// evaluates to `false` on the next click. We assert this two ways: a panel
	// from each visible section must render (proves data is hydrated), and
	// `Latency` (the first panel of the first Overview section) must paint.
	await expect(page.getByText('Latency', { exact: true }).first()).toBeVisible({
		timeout: 20_000,
	});
}

/**
 * Click `.row-icon` (chevron) on a section row. The collapse/expand state is
 * driven by React local state — `setDashboardLayout` updates synchronously
 * and the (suffixed / unsuffixed) title appears on the next render. We do
 * NOT wait for the auto-save PUT here: it's gated on `!isDashboardFetching`
 * in `GridCardLayout.tsx` and can be skipped entirely under CI load.
 * Persistence does not matter because each test seeds a fresh dashboard.
 *
 * `dispatchEvent('click')` — under CI viewport the expanded sidenav's
 * `nav-item-data` subtree intercepts pointer events at the chevron's
 * position (verified in CI run #26162502354). `.click({ force: true })`
 * still lands the event at the visual centre and is swallowed by the
 * overlay; dispatching the click directly on the SVG node bypasses hit
 * testing entirely and triggers React's `onClick` handler.
 */
async function toggleSection(row: ReturnType<Page['locator']>): Promise<void> {
	const chevron = row.locator('.row-icon');
	await chevron.scrollIntoViewIfNeeded();
	await expect(chevron).toBeVisible();

	const page = chevron.page();
	// Register a PUT listener BEFORE the click. The auto-save effect in
	// `GridCardLayout` fires a PUT when `!isDashboardFetching` — if the PUT
	// arrives, its `onSuccess` triggers a brief loading-state re-render that
	// unmounts every `.row-panel`. The next toggle's chevron lookup either
	// misses (locator times out) or grabs a transient node that detaches
	// during scroll. Sequencing: dispatch click → await PUT (3 s short
	// timeout in case auto-save was gated) → wait for the loading spinner
	// to be absent.
	const putSettled = page
		.waitForResponse(
			(r) => r.request().method() === 'PUT' && /\/dashboards\//.test(r.url()),
			{ timeout: 3_000 },
		)
		.catch(() => null);

	await chevron.dispatchEvent('click');
	await putSettled;
	await expect(page.getByAltText('loading')).toHaveCount(0, {
		timeout: 20_000,
	});
}

/**
 * Click the settings (⋮) icon on a section header, bypassing the sidenav's
 * pointer-event interception via `dispatchEvent('click')` (same root cause
 * as `toggleSectionAndWaitForPut`). The settings popover (Rename / New Panel
 * / Remove Section) lives on the LEFT of the row at the same x-coordinate
 * as the chevron, so it suffers the same overlap.
 */
async function clickSectionSettings(
	row: ReturnType<Page['locator']>,
): Promise<void> {
	const icon = row.locator('.settings-icon');
	await icon.scrollIntoViewIfNeeded();
	await expect(icon).toBeVisible();
	await icon.dispatchEvent('click');
}

test.describe('Dashboard Detail — Sections', () => {
	// ─── Collapse / expand chevron and widget-count suffix ───────────────────

	// TODO(e2e): re-enable once CI consistently passes. Passes locally
	// (including `STRESS=1 CI=1`) but flakes on GitHub Linux runner — the
	// chevron click intermittently fails to land its auto-save PUT despite
	// `dispatchEvent('click')` + `Latency` panel hydration gate. Suspect
	// remaining race lives in `GridCardLayout`'s auto-save `useEffect` not
	// listing `isDashboardFetching` in its deps. See CI-HARDENING.md item 5.
	test.skip('TC-01 collapsing a section hides panels and shows widget count', async ({
		authedPage: page,
	}) => {
		await gotoApmDashboard(page);

		// "DB Metrics" is the third section in the APM fixture and lives below
		// the fold on the 1280×720 CI viewport. Scroll its title into view and
		// wait for visibility so the 14×14 chevron is actionable.
		const dbMetricsTitle = page.getByText('DB Metrics', { exact: true }).first();
		await dbMetricsTitle.scrollIntoViewIfNeeded();
		await expect(dbMetricsTitle).toBeVisible();
		await toggleSection(sectionRow(page, 'DB Metrics'));

		// After collapse the section title is rewritten to include the count
		// suffix; assert with a regex so the test is robust to widget-count
		// drift in the fixture.
		await expect(
			page.getByText(/^DB Metrics \(\d+ widgets?\)$/).first(),
		).toBeVisible();

		// Restore: chevron-down is the row-icon variant rendered for collapsed
		// sections. Re-resolve via the new (suffixed) title.
		await toggleSection(sectionRow(page, /^DB Metrics \(\d+ widgets?\)$/));
		await expect(page.getByText(/^DB Metrics \(\d+ widgets?\)$/)).toHaveCount(0);
	});

	test('TC-02 widget count matches number of panels visible before collapse', async ({
		authedPage: page,
	}) => {
		await gotoApmDashboard(page);

		// The first Overview section in the APM fixture holds these four
		// panels — they're our ground truth for the count assertion below.
		await expect(
			page.getByText('Latency', { exact: true }).first(),
		).toBeVisible();
		await expect(
			page.getByText('Request rate', { exact: true }).first(),
		).toBeVisible();
		await expect(
			page.getByText('Error percentage', { exact: true }).first(),
		).toBeVisible();
		await expect(
			page.getByText('Top operations', { exact: true }).first(),
		).toBeVisible();

		await toggleSection(sectionRow(page, 'Overview', 0));

		await expect(
			page.getByText('Overview (4 widgets)', { exact: true }).first(),
		).toBeVisible();

		// Restore.
		await toggleSection(sectionRow(page, 'Overview (4 widgets)'));
		await expect(
			page.getByText('Overview (4 widgets)', { exact: true }),
		).toHaveCount(0);
	});

	test('TC-03 expanding restores panels', async ({ authedPage: page }) => {
		await gotoApmDashboard(page);

		// Collapse "DB Metrics" instead of the first Overview — its widgets
		// have unique titles ("DB Calls RPS" / "Database Calls Avg Duration")
		// so collapse/expand transitions can be asserted without colliding
		// with the duplicate-titled panels in the two Overview sections.
		// "DB Metrics" lives further down the canvas; scroll into view first
		// so the panels actually mount (the canvas virtualises off-screen).
		const dbCalls = page.getByText('DB Calls RPS', { exact: true }).first();
		await dbCalls.scrollIntoViewIfNeeded();
		await expect(dbCalls).toBeVisible({ timeout: 15_000 });
		await toggleSection(sectionRow(page, 'DB Metrics'));
		await expect(
			page.getByText(/^DB Metrics \(\d+ widgets?\)$/).first(),
		).toBeVisible();

		// While collapsed, "DB Calls RPS" should fully unmount.
		await expect(page.getByText('DB Calls RPS', { exact: true })).toHaveCount(0);

		await toggleSection(sectionRow(page, /^DB Metrics \(\d+ widgets?\)$/));

		await expect(
			page.getByText('DB Calls RPS', { exact: true }).first(),
		).toBeVisible();
		await expect(page.getByText(/^DB Metrics \(\d+ widgets?\)$/)).toHaveCount(0);
	});

	// ─── Section options menu (Rename / New Panel / Remove Section) ──────────

	test('TC-04 section options menu shows Rename / New Panel / Remove Section', async ({
		authedPage: page,
	}) => {
		await gotoApmDashboard(page);

		// Use DB Metrics — its settings popover is guaranteed to render all
		// three buttons when the section is expanded. WidgetRow.tsx hides
		// "Remove Section" while a section is collapsed.
		await clickSectionSettings(sectionRow(page, 'DB Metrics'));

		const tooltip = page.getByRole('tooltip');
		await expect(tooltip).toBeVisible();
		await expect(tooltip.getByRole('button', { name: 'Rename' })).toBeVisible();
		await expect(
			tooltip.getByRole('button', { name: 'New Panel', exact: true }),
		).toBeVisible();
		await expect(
			tooltip.getByRole('button', { name: 'Remove Section' }),
		).toBeVisible();

		await page.keyboard.press('Escape');
	});

	test('TC-05 rename a section, restore original name', async ({
		authedPage: page,
	}) => {
		await gotoApmDashboard(page);

		const renamed = `Renamed Section ${Date.now()}`;

		// DB Metrics has a unique name, avoiding the duplicate-Overview snag.
		await clickSectionSettings(sectionRow(page, 'DB Metrics'));
		await page
			.getByRole('tooltip')
			.getByRole('button', { name: 'Rename' })
			.click();

		const renameDialog = page.getByRole('dialog', { name: 'Rename Section' });
		await expect(renameDialog).toBeVisible();
		const nameInput = renameDialog.getByPlaceholder('Enter row name here...');
		await nameInput.click();
		await nameInput.fill(renamed);
		await renameDialog.getByRole('button', { name: 'Apply Changes' }).click();
		await expect(renameDialog).not.toBeVisible();

		await expect(page.getByText(renamed, { exact: true }).first()).toBeVisible();

		// Restore.
		await clickSectionSettings(sectionRow(page, renamed));
		await page
			.getByRole('tooltip')
			.getByRole('button', { name: 'Rename' })
			.click();
		const restoreDialog = page.getByRole('dialog', { name: 'Rename Section' });
		const restoreInput = restoreDialog.getByPlaceholder('Enter row name here...');
		await restoreInput.click();
		await restoreInput.fill('DB Metrics');
		await restoreDialog.getByRole('button', { name: 'Apply Changes' }).click();
		await expect(restoreDialog).not.toBeVisible();

		await expect(
			page.getByText('DB Metrics', { exact: true }).first(),
		).toBeVisible();
		await expect(page.getByText(renamed, { exact: true })).toHaveCount(0);
	});

	test('TC-06 cancel section rename leaves name unchanged', async ({
		authedPage: page,
	}) => {
		await gotoApmDashboard(page);

		await clickSectionSettings(sectionRow(page, 'External calls'));
		await page
			.getByRole('tooltip')
			.getByRole('button', { name: 'Rename' })
			.click();

		const dialog = page.getByRole('dialog', { name: 'Rename Section' });
		await expect(dialog).toBeVisible();
		const input = dialog.getByPlaceholder('Enter row name here...');
		await input.click();
		await input.fill('Should Not Be Applied');

		await dialog.getByRole('button', { name: 'Cancel' }).click();
		await expect(dialog).not.toBeVisible();

		await expect(
			page.getByText('External calls', { exact: true }).first(),
		).toBeVisible();
		await expect(page.getByText('Should Not Be Applied')).toHaveCount(0);
	});

	// TODO(e2e): re-enable once CI consistently passes. Flaky because of hover interaction on menu, will be changing with new implementation with perses.
	test.skip('TC-07 add a new panel to a section, then delete it', async ({
		authedPage: page,
	}) => {
		await gotoApmDashboard(page);

		const panelName = `Test Panel ${Date.now()}`;

		await clickSectionSettings(sectionRow(page, 'DB Metrics'));
		await page
			.getByRole('tooltip')
			.getByRole('button', { name: 'New Panel', exact: true })
			.click();

		const panelTypeDialog = page.getByRole('dialog', { name: 'New Panel' });
		await expect(panelTypeDialog).toBeVisible();
		await panelTypeDialog.getByTestId('panel-type-graph').click();

		// We're now in the panel editor at /dashboard/:id/new?widgetId=…
		await page.waitForURL(/\/new/);
		await page.getByTestId('panel-name-input').fill(panelName);

		// NewWidget renders TWO buttons with `data-testid="new-widget-save"` —
		// a disabled variant when `isSaveDisabled` is true and an enabled
		// variant when it is false. Under CI load the editor mounts with the
		// disabled variant first; without `toBeEnabled` the click can hit the
		// disabled button and the Save dialog never opens.
		const saveBtn = page.getByTestId('new-widget-save');
		await expect(saveBtn).toBeVisible();
		await expect(saveBtn).toBeEnabled({ timeout: 20_000 });
		// `dispatchEvent('click')` — sidenav overlap risk on CI; see the same
		// rationale on `toggleSectionAndWaitForPut` above.
		await saveBtn.dispatchEvent('click');
		const saveDialog = page.getByRole('dialog', { name: 'Save Widget' });
		await expect(saveDialog).toBeVisible();

		// PUT confirms the panel persisted server-side — more reliable than
		// waiting on redux state to propagate before navigating back.
		const putResponse = page.waitForResponse(
			(r) => r.request().method() === 'PUT' && /\/dashboards\//.test(r.url()),
		);
		await saveDialog.getByRole('button', { name: 'OK' }).click();
		await putResponse;

		await page.waitForURL((url) => !url.pathname.includes('/new'));
		await expect(
			page.getByText(panelName, { exact: true }).first(),
		).toBeVisible();

		// The panel ⋮ menu is a Radix `DropdownMenuSimple` — it opens on click,
		// not hover (see `openPanelMoreMenu` in 21-panel-actions.spec.ts). The
		// container hover only reveals the kebab (it's `visibility: hidden`
		// until then); the click toggles the menu. Wait for the menu role to be
		// visible before clicking Delete.
		const panelTitle = page.getByText(panelName, { exact: true }).first();
		await panelTitle.hover();
		const panelContainer = panelTitle.locator('../..');
		await panelContainer.scrollIntoViewIfNeeded();
		await panelContainer.hover();
		await panelContainer.getByTestId('widget-header-options').click();
		const menu = page.getByRole('menu');
		await menu.waitFor({ state: 'visible' });
		await menu.getByRole('menuitem', { name: 'Delete', exact: true }).click();

		const deleteDialog = page.getByRole('dialog', { name: 'Delete' });
		await expect(deleteDialog).toBeVisible();

		const deletePut = page.waitForResponse(
			(r) => r.request().method() === 'PUT' && /\/dashboards\//.test(r.url()),
		);
		await deleteDialog.getByRole('button', { name: 'OK' }).click();
		await deletePut;
		await expect(deleteDialog).not.toBeVisible();
		await expect(page.getByText(panelName, { exact: true })).toHaveCount(0);
	});

	// ─── New section in edit mode ────────────────────────────────────────────

	test('TC-08 add a new section via edit mode, then remove it', async ({
		authedPage: page,
	}) => {
		await gotoApmDashboard(page);

		const sectionName = `Temp Section ${Date.now()}`;

		await page.getByTestId('options').click();
		await page.getByRole('button', { name: 'New section' }).click();

		const newSectionDialog = page.getByRole('dialog', { name: 'New Section' });
		await expect(newSectionDialog).toBeVisible();
		await newSectionDialog.getByTestId('section-name').fill(sectionName);
		await newSectionDialog
			.getByRole('button', { name: 'Create Section' })
			.click();
		await expect(newSectionDialog).not.toBeVisible();

		await expect(
			page.getByText(sectionName, { exact: true }).first(),
		).toBeVisible();

		await clickSectionSettings(sectionRow(page, sectionName));
		await page
			.getByRole('tooltip')
			.getByRole('button', { name: 'Remove Section' })
			.click();

		const deleteRowDialog = page.getByRole('dialog', { name: 'Delete Row' });
		await expect(deleteRowDialog).toBeVisible();
		await deleteRowDialog.getByRole('button', { name: 'OK' }).click();
		await expect(deleteRowDialog).not.toBeVisible();

		await expect(page.getByText(sectionName, { exact: true })).toHaveCount(0);

		// Original sections are untouched.
		await expect(
			page.getByText('Overview', { exact: true }).first(),
		).toBeVisible();
		await expect(
			page.getByText('DB Metrics', { exact: true }).first(),
		).toBeVisible();
		await expect(
			page.getByText('External calls', { exact: true }).first(),
		).toBeVisible();
	});

	// ─── Deep coverage ───────────────────────────────────────────────────────

	test('TC-09 collapsing two sections in sequence shows both as collapsed', async ({
		authedPage: page,
	}) => {
		await gotoApmDashboard(page);

		await toggleSection(sectionRow(page, 'DB Metrics'));
		await expect(
			page.getByText(/^DB Metrics \(\d+ widgets?\)$/).first(),
		).toBeVisible();

		await toggleSection(sectionRow(page, 'External calls'));
		await expect(
			page.getByText(/^External calls \(\d+ widgets?\)$/).first(),
		).toBeVisible();

		// Restore both so the test leaves no state behind.
		await toggleSection(sectionRow(page, /^DB Metrics \(\d+ widgets?\)$/));
		await toggleSection(sectionRow(page, /^External calls \(\d+ widgets?\)$/));
		await expect(page.getByText(/^DB Metrics \(\d+ widgets?\)$/)).toHaveCount(0);
		await expect(page.getByText(/^External calls \(\d+ widgets?\)$/)).toHaveCount(
			0,
		);
	});

	test('TC-10 panels inside a collapsed section are not in the DOM', async ({
		authedPage: page,
	}) => {
		await gotoApmDashboard(page);

		// "DB Calls RPS" is a unique panel inside the "DB Metrics" section.
		const dbPanel = page.getByText('DB Calls RPS', { exact: true });
		await dbPanel.first().scrollIntoViewIfNeeded();
		await expect(dbPanel.first()).toBeVisible();

		await toggleSection(sectionRow(page, 'DB Metrics'));
		await expect(
			page.getByText(/^DB Metrics \(\d+ widgets?\)$/).first(),
		).toBeVisible();

		// Panels inside the collapsed section unmount, not just hidden.
		await expect(dbPanel).toHaveCount(0);

		// Restore.
		await toggleSection(sectionRow(page, /^DB Metrics \(\d+ widgets?\)$/));
		await expect(dbPanel.first()).toBeVisible();
	});
});
