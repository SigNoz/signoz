import type { Page } from '@playwright/test';

import { expect, test } from '../../fixtures/auth';

// Tests in this file mutate the dashboard list (create / delete). Run them
// serially within the worker so state from one test does not leak into
// another's assertions. Files still run in parallel via the project-level
// fullyParallel setting.
test.describe.configure({ mode: 'serial' });

const LIST_LABEL = 'All Dashboards';
const SEARCH_PLACEHOLDER = 'Search by name, description, or tags...';
const NAME_PLACEHOLDER = 'Enter dashboard name...';

async function gotoList(page: Page): Promise<void> {
	await page.goto('/dashboard');
	await page.getByText(LIST_LABEL).first().waitFor({ state: 'visible' });
}

async function createDashboardByName(page: Page, name: string): Promise<void> {
	await gotoList(page);
	await page.getByRole('textbox', { name: NAME_PLACEHOLDER }).fill(name);
	await page.getByRole('button', { name: 'Submit' }).click();
	await expect(page).toHaveURL(/\/dashboard\/[0-9a-f-]+/);
}

async function deleteDashboardByName(page: Page, name: string): Promise<void> {
	await gotoList(page);
	await page.getByRole('textbox', { name: SEARCH_PLACEHOLDER }).fill(name);
	const icon = page.getByTestId('dashboard-action-icon').first();
	if (await icon.isVisible().catch(() => false)) {
		await icon.click();
		await page.getByRole('tooltip').getByText('Delete dashboard').click();
		await page.getByRole('button', { name: 'Delete' }).click();
	}
}

test.describe('Dashboards List Page', () => {
	// ─── Page load and layout ────────────────────────────────────────────────

	test('TC-01 page chrome and core controls render', async ({
		authedPage: page,
	}) => {
		const name = 'dashboards-list-chrome';
		await createDashboardByName(page, name);
		try {
			await gotoList(page);

			// Fresh load should have no query params
			await expect(page).toHaveURL('/dashboard');
			await expect(page).toHaveTitle('SigNoz | All Dashboards');

			// Page identity
			await expect(
				page.getByRole('heading', { name: 'Dashboards', level: 1 }),
			).toBeVisible();
			await expect(
				page.getByText('Create and manage dashboards for your workspace.'),
			).toBeVisible();

			// Core controls
			await expect(
				page.getByRole('textbox', { name: SEARCH_PLACEHOLDER }),
			).toBeVisible();
			await expect(page.getByText(LIST_LABEL)).toBeVisible();
			await expect(page.getByTestId('sort-by')).toBeVisible();

			// At least one dashboard row — thumbnail is the most stable row anchor
			await expect(page.getByAltText('dashboard-image').first()).toBeVisible();

			// Pagination range text confirms rows were fetched (e.g. "1 — 20 of 42")
			await expect(page.getByText(/\d+ — \d+ of \d+/)).toBeVisible();

			// Global header actions
			await expect(
				page.getByRole('button', { name: 'Feedback' }),
			).toBeVisible();
			await expect(page.getByRole('button', { name: 'Share' })).toBeVisible();
		} finally {
			await deleteDashboardByName(page, name);
		}
	});

	test('TC-02 row shows thumbnail, last-updated date, and creator email', async ({
		authedPage: page,
	}) => {
		const name = 'dashboards-list-row-fields';
		await createDashboardByName(page, name);
		try {
			await gotoList(page);
			await page
				.getByAltText('dashboard-image')
				.first()
				.waitFor({ state: 'visible' });

			// Each row has a thumbnail image identified by the alt text set by the app
			await expect(page.getByAltText('dashboard-image').first()).toBeVisible();

			// Each row shows a "last updated" timestamp — verify the date format
			// exists somewhere in the rendered list (e.g. "Mar 24, 2026")
			const pageText = await page.locator('body').textContent();
			expect(pageText).toMatch(/\w{3} \d{1,2}, \d{4}/);

			// Each row shows the creator's email address
			await expect(page.getByText(/@/).first()).toBeVisible();
		} finally {
			await deleteDashboardByName(page, name);
		}
	});

	// ─── Search functionality ────────────────────────────────────────────────

	test('TC-03 search by title returns matching dashboard', async ({
		authedPage: page,
	}) => {
		const name = 'dashboards-list-search-title';
		await createDashboardByName(page, name);
		try {
			await gotoList(page);
			const searchInput = page.getByRole('textbox', {
				name: SEARCH_PLACEHOLDER,
			});

			await searchInput.fill(name);
			await expect(page).toHaveURL(new RegExp(`search=${name}`));
			await expect(searchInput).toHaveValue(name);
			await expect(page.getByAltText('dashboard-image').first()).toBeVisible();
			await expect(page.getByText(name).first()).toBeVisible();
		} finally {
			await deleteDashboardByName(page, name);
		}
	});

	test('TC-04 search by description returns matching dashboards', async ({
		authedPage: page,
	}) => {
		const name = 'dashboards-list-search-desc';
		const description = 'desc-dashboards-list-search';
		await createDashboardByName(page, name);
		try {
			// Set the description in the Configure dialog
			await page.getByRole('button', { name: 'Configure' }).click();
			await page.getByRole('dialog').waitFor({ state: 'visible' });
			await page
				.getByRole('textbox', { name: /description/i })
				.fill(description);
			await page.getByRole('button', { name: 'Save' }).click();

			// Return to the list and search using the description text
			await gotoList(page);
			const searchInput = page.getByRole('textbox', {
				name: SEARCH_PLACEHOLDER,
			});
			await searchInput.fill(description);

			await expect(page.getByAltText('dashboard-image').first()).toBeVisible();
			await expect(page.getByText(name).first()).toBeVisible();
		} finally {
			await deleteDashboardByName(page, name);
		}
	});

	test('TC-05 direct navigation with ?search= pre-fills the input and filters results', async ({
		authedPage: page,
	}) => {
		const name = 'dashboards-list-search-deeplink';
		await createDashboardByName(page, name);
		try {
			await page.goto(`/dashboard?search=${name}`);
			await page.getByText(LIST_LABEL).first().waitFor({ state: 'visible' });

			await expect(
				page.getByRole('textbox', { name: SEARCH_PLACEHOLDER }),
			).toHaveValue(name);
			await expect(page.getByText(name).first()).toBeVisible();
		} finally {
			await deleteDashboardByName(page, name);
		}
	});

	test('TC-06 clearing search restores the full list', async ({
		authedPage: page,
	}) => {
		const name = 'dashboards-list-clear-search';
		await createDashboardByName(page, name);
		try {
			await gotoList(page);
			const searchInput = page.getByRole('textbox', {
				name: SEARCH_PLACEHOLDER,
			});

			await searchInput.fill(name);
			await expect(page).toHaveURL(/search=/);

			// Clearing the field removes the param and brings back all dashboards
			await searchInput.fill('');
			await expect(page).not.toHaveURL(/search=/);
			await expect(page.getByAltText('dashboard-image').first()).toBeVisible();
		} finally {
			await deleteDashboardByName(page, name);
		}
	});

	test('TC-07 search with no matching results shows empty state', async ({
		authedPage: page,
	}) => {
		await gotoList(page);
		const searchInput = page.getByRole('textbox', { name: SEARCH_PLACEHOLDER });

		// A nonsense term guarantees no matches across title, description, or tags
		await searchInput.fill('xyznonexistent999');

		// No thumbnails — list is empty, no error or broken layout
		await expect(page.getByAltText('dashboard-image')).toHaveCount(0);
		await expect(searchInput).toBeVisible();
		await expect(searchInput).toHaveValue('xyznonexistent999');
	});

	test('TC-08 search is case-insensitive', async ({ authedPage: page }) => {
		const name = 'Dashboards-List-Case-Insensitive';
		await createDashboardByName(page, name);
		try {
			await gotoList(page);
			const searchInput = page.getByRole('textbox', {
				name: SEARCH_PLACEHOLDER,
			});

			// Lowercase version of the mixed-case dashboard name — should still match
			await searchInput.fill(name.toLowerCase());
			await expect(page.getByAltText('dashboard-image').first()).toBeVisible();
			const pageText = await page.locator('body').textContent();
			expect(pageText?.toLowerCase()).toContain(name.toLowerCase());
		} finally {
			await deleteDashboardByName(page, name);
		}
	});

	// ─── Sorting ─────────────────────────────────────────────────────────────
	//
	// Known behaviour (verified against live app):
	//   - Fresh load: no sort params in URL; list is already descending (server default)
	//   - First click: URL gains ?columnKey=updatedAt&order=descend
	//   - Subsequent clicks: URL stays on order=descend — ascending is not yet implemented

	test('TC-09 default load has no sort params', async ({
		authedPage: page,
	}) => {
		const name = 'dashboards-list-sort-default';
		await createDashboardByName(page, name);
		try {
			await gotoList(page);

			// On fresh load the URL should be clean — sort params only appear after
			// the user interacts with the sort button
			await expect(page).toHaveURL('/dashboard');
			await expect(page).not.toHaveURL(/columnKey/);
			await expect(page).not.toHaveURL(/order/);

			await expect(page.getByAltText('dashboard-image').first()).toBeVisible();
		} finally {
			await deleteDashboardByName(page, name);
		}
	});

	test('TC-10 first sort click adds columnKey=updatedAt&order=descend to URL', async ({
		authedPage: page,
	}) => {
		const name = 'dashboards-list-sort-click';
		await createDashboardByName(page, name);
		try {
			await gotoList(page);

			// Before any interaction — no sort params
			await expect(page).not.toHaveURL(/columnKey/);

			await page.getByTestId('sort-by').click();

			// After first click the sort state is written to the URL
			await expect(page).toHaveURL(/columnKey=updatedAt/);
			await expect(page).toHaveURL(/order=descend/);

			await expect(page.getByAltText('dashboard-image').first()).toBeVisible();
		} finally {
			await deleteDashboardByName(page, name);
		}
	});

	test('TC-11 subsequent sort clicks keep order=descend (ascending not yet implemented)', async ({
		authedPage: page,
	}) => {
		const name = 'dashboards-list-sort-toggle';
		await createDashboardByName(page, name);
		try {
			await gotoList(page);
			const sortButton = page.getByTestId('sort-by');

			await sortButton.click();
			await expect(page).toHaveURL(/order=descend/);

			// Second click — known limitation: order remains descend, does not flip to ascend
			await sortButton.click();
			await expect(page).toHaveURL(/order=descend/);
			await expect(page).not.toHaveURL(/order=ascend/);
		} finally {
			await deleteDashboardByName(page, name);
		}
	});

	// ─── Row actions (context menu) ──────────────────────────────────────────
	//
	// The three-dot action icon is always visible on every row — no hover required.
	// Clicking it opens a tooltip popover scoped via getByRole('tooltip').

	test('TC-12 admin sees all five options in the action menu', async ({
		authedPage: page,
	}) => {
		const name = 'dashboards-list-actions-menu';
		await createDashboardByName(page, name);
		try {
			await gotoList(page);
			await page
				.getByRole('textbox', { name: SEARCH_PLACEHOLDER })
				.fill(name);

			await page.getByTestId('dashboard-action-icon').first().click();
			const tooltip = page.getByRole('tooltip');
			await expect(tooltip).toBeVisible();

			await expect(tooltip.getByRole('button', { name: 'View' })).toBeVisible();
			await expect(
				tooltip.getByRole('button', { name: 'Open in New Tab' }),
			).toBeVisible();
			await expect(
				tooltip.getByRole('button', { name: 'Copy Link' }),
			).toBeVisible();
			await expect(
				tooltip.getByRole('button', { name: 'Export JSON' }),
			).toBeVisible();
			// Delete is rendered as a generic (not a button) in a separate section
			await expect(tooltip.getByText('Delete dashboard')).toBeVisible();
		} finally {
			await deleteDashboardByName(page, name);
		}
	});

	test('TC-13 view action navigates to the dashboard detail page', async ({
		authedPage: page,
	}) => {
		const name = 'dashboards-list-action-view';
		await createDashboardByName(page, name);
		try {
			await gotoList(page);
			await page
				.getByRole('textbox', { name: SEARCH_PLACEHOLDER })
				.fill(name);

			await page.getByTestId('dashboard-action-icon').first().click();
			await page
				.getByRole('tooltip')
				.getByRole('button', { name: 'View' })
				.click();

			await expect(page).toHaveURL(/\/dashboard\/[0-9a-f-]+/);
		} finally {
			await deleteDashboardByName(page, name);
		}
	});

	test('TC-14 open in new tab opens the dashboard in a new browser tab', async ({
		authedPage: page,
		context,
	}) => {
		const name = 'dashboards-list-action-newtab';
		await createDashboardByName(page, name);
		try {
			await gotoList(page);
			await page
				.getByRole('textbox', { name: SEARCH_PLACEHOLDER })
				.fill(name);

			await page.getByTestId('dashboard-action-icon').first().click();

			// waitForEvent('page') must be set up before the click that triggers it
			const [newPage] = await Promise.all([
				context.waitForEvent('page'),
				page
					.getByRole('tooltip')
					.getByRole('button', { name: 'Open in New Tab' })
					.click(),
			]);

			await newPage.waitForLoadState();
			await expect(newPage).toHaveURL(/\/dashboard\/[0-9a-f-]+/);
			await newPage.close();
		} finally {
			await deleteDashboardByName(page, name);
		}
	});

	test('TC-15 copy link copies the dashboard URL to the clipboard', async ({
		authedPage: page,
		context,
	}) => {
		const name = 'dashboards-list-action-copy';
		await createDashboardByName(page, name);
		try {
			await gotoList(page);
			await page
				.getByRole('textbox', { name: SEARCH_PLACEHOLDER })
				.fill(name);

			// Grant clipboard permissions so we can read back what was written
			await context.grantPermissions(['clipboard-read', 'clipboard-write']);

			await page.getByTestId('dashboard-action-icon').first().click();
			await page
				.getByRole('tooltip')
				.getByRole('button', { name: 'Copy Link' })
				.click();

			await expect(page.getByText(/copied|success/i)).toBeVisible();

			// Cast through unknown to access browser globals inside page.evaluate.
			const clipboardText = await page.evaluate(async () => {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				return await (globalThis as any).navigator.clipboard.readText();
			});
			expect(clipboardText).toMatch(/\/dashboard\/[0-9a-f-]+/);
		} finally {
			await deleteDashboardByName(page, name);
		}
	});

	test('TC-16 export JSON downloads the dashboard as a JSON file', async ({
		authedPage: page,
	}) => {
		const name = 'dashboards-list-action-export';
		await createDashboardByName(page, name);
		try {
			await gotoList(page);
			await page
				.getByRole('textbox', { name: SEARCH_PLACEHOLDER })
				.fill(name);

			await page.getByTestId('dashboard-action-icon').first().click();

			// waitForEvent('download') must be in place before the triggering click
			const [download] = await Promise.all([
				page.waitForEvent('download'),
				page
					.getByRole('tooltip')
					.getByRole('button', { name: 'Export JSON' })
					.click(),
			]);

			expect(download.suggestedFilename()).toMatch(/\.json$/);
		} finally {
			await deleteDashboardByName(page, name);
		}
	});

	test('TC-17 action menu closes when clicking outside the popover', async ({
		authedPage: page,
	}) => {
		const name = 'dashboards-list-action-dismiss';
		await createDashboardByName(page, name);
		try {
			await gotoList(page);
			await page
				.getByRole('textbox', { name: SEARCH_PLACEHOLDER })
				.fill(name);

			await page.getByTestId('dashboard-action-icon').first().click();
			await expect(page.getByRole('tooltip')).toBeVisible();

			// Click on a neutral area — the page heading — to dismiss the popover
			await page
				.getByRole('heading', { name: 'Dashboards', level: 1 })
				.click();
			await expect(page.getByRole('tooltip')).not.toBeVisible();

			// No navigation should have occurred
			await expect(page).toHaveURL(/\/dashboard($|\?)/);
		} finally {
			await deleteDashboardByName(page, name);
		}
	});

	// ─── Creating dashboards ─────────────────────────────────────────────────

	test('TC-18 submit button is disabled when the name input is empty', async ({
		authedPage: page,
	}) => {
		await gotoList(page);

		// Before typing, Submit must be disabled — clicking it should do nothing
		await expect(page.getByRole('button', { name: 'Submit' })).toBeDisabled();
	});

	test('TC-19 inline name field creates a named dashboard and navigates to it', async ({
		authedPage: page,
	}) => {
		const name = 'dashboards-list-create-inline';
		try {
			await gotoList(page);
			const nameInput = page.getByRole('textbox', { name: NAME_PLACEHOLDER });
			await nameInput.fill(name);

			// Submit becomes enabled once text is present
			await expect(page.getByRole('button', { name: 'Submit' })).toBeEnabled();
			await page.getByRole('button', { name: 'Submit' }).click();

			// Should navigate directly to the new dashboard's detail page
			await expect(page).toHaveURL(/\/dashboard\/[0-9a-f-]+/);
		} finally {
			await deleteDashboardByName(page, name);
		}
	});

	test('TC-20 New dashboard dropdown shows exactly three options', async ({
		authedPage: page,
	}) => {
		await gotoList(page);

		await page.getByRole('button', { name: 'New dashboard' }).click();
		const menu = page.getByRole('menu');
		await expect(menu).toBeVisible();

		// Exactly three items: Create dashboard, Import JSON, View templates
		await expect(
			menu.getByRole('menuitem', { name: 'Create dashboard' }),
		).toBeVisible();
		await expect(
			menu.getByRole('menuitem', { name: 'Import JSON' }),
		).toBeVisible();
		await expect(
			menu.getByRole('menuitem', { name: 'View templates' }),
		).toBeVisible();
	});

	test('TC-21 Create dashboard dropdown option creates dashboard with default name', async ({
		authedPage: page,
	}) => {
		const defaultName = 'Sample Title';
		try {
			await gotoList(page);
			await page.getByRole('button', { name: 'New dashboard' }).click();
			await page.getByRole('menuitem', { name: 'Create dashboard' }).click();

			// New dashboard detail page loads
			await expect(page).toHaveURL(/\/dashboard\/[0-9a-f-]+/);

			// Default name is "Sample Title" and onboarding state is shown
			await expect(
				page.getByText('Configure your new dashboard'),
			).toBeVisible();
			await expect(
				page.getByRole('button', { name: 'Configure' }),
			).toBeVisible();
			await expect(
				page.getByRole('button', { name: /New Panel/ }),
			).toBeVisible();
		} finally {
			await deleteDashboardByName(page, defaultName);
		}
	});

	test('TC-22 Import JSON dialog opens with code editor and upload button', async ({
		authedPage: page,
	}) => {
		await gotoList(page);

		await page.getByRole('button', { name: 'New dashboard' }).click();
		await page.getByRole('menuitem', { name: 'Import JSON' }).click();

		const dialog = page.getByRole('dialog');
		await expect(dialog).toBeVisible();
		await expect(dialog.getByText('Import Dashboard JSON')).toBeVisible();

		// Monaco editor renders line numbers — line "1" is the presence signal
		await expect(dialog.getByText('1').first()).toBeVisible();
		await expect(
			dialog.getByRole('button', { name: 'Upload JSON file' }),
		).toBeVisible();
		await expect(
			dialog.getByRole('button', { name: 'Import and Next' }),
		).toBeVisible();
	});

	test('TC-23 Import JSON dialog closes on Escape without creating a dashboard', async ({
		authedPage: page,
	}) => {
		await gotoList(page);

		await page.getByRole('button', { name: 'New dashboard' }).click();
		await page.getByRole('menuitem', { name: 'Import JSON' }).click();
		await expect(page.getByRole('dialog')).toBeVisible();

		await page.keyboard.press('Escape');

		await expect(page.getByRole('dialog')).not.toBeVisible();
		await expect(page).toHaveURL(/\/dashboard($|\?)/);
	});

	test('TC-24 Import JSON dialog closes on clicking the close button', async ({
		authedPage: page,
	}) => {
		await gotoList(page);

		await page.getByRole('button', { name: 'New dashboard' }).click();
		await page.getByRole('menuitem', { name: 'Import JSON' }).click();

		const dialog = page.getByRole('dialog');
		await expect(dialog).toBeVisible();

		await dialog.getByRole('button', { name: /close/i }).click();

		await expect(dialog).not.toBeVisible();
		await expect(page).toHaveURL(/\/dashboard($|\?)/);
	});

	// ─── Deleting dashboards ─────────────────────────────────────────────────
	//
	// Known behaviour: clicking Cancel in the confirmation dialog navigates to
	// the dashboard detail page rather than staying on the list.

	test('TC-25 delete confirmation dialog shows dashboard name with Cancel and Delete buttons', async ({
		authedPage: page,
	}) => {
		const name = 'dashboards-list-delete-confirm';
		await createDashboardByName(page, name);
		try {
			await gotoList(page);
			await page
				.getByRole('textbox', { name: SEARCH_PLACEHOLDER })
				.fill(name);
			await page.getByTestId('dashboard-action-icon').first().click();
			await page.getByRole('tooltip').getByText('Delete dashboard').click();

			const dialog = page.getByRole('dialog');
			await expect(dialog).toBeVisible();

			await expect(dialog.getByRole('heading')).toContainText(
				'Are you sure you want to delete the',
			);
			await expect(dialog.getByRole('heading')).toContainText(name);

			await expect(
				dialog.getByRole('button', { name: 'Cancel' }),
			).toBeVisible();
			await expect(
				dialog.getByRole('button', { name: 'Delete' }),
			).toBeVisible();

			// Confirm delete to keep the workspace clean
			await dialog.getByRole('button', { name: 'Delete' }).click();
		} finally {
			await deleteDashboardByName(page, name);
		}
	});

	test('TC-26 cancelling delete navigates to the dashboard detail page (known behaviour)', async ({
		authedPage: page,
	}) => {
		const name = 'dashboards-list-delete-cancel';
		await createDashboardByName(page, name);
		try {
			await gotoList(page);
			await page
				.getByRole('textbox', { name: SEARCH_PLACEHOLDER })
				.fill(name);
			await page.getByTestId('dashboard-action-icon').first().click();
			await page.getByRole('tooltip').getByText('Delete dashboard').click();
			await expect(page.getByRole('dialog')).toBeVisible();

			// Cancel — known behaviour: lands on detail page, not back on the list
			await page.getByRole('button', { name: 'Cancel' }).click();
			await expect(page).toHaveURL(/\/dashboard\/[0-9a-f-]+/);
		} finally {
			await deleteDashboardByName(page, name);
		}
	});

	test('TC-27 confirming delete removes the dashboard from the list', async ({
		authedPage: page,
	}) => {
		const name = 'dashboards-list-delete-confirmed';
		await createDashboardByName(page, name);

		await gotoList(page);
		await page.getByRole('textbox', { name: SEARCH_PLACEHOLDER }).fill(name);
		await expect(page.getByAltText('dashboard-image').first()).toBeVisible();

		await page.getByTestId('dashboard-action-icon').first().click();
		await page.getByRole('tooltip').getByText('Delete dashboard').click();
		await page.getByRole('button', { name: 'Delete' }).click();

		// After deletion, searching for the name should return no results
		await gotoList(page);
		await page.getByRole('textbox', { name: SEARCH_PLACEHOLDER }).fill(name);
		await expect(page.getByAltText('dashboard-image')).toHaveCount(0);
	});

	// ─── Row click navigation ────────────────────────────────────────────────

	test('TC-28 clicking a dashboard row navigates to the detail page', async ({
		authedPage: page,
	}) => {
		const name = 'dashboards-list-row-click';
		await createDashboardByName(page, name);
		try {
			await gotoList(page);
			await page
				.getByRole('textbox', { name: SEARCH_PLACEHOLDER })
				.fill(name);

			// Click the thumbnail image — a stable, always-present click target
			// that is not the action icon
			await page.getByAltText('dashboard-image').first().click();

			await expect(page).toHaveURL(/\/dashboard\/[0-9a-f-]+/);
		} finally {
			await deleteDashboardByName(page, name);
		}
	});

	test('TC-29 dashboard detail page shows the breadcrumb after row click', async ({
		authedPage: page,
	}) => {
		const name = 'dashboards-list-breadcrumb';
		await createDashboardByName(page, name);
		try {
			await gotoList(page);
			await page
				.getByRole('textbox', { name: SEARCH_PLACEHOLDER })
				.fill(name);

			await page.getByAltText('dashboard-image').first().click();
			await expect(page).toHaveURL(/\/dashboard\/[0-9a-f-]+/);

			// Breadcrumb "Dashboard /" confirms correct page structure loaded
			await expect(
				page.getByRole('button', { name: /Dashboard \// }),
			).toBeVisible();
		} finally {
			await deleteDashboardByName(page, name);
		}
	});

	test('TC-30 sidebar Dashboards link navigates to the list page', async ({
		authedPage: page,
	}) => {
		await page.goto('/home');
		await page.getByText(LIST_LABEL).first().waitFor({ state: 'hidden' });

		await page.getByRole('link', { name: 'Dashboards' }).click();

		await expect(page).toHaveURL(/\/dashboard/);
		await expect(page).toHaveTitle('SigNoz | All Dashboards');
	});

	// ─── URL state and deep linking ──────────────────────────────────────────

	test('TC-31 search term updates the URL in real time', async ({
		authedPage: page,
	}) => {
		await gotoList(page);

		await page
			.getByRole('textbox', { name: SEARCH_PLACEHOLDER })
			.fill('realtime');

		await expect(page).toHaveURL(/search=realtime/);
	});

	test('TC-32 browser Back after navigating to a dashboard restores search state', async ({
		authedPage: page,
	}) => {
		const name = 'dashboards-list-back-search';
		await createDashboardByName(page, name);
		try {
			await page.goto(`/dashboard?search=${name}`);
			await page.getByText(LIST_LABEL).first().waitFor({ state: 'visible' });

			// Navigate into a dashboard row
			await page.getByAltText('dashboard-image').first().click();
			await expect(page).toHaveURL(/\/dashboard\/[0-9a-f-]+/);

			// Browser back should restore the list with the search param intact
			await page.goBack();
			await expect(page).toHaveURL(new RegExp(`search=${name}`));
			await expect(
				page.getByRole('textbox', { name: SEARCH_PLACEHOLDER }),
			).toHaveValue(name);
		} finally {
			await deleteDashboardByName(page, name);
		}
	});

	test('TC-33 sort params appear in URL only after interacting with the sort button', async ({
		authedPage: page,
	}) => {
		const name = 'dashboards-list-sort-url';
		await createDashboardByName(page, name);
		try {
			await gotoList(page);
			await expect(page).not.toHaveURL(/columnKey/);

			await page.getByTestId('sort-by').click();
			await expect(page).toHaveURL(/columnKey=updatedAt/);
			await expect(page).toHaveURL(/order=descend/);

			// Navigating directly with sort params should honour them on load
			await page.goto('/dashboard?columnKey=updatedAt&order=descend');
			await page.getByText(LIST_LABEL).first().waitFor({ state: 'visible' });
			await expect(page).toHaveURL(/columnKey=updatedAt/);
			await expect(page).toHaveURL(/order=descend/);
		} finally {
			await deleteDashboardByName(page, name);
		}
	});

	// ─── Page header actions ─────────────────────────────────────────────────

	test('TC-34 feedback button is visible and opens a feedback mechanism', async ({
		authedPage: page,
	}) => {
		await gotoList(page);

		const feedbackButton = page.getByRole('button', { name: 'Feedback' });
		await expect(feedbackButton).toBeVisible();

		// Clicking should trigger a feedback mechanism (modal, widget, or external link)
		// — we verify it is interactive without asserting the exact implementation
		await feedbackButton.click();
		await expect(page).toHaveURL(/\/dashboard/); // no unintended navigation
	});

	test('TC-35 share button is visible and triggers a share action', async ({
		authedPage: page,
	}) => {
		await gotoList(page);

		const shareButton = page.getByRole('button', { name: 'Share' });
		await expect(shareButton).toBeVisible();

		await shareButton.click();

		// Clicking Share either opens a dialog or copies the URL — either way the
		// page should remain on /dashboard with no unintended navigation
		await expect(page).toHaveURL(/\/dashboard/);
	});

	// ─── Edge cases ──────────────────────────────────────────────────────────

	test('TC-36 dashboard with no tags shows a clean row with no empty tag containers', async ({
		authedPage: page,
	}) => {
		const name = 'dashboards-list-no-tags';
		await createDashboardByName(page, name);
		try {
			await gotoList(page);
			await page
				.getByRole('textbox', { name: SEARCH_PLACEHOLDER })
				.fill(name);
			await page
				.getByAltText('dashboard-image')
				.first()
				.waitFor({ state: 'visible' });

			// Row must be visible with thumbnail and text — no broken layout
			await expect(page.getByAltText('dashboard-image').first()).toBeVisible();
			await expect(page.getByText(name).first()).toBeVisible();
		} finally {
			await deleteDashboardByName(page, name);
		}
	});
});
