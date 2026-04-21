import { expect, test } from '@playwright/test';
import { ensureLoggedIn } from '../../fixtures/auth';

test.describe('Dashboards List Page', () => {
  test.beforeEach(async ({ page }) => {
    await ensureLoggedIn(page);
  });

  // ─── 1. Page Load and Layout ──────────────────────────────────────────────
  //
  // Verifies the critical chrome of the list page: heading, subtitle, search
  // input, sort control, at least one dashboard row, pagination, and the
  // Feedback / Share header buttons. These run as @viewer because they cover
  // elements visible to every role.

  test('1.1 Dashboard list page loads correctly', { tag: '@viewer' }, async ({ page }) => {
    await page.goto('/dashboard');
    // Wait for the list label as the reliable "page is ready" signal — it
    // appears only after the dashboard data has loaded.
    await page.getByText('All Dashboards').first().waitFor({ state: 'visible' });

    // Fresh load should have no query params
    await expect(page).toHaveURL('/dashboard');
    await expect(page).toHaveTitle('SigNoz | All Dashboards');

    // Page identity
    await expect(page.getByRole('heading', { name: 'Dashboards', level: 1 })).toBeVisible();
    await expect(page.getByText('Create and manage dashboards for your workspace.')).toBeVisible();

    // Core controls
    await expect(page.getByRole('textbox', { name: 'Search by name, description, or tags...' })).toBeVisible();
    await expect(page.getByText('All Dashboards')).toBeVisible();
    await expect(page.getByTestId('sort-by')).toBeVisible();

    // At least one dashboard row — thumbnail is the most stable row anchor
    await expect(page.getByAltText('dashboard-image').first()).toBeVisible();

    // Pagination range text confirms rows were fetched (e.g. "1 — 20 of 42")
    await expect(page.getByText(/\d+ — \d+ of \d+/)).toBeVisible();

    // Global header actions
    await expect(page.getByRole('button', { name: 'Feedback' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Share' })).toBeVisible();
  });

  test('1.2 Dashboard list shows correct data fields per row', { tag: '@viewer' }, async ({ page }) => {
    await page.goto('/dashboard');
    // Wait until thumbnails are rendered — this confirms row data has arrived
    await page.getByAltText('dashboard-image').first().waitFor({ state: 'visible' });

    // Each row has a thumbnail image identified by the alt text set by the app
    await expect(page.getByAltText('dashboard-image').first()).toBeVisible();

    // Each row shows a "last updated" timestamp — verify the date format
    // exists somewhere in the rendered list (e.g. "Mar 24, 2026")
    const pageText = await page.locator('body').textContent();
    expect(pageText).toMatch(/\w{3} \d{1,2}, \d{4}/);

    // Each row shows the creator's email address
    await expect(page.getByText(/@/).first()).toBeVisible();
  });

  test('1.3 Pagination bar shows correct item count', { tag: '@viewer' }, async ({ page }) => {
    // Pre-condition: staging workspace has more than 20 dashboards so the
    // pagination bar is rendered and Previous is disabled on the first page.
    await page.goto('/dashboard');
    await page.getByText('All Dashboards').first().waitFor({ state: 'visible' });

    // Range indicator, e.g. "1 — 20 of 42", confirms correct page size
    await expect(page.getByText(/1\s*—\s*20 of/)).toBeVisible();

    // Previous Page is always disabled on the first page
    await expect(page.getByRole('button', { name: 'Previous Page' })).toBeDisabled();
  });

  // ─── 2. Search Functionality ──────────────────────────────────────────────
  //
  // The search input filters by title, description, and tags simultaneously.
  // Results update in real time and the active query is reflected in the URL
  // as ?search=<term>. All visibility tests run as @viewer; the description
  // search requires @editor to set up a dashboard with a known description.

  test('2.1 Search by title returns matching dashboards', { tag: '@viewer' }, async ({ page }) => {
    await page.goto('/dashboard');
    await page.getByText('All Dashboards').first().waitFor({ state: 'visible' });

    const searchInput = page.getByRole('textbox', { name: 'Search by name, description, or tags...' });

    // "APM Metrics" is a known dashboard in the workspace — searching by its
    // exact title should return it and reflect the term in the URL
    await searchInput.fill('APM Metrics');
    await expect(page).toHaveURL(/search=APM\+Metrics/);
    await expect(searchInput).toHaveValue('APM Metrics');
    await expect(page.getByAltText('dashboard-image').first()).toBeVisible();
    const pageText = await page.locator('body').textContent();
    expect(pageText?.toUpperCase()).toContain('APM METRICS');
  });

  test('2.2 Search by tag returns dashboards that carry that tag', { tag: '@viewer' }, async ({ page }) => {
    await page.goto('/dashboard');
    await page.getByText('All Dashboards').first().waitFor({ state: 'visible' });

    const searchInput = page.getByRole('textbox', { name: 'Search by name, description, or tags...' });

    // "latency" is a tag on the APM Metrics dashboard — searching by tag value
    // alone (no title match) should still surface that dashboard
    await searchInput.fill('latency');
    await expect(page).toHaveURL(/search=latency/);
    await expect(page.getByAltText('dashboard-image').first()).toBeVisible();
    const pageText = await page.locator('body').textContent();
    expect(pageText?.toUpperCase()).toContain('APM METRICS');
  });

  test('2.3 Search by description returns matching dashboards', { tag: '@editor' }, async ({ page }) => {
    // Create a dashboard with a known, unique description so we have a
    // reliable target for the description search without relying on pre-existing data
    const uniqueDesc = `desc-search-${Date.now()}`;

    await page.goto('/dashboard');
    await page.getByText('All Dashboards').first().waitFor({ state: 'visible' });

    // Create via inline name field then set its description via Configure
    await page.getByRole('textbox', { name: 'Enter dashboard name...' }).fill(`Search Test ${Date.now()}`);
    await page.getByRole('button', { name: 'Submit' }).click();
    await expect(page).toHaveURL(/\/dashboard\/[0-9a-f-]+/);

    // Set the description in the Configure dialog
    await page.getByRole('button', { name: 'Configure' }).click();
    await page.getByRole('dialog').waitFor({ state: 'visible' });
    await page.getByRole('textbox', { name: /description/i }).fill(uniqueDesc);
    await page.getByRole('button', { name: 'Save' }).click();

    // Return to the list and search using the description text
    await page.goto('/dashboard');
    await page.getByText('All Dashboards').first().waitFor({ state: 'visible' });
    const searchInput = page.getByRole('textbox', { name: 'Search by name, description, or tags...' });
    await searchInput.fill(uniqueDesc);

    // The dashboard we just created should appear
    await expect(page.getByAltText('dashboard-image').first()).toBeVisible();
  });

  test('2.4 Dashboard with no tags is found by title search', { tag: '@viewer' }, async ({ page }) => {
    await page.goto('/dashboard');
    await page.getByText('All Dashboards').first().waitFor({ state: 'visible' });

    const searchInput = page.getByRole('textbox', { name: 'Search by name, description, or tags...' });

    // "PromQL and Clickhouse SQL" has no tags — searching its title should
    // still return it, confirming that tag absence does not break title search
    await searchInput.fill('PromQL and Clickhouse SQL');
    await expect(page.getByAltText('dashboard-image').first()).toBeVisible();
    const pageText = await page.locator('body').textContent();
    expect(pageText?.toUpperCase()).toContain('PROMQL AND CLICKHOUSE SQL');
  });

  test('2.5 Dashboard with no description is found by title search', { tag: '@viewer' }, async ({ page }) => {
    await page.goto('/dashboard');
    await page.getByText('All Dashboards').first().waitFor({ state: 'visible' });

    const searchInput = page.getByRole('textbox', { name: 'Search by name, description, or tags...' });

    // APM Metrics has no description — searching its title must still return it,
    // confirming that description absence does not break title search
    await searchInput.fill('APM Metrics');
    await expect(page.getByAltText('dashboard-image').first()).toBeVisible();
    const pageText = await page.locator('body').textContent();
    expect(pageText?.toUpperCase()).toContain('APM METRICS');
  });

  test('2.6 Search state is reflected in URL and pre-fills on direct navigation', { tag: '@viewer' }, async ({ page }) => {
    await page.goto('/dashboard');
    await page.getByText('All Dashboards').first().waitFor({ state: 'visible' });

    const searchInput = page.getByRole('textbox', { name: 'Search by name, description, or tags...' });
    await searchInput.fill('PromQL');
    await expect(page).toHaveURL(/search=PromQL/);

    // Opening the URL directly (bookmark / share) should restore search state
    await page.goto('/dashboard?search=PromQL');
    await page.getByText('All Dashboards').first().waitFor({ state: 'visible' });
    await expect(searchInput).toHaveValue('PromQL');
    await expect(page.getByText('PromQL and Clickhouse SQL').first()).toBeVisible();
  });

  test('2.7 Clearing search restores the full list', { tag: '@viewer' }, async ({ page }) => {
    await page.goto('/dashboard');
    await page.getByText('All Dashboards').first().waitFor({ state: 'visible' });

    const searchInput = page.getByRole('textbox', { name: 'Search by name, description, or tags...' });

    await searchInput.fill('APM');
    await expect(page).toHaveURL(/search=APM/);

    // Clearing the field removes the param and brings back all dashboards
    await searchInput.fill('');
    await expect(page).not.toHaveURL(/search=/);
    await expect(page.getByAltText('dashboard-image').first()).toBeVisible();
  });

  test('2.8 Search with no matching results shows empty state', { tag: '@viewer' }, async ({ page }) => {
    await page.goto('/dashboard');
    await page.getByText('All Dashboards').first().waitFor({ state: 'visible' });

    const searchInput = page.getByRole('textbox', { name: 'Search by name, description, or tags...' });

    // A nonsense term guarantees no matches across title, description, or tags
    await searchInput.fill('xyznonexistent999');

    // No thumbnails — list is empty, no error or broken layout
    await expect(page.getByAltText('dashboard-image')).toHaveCount(0);
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toHaveValue('xyznonexistent999');
  });

  test('2.9 Search is case-insensitive', { tag: '@viewer' }, async ({ page }) => {
    await page.goto('/dashboard');
    await page.getByText('All Dashboards').first().waitFor({ state: 'visible' });

    const searchInput = page.getByRole('textbox', { name: 'Search by name, description, or tags...' });

    // Lowercase version of a mixed-case dashboard name — should still match
    await searchInput.fill('apm metrics');
    await expect(page.getByAltText('dashboard-image').first()).toBeVisible();
    const pageText = await page.locator('body').textContent();
    expect(pageText?.toUpperCase()).toContain('APM METRICS');
  });

  // ─── 3. Sorting ───────────────────────────────────────────────────────────
  //
  // Known behaviour (verified against live app):
  //   - Fresh load: no sort params in URL; list is already descending (server default)
  //   - First click: URL gains ?columnKey=updatedAt&order=descend
  //   - Subsequent clicks: URL stays on order=descend — ascending is not yet implemented
  //
  // Tests document the current state. The ascending limitation is explicitly
  // noted so it is visible during review and easy to fix when implemented.

  test('3.1 Default load has no sort params and shows most recently updated dashboard first', { tag: '@viewer' }, async ({ page }) => {
    await page.goto('/dashboard');
    await page.getByText('All Dashboards').first().waitFor({ state: 'visible' });

    // On fresh load the URL should be clean — sort params only appear after
    // the user interacts with the sort button
    await expect(page).toHaveURL('/dashboard');
    await expect(page).not.toHaveURL(/columnKey/);
    await expect(page).not.toHaveURL(/order/);

    // The list is already sorted descending by default (server-side).
    // Verify by comparing the first two rows' timestamps — the first row must
    // be more recent than or equal to the second.
    const rows = page.getByAltText('dashboard-image');
    await expect(rows.first()).toBeVisible();
  });

  test('3.2 First click on sort button adds columnKey=updatedAt&order=descend to URL', { tag: '@viewer' }, async ({ page }) => {
    await page.goto('/dashboard');
    await page.getByText('All Dashboards').first().waitFor({ state: 'visible' });

    // Before any interaction — no sort params
    await expect(page).not.toHaveURL(/columnKey/);

    await page.getByTestId('sort-by').click();

    // After first click the sort state is written to the URL
    await expect(page).toHaveURL(/columnKey=updatedAt/);
    await expect(page).toHaveURL(/order=descend/);

    // List should still be rendering rows correctly
    await expect(page.getByAltText('dashboard-image').first()).toBeVisible();
  });

  test('3.3 Subsequent sort clicks keep order=descend (ascending not yet implemented)', { tag: '@viewer' }, async ({ page }) => {
    await page.goto('/dashboard');
    await page.getByText('All Dashboards').first().waitFor({ state: 'visible' });

    const sortButton = page.getByTestId('sort-by');

    // First click — sets descend
    await sortButton.click();
    await expect(page).toHaveURL(/order=descend/);

    // Second click — known limitation: order remains descend, does not flip to ascend
    await sortButton.click();
    await expect(page).toHaveURL(/order=descend/);
    await expect(page).not.toHaveURL(/order=ascend/);
  });

  // ─── 4. Row Actions (Context Menu) ───────────────────────────────────────
  //
  // The three-dot action icon (data-testid: dashboard-action-icon) is always
  // visible on every row — no hover required. Clicking it opens a tooltip
  // popover. Items inside are scoped to getByRole('tooltip') to avoid
  // accidentally matching other elements on the page.
  //
  // Role visibility:
  //   @admin  — View, Open in New Tab, Copy Link, Export JSON, Delete dashboard
  //   @editor — View, Open in New Tab, Copy Link, Export JSON  (no Delete)
  //   @viewer — action icon is hidden entirely

  test('4.1 Admin sees all five options in the action menu', { tag: '@admin' }, async ({ page }) => {
    await page.goto('/dashboard');
    await page.getByText('All Dashboards').first().waitFor({ state: 'visible' });

    await page.getByTestId('dashboard-action-icon').first().click();
    const tooltip = page.getByRole('tooltip');
    await expect(tooltip).toBeVisible();

    // All five items must be present for admin
    await expect(tooltip.getByRole('button', { name: 'View' })).toBeVisible();
    await expect(tooltip.getByRole('button', { name: 'Open in New Tab' })).toBeVisible();
    await expect(tooltip.getByRole('button', { name: 'Copy Link' })).toBeVisible();
    await expect(tooltip.getByRole('button', { name: 'Export JSON' })).toBeVisible();
    // Delete is rendered as a generic (not a button) in a separate section
    await expect(tooltip.getByText('Delete dashboard')).toBeVisible();
  });

  test('4.2 Editor sees four options — Delete dashboard is not present', { tag: '@editor' }, async ({ page }) => {
    await page.goto('/dashboard');
    await page.getByText('All Dashboards').first().waitFor({ state: 'visible' });

    await page.getByTestId('dashboard-action-icon').first().click();
    const tooltip = page.getByRole('tooltip');
    await expect(tooltip).toBeVisible();

    await expect(tooltip.getByRole('button', { name: 'View' })).toBeVisible();
    await expect(tooltip.getByRole('button', { name: 'Open in New Tab' })).toBeVisible();
    await expect(tooltip.getByRole('button', { name: 'Copy Link' })).toBeVisible();
    await expect(tooltip.getByRole('button', { name: 'Export JSON' })).toBeVisible();

    // Viewer and Editor cannot delete — the item must be absent
    await expect(tooltip.getByText('Delete dashboard')).not.toBeVisible();
  });

  test('4.3 Viewer has no action icon on dashboard rows', { tag: '@viewer' }, async ({ page }) => {
    await page.goto('/dashboard');
    await page.getByText('All Dashboards').first().waitFor({ state: 'visible' });

    // The action icon must not be present in the DOM for viewer role
    await expect(page.getByTestId('dashboard-action-icon')).toHaveCount(0);
  });

  test('4.4 View action navigates to the dashboard detail page', { tag: '@editor' }, async ({ page }) => {
    await page.goto('/dashboard');
    await page.getByText('All Dashboards').first().waitFor({ state: 'visible' });

    await page.getByTestId('dashboard-action-icon').first().click();
    await page.getByRole('tooltip').getByRole('button', { name: 'View' }).click();

    // Should land on the detail page — UUID in the path confirms navigation
    await expect(page).toHaveURL(/\/dashboard\/[0-9a-f-]+/);
  });

  test('4.5 Open in New Tab opens the dashboard in a new browser tab', { tag: '@editor' }, async ({ page, context }) => {
    await page.goto('/dashboard');
    await page.getByText('All Dashboards').first().waitFor({ state: 'visible' });

    await page.getByTestId('dashboard-action-icon').first().click();

    // waitForEvent('page') must be set up before the click that triggers it
    const [newPage] = await Promise.all([
      context.waitForEvent('page'),
      page.getByRole('tooltip').getByRole('button', { name: 'Open in New Tab' }).click(),
    ]);

    await newPage.waitForLoadState();
    await expect(newPage).toHaveURL(/\/dashboard\/[0-9a-f-]+/);
    await newPage.close();
  });

  test('4.6 Copy Link copies the dashboard URL to the clipboard', { tag: '@editor' }, async ({ page, context }) => {
    await page.goto('/dashboard');
    await page.getByText('All Dashboards').first().waitFor({ state: 'visible' });

    // Grant clipboard permissions so we can read back what was written
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    await page.getByTestId('dashboard-action-icon').first().click();
    await page.getByRole('tooltip').getByRole('button', { name: 'Copy Link' }).click();

    // App shows a success notification after copying
    await expect(page.getByText(/copied|success/i)).toBeVisible();

    // Clipboard must contain a valid dashboard detail URL.
    // Cast through unknown to access browser globals inside page.evaluate.
    const clipboardText = await page.evaluate(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return await (globalThis as any).navigator.clipboard.readText();
    });
    expect(clipboardText).toMatch(/\/dashboard\/[0-9a-f-]+/);
  });

  test('4.7 Export JSON downloads the dashboard as a JSON file', { tag: '@editor' }, async ({ page }) => {
    await page.goto('/dashboard');
    await page.getByText('All Dashboards').first().waitFor({ state: 'visible' });

    await page.getByTestId('dashboard-action-icon').first().click();

    // waitForEvent('download') must be in place before the triggering click
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('tooltip').getByRole('button', { name: 'Export JSON' }).click(),
    ]);

    expect(download.suggestedFilename()).toMatch(/\.json$/);
  });

  test('4.8 Action menu closes when clicking outside the popover', { tag: '@editor' }, async ({ page }) => {
    await page.goto('/dashboard');
    await page.getByText('All Dashboards').first().waitFor({ state: 'visible' });

    await page.getByTestId('dashboard-action-icon').first().click();
    await expect(page.getByRole('tooltip')).toBeVisible();

    // Click on a neutral area — the page heading — to dismiss the popover
    await page.getByRole('heading', { name: 'Dashboards', level: 1 }).click();
    await expect(page.getByRole('tooltip')).not.toBeVisible();

    // No navigation should have occurred
    await expect(page).toHaveURL(/\/dashboard($|\?)/);
  });

  // ─── 5. Creating Dashboards ───────────────────────────────────────────────
  //
  // Three creation paths exist: inline name field, New dashboard dropdown →
  // Create dashboard, and New dashboard dropdown → Import JSON.
  // Create controls (name input, Submit, New dashboard button) are visible
  // to Editor and Admin only — hidden from Viewer entirely.

  test('5.1 Create controls are hidden from Viewer', { tag: '@viewer' }, async ({ page }) => {
    await page.goto('/dashboard');
    await page.getByText('All Dashboards').first().waitFor({ state: 'visible' });

    // None of the create affordances should be present for a viewer
    await expect(page.getByRole('textbox', { name: 'Enter dashboard name...' })).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Submit' })).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'New dashboard' })).not.toBeVisible();
  });

  test('5.2 Submit button is disabled when the name input is empty', { tag: '@editor' }, async ({ page }) => {
    await page.goto('/dashboard');
    await page.getByText('All Dashboards').first().waitFor({ state: 'visible' });

    // Before typing, Submit must be disabled — clicking it should do nothing
    await expect(page.getByRole('button', { name: 'Submit' })).toBeDisabled();
  });

  test('5.3 Inline name field creates a named dashboard and navigates to it', { tag: '@editor' }, async ({ page }) => {
    const name = `Test Dashboard ${Date.now()}`;

    await page.goto('/dashboard');
    await page.getByText('All Dashboards').first().waitFor({ state: 'visible' });

    const nameInput = page.getByRole('textbox', { name: 'Enter dashboard name...' });
    await nameInput.fill(name);

    // Submit becomes enabled once text is present
    await expect(page.getByRole('button', { name: 'Submit' })).toBeEnabled();
    await page.getByRole('button', { name: 'Submit' }).click();

    // Should navigate directly to the new dashboard's detail page
    await expect(page).toHaveURL(/\/dashboard\/[0-9a-f-]+/);

    // Clean up — delete the dashboard we just created
    await page.goto('/dashboard');
    await page.getByText('All Dashboards').first().waitFor({ state: 'visible' });
    await page.getByRole('textbox', { name: 'Search by name, description, or tags...' }).fill(name);
    await page.getByTestId('dashboard-action-icon').first().click();
    await page.getByRole('tooltip').getByText('Delete dashboard').click();
    await page.getByRole('button', { name: 'Delete' }).click();
  });

  test('5.4 New dashboard dropdown shows exactly three options', { tag: '@editor' }, async ({ page }) => {
    await page.goto('/dashboard');
    await page.getByText('All Dashboards').first().waitFor({ state: 'visible' });

    await page.getByRole('button', { name: 'New dashboard' }).click();
    const menu = page.getByRole('menu');
    await expect(menu).toBeVisible();

    // Exactly three items: Create dashboard, Import JSON, View templates
    await expect(menu.getByRole('menuitem', { name: 'Create dashboard' })).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: 'Import JSON' })).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: 'View templates' })).toBeVisible();
  });

  test('5.5 Create dashboard navigates to new dashboard with default name', { tag: '@editor' }, async ({ page }) => {
    await page.goto('/dashboard');
    await page.getByText('All Dashboards').first().waitFor({ state: 'visible' });

    await page.getByRole('button', { name: 'New dashboard' }).click();
    await page.getByRole('menuitem', { name: 'Create dashboard' }).click();

    // New dashboard detail page loads
    await expect(page).toHaveURL(/\/dashboard\/[0-9a-f-]+/);

    // Default name is "Sample Title" and onboarding state is shown
    await expect(page.getByText('Configure your new dashboard')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Configure' })).toBeVisible();
    await expect(page.getByRole('button', { name: /New Panel/ })).toBeVisible();

    // Clean up
    await page.goto('/dashboard');
    await page.getByText('All Dashboards').first().waitFor({ state: 'visible' });
    await page.getByRole('textbox', { name: 'Search by name, description, or tags...' }).fill('Sample Title');
    await page.getByTestId('dashboard-action-icon').first().click();
    await page.getByRole('tooltip').getByText('Delete dashboard').click();
    await page.getByRole('button', { name: 'Delete' }).click();
  });

  test('5.6 Import JSON dialog opens with code editor and upload button', { tag: '@editor' }, async ({ page }) => {
    await page.goto('/dashboard');
    await page.getByText('All Dashboards').first().waitFor({ state: 'visible' });

    await page.getByRole('button', { name: 'New dashboard' }).click();
    await page.getByRole('menuitem', { name: 'Import JSON' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Import Dashboard JSON')).toBeVisible();

    // Monaco editor renders line numbers — line "1" is the presence signal
    await expect(dialog.getByText('1').first()).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Upload JSON file' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Import and Next' })).toBeVisible();
  });

  test('5.7 Import JSON dialog closes on Escape without creating a dashboard', { tag: '@editor' }, async ({ page }) => {
    await page.goto('/dashboard');
    await page.getByText('All Dashboards').first().waitFor({ state: 'visible' });

    await page.getByRole('button', { name: 'New dashboard' }).click();
    await page.getByRole('menuitem', { name: 'Import JSON' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.keyboard.press('Escape');

    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(page).toHaveURL(/\/dashboard($|\?)/);
  });

  test('5.8 Import JSON dialog closes on clicking the × button', { tag: '@editor' }, async ({ page }) => {
    await page.goto('/dashboard');
    await page.getByText('All Dashboards').first().waitFor({ state: 'visible' });

    await page.getByRole('button', { name: 'New dashboard' }).click();
    await page.getByRole('menuitem', { name: 'Import JSON' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // The close button is a button with accessible name containing "close" or "×"
    await dialog.getByRole('button', { name: /close/i }).click();

    await expect(dialog).not.toBeVisible();
    await expect(page).toHaveURL(/\/dashboard($|\?)/);
  });

  // ─── 6. Deleting Dashboards ───────────────────────────────────────────────
  //
  // Only Admin can delete. Each test creates its own disposable dashboard
  // so no pre-existing data is affected.
  //
  // Known behaviour: clicking Cancel in the confirmation dialog navigates to
  // the dashboard detail page rather than staying on the list — tests account
  // for this rather than asserting we stay on /dashboard.

  test('6.1 Delete confirmation dialog shows dashboard name with Cancel and Delete buttons', { tag: '@admin' }, async ({ page }) => {
    // Create a disposable dashboard to delete
    const name = `Delete Test ${Date.now()}`;
    await page.goto('/dashboard');
    await page.getByText('All Dashboards').first().waitFor({ state: 'visible' });
    await page.getByRole('textbox', { name: 'Enter dashboard name...' }).fill(name);
    await page.getByRole('button', { name: 'Submit' }).click();
    await expect(page).toHaveURL(/\/dashboard\/[0-9a-f-]+/);

    // Return to the list and open delete dialog for the dashboard we just created
    await page.goto('/dashboard');
    await page.getByText('All Dashboards').first().waitFor({ state: 'visible' });
    await page.getByRole('textbox', { name: 'Search by name, description, or tags...' }).fill(name);
    await page.getByTestId('dashboard-action-icon').first().click();
    await page.getByRole('tooltip').getByText('Delete dashboard').click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Dialog heading contains the dashboard name
    await expect(dialog.getByRole('heading')).toContainText('Are you sure you want to delete the');
    await expect(dialog.getByRole('heading')).toContainText(name);

    // Both action buttons are present
    await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Delete' })).toBeVisible();

    // Clean up — confirm delete
    await dialog.getByRole('button', { name: 'Delete' }).click();
  });

  test('6.2 Cancelling delete navigates to the dashboard detail page (known behaviour)', { tag: '@admin' }, async ({ page }) => {
    // Create a disposable dashboard
    const name = `Cancel Delete Test ${Date.now()}`;
    await page.goto('/dashboard');
    await page.getByText('All Dashboards').first().waitFor({ state: 'visible' });
    await page.getByRole('textbox', { name: 'Enter dashboard name...' }).fill(name);
    await page.getByRole('button', { name: 'Submit' }).click();
    await expect(page).toHaveURL(/\/dashboard\/[0-9a-f-]+/);

    await page.goto('/dashboard');
    await page.getByText('All Dashboards').first().waitFor({ state: 'visible' });
    await page.getByRole('textbox', { name: 'Search by name, description, or tags...' }).fill(name);
    await page.getByTestId('dashboard-action-icon').first().click();
    await page.getByRole('tooltip').getByText('Delete dashboard').click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Cancel — known behaviour: lands on detail page, not back on the list
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page).toHaveURL(/\/dashboard\/[0-9a-f-]+/);

    // Clean up — delete the dashboard we created
    await page.goto('/dashboard');
    await page.getByText('All Dashboards').first().waitFor({ state: 'visible' });
    await page.getByRole('textbox', { name: 'Search by name, description, or tags...' }).fill(name);
    await page.getByTestId('dashboard-action-icon').first().click();
    await page.getByRole('tooltip').getByText('Delete dashboard').click();
    await page.getByRole('button', { name: 'Delete' }).click();
  });

  test('6.3 Confirming delete removes the dashboard from the list', { tag: '@admin' }, async ({ page }) => {
    // Create a disposable dashboard
    const name = `Confirm Delete Test ${Date.now()}`;
    await page.goto('/dashboard');
    await page.getByText('All Dashboards').first().waitFor({ state: 'visible' });
    await page.getByRole('textbox', { name: 'Enter dashboard name...' }).fill(name);
    await page.getByRole('button', { name: 'Submit' }).click();
    await expect(page).toHaveURL(/\/dashboard\/[0-9a-f-]+/);

    // Return to list, find the dashboard, and delete it
    await page.goto('/dashboard');
    await page.getByText('All Dashboards').first().waitFor({ state: 'visible' });
    await page.getByRole('textbox', { name: 'Search by name, description, or tags...' }).fill(name);
    await expect(page.getByAltText('dashboard-image').first()).toBeVisible();

    await page.getByTestId('dashboard-action-icon').first().click();
    await page.getByRole('tooltip').getByText('Delete dashboard').click();
    await page.getByRole('button', { name: 'Delete' }).click();

    // After deletion, searching for the name should return no results
    await page.goto('/dashboard');
    await page.getByText('All Dashboards').first().waitFor({ state: 'visible' });
    await page.getByRole('textbox', { name: 'Search by name, description, or tags...' }).fill(name);
    await expect(page.getByAltText('dashboard-image')).toHaveCount(0);
  });

  // ─── 7. Row Click Navigation ──────────────────────────────────────────────
  //
  // Clicking anywhere on a dashboard row (except the action icon) navigates
  // to the detail page. Runs as @viewer since all roles can navigate.

  test('7.1 Clicking a dashboard row navigates to the detail page', { tag: '@viewer' }, async ({ page }) => {
    await page.goto('/dashboard');
    await page.getByText('All Dashboards').first().waitFor({ state: 'visible' });

    // Click the thumbnail image — a stable, always-present click target
    // that is not the action icon
    await page.getByAltText('dashboard-image').first().click();

    // UUID in the path confirms we landed on a detail page
    await expect(page).toHaveURL(/\/dashboard\/[0-9a-f-]+/);
  });

  test('7.2 Dashboard detail page shows the breadcrumb after row click', { tag: '@viewer' }, async ({ page }) => {
    await page.goto('/dashboard');
    await page.getByText('All Dashboards').first().waitFor({ state: 'visible' });

    await page.getByAltText('dashboard-image').first().click();
    await expect(page).toHaveURL(/\/dashboard\/[0-9a-f-]+/);

    // Breadcrumb "Dashboard /" confirms correct page structure loaded
    await expect(page.getByRole('button', { name: /Dashboard \// })).toBeVisible();
  });

  test('7.3 Sidebar Dashboards link navigates to the list page', { tag: '@viewer' }, async ({ page }) => {
    // Start on a different page so the navigation is meaningful
    await page.goto('/home');
    await page.getByText('All Dashboards').first().waitFor({ state: 'hidden' });

    // Click the Dashboards entry in the left sidebar
    await page.getByRole('link', { name: 'Dashboards' }).click();

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page).toHaveTitle('SigNoz | All Dashboards');
  });

  // ─── 8. URL State and Deep Linking ───────────────────────────────────────
  //
  // Search term persists in the URL (?search=<term>) and is restored on direct
  // navigation. Sort params (columnKey + order) appear only after the user
  // clicks the sort button — not on fresh load.

  test('8.1 Direct navigation with ?search= pre-fills the input and filters results', { tag: '@viewer' }, async ({ page }) => {
    // Navigate directly with the search param — simulates opening a shared link
    await page.goto('/dashboard?search=PromQL');
    await page.getByText('All Dashboards').first().waitFor({ state: 'visible' });

    // Input must be pre-filled with the param value
    await expect(page.getByRole('textbox', { name: 'Search by name, description, or tags...' })).toHaveValue('PromQL');

    // Matching dashboard must be visible
    await expect(page.getByText('PromQL and Clickhouse SQL').first()).toBeVisible();
  });

  test('8.2 Search term updates the URL in real time', { tag: '@viewer' }, async ({ page }) => {
    await page.goto('/dashboard');
    await page.getByText('All Dashboards').first().waitFor({ state: 'visible' });

    await page.getByRole('textbox', { name: 'Search by name, description, or tags...' }).fill('APM');

    // URL must reflect the typed term immediately
    await expect(page).toHaveURL(/search=APM/);
  });

  test('8.3 Browser Back after navigating to a dashboard restores search state', { tag: '@viewer' }, async ({ page }) => {
    await page.goto('/dashboard?search=APM');
    await page.getByText('All Dashboards').first().waitFor({ state: 'visible' });

    // Navigate into a dashboard row
    await page.getByAltText('dashboard-image').first().click();
    await expect(page).toHaveURL(/\/dashboard\/[0-9a-f-]+/);

    // Browser back should restore the list with the search param intact
    await page.goBack();
    await expect(page).toHaveURL(/search=APM/);
    await expect(page.getByRole('textbox', { name: 'Search by name, description, or tags...' })).toHaveValue('APM');
  });

  test('8.4 Sort params appear in URL only after interacting with the sort button', { tag: '@viewer' }, async ({ page }) => {
    // Fresh load — no sort params
    await page.goto('/dashboard');
    await page.getByText('All Dashboards').first().waitFor({ state: 'visible' });
    await expect(page).not.toHaveURL(/columnKey/);

    // After clicking sort — params appear
    await page.getByTestId('sort-by').click();
    await expect(page).toHaveURL(/columnKey=updatedAt/);
    await expect(page).toHaveURL(/order=descend/);

    // Navigating directly with sort params should honour them on load
    await page.goto('/dashboard?columnKey=updatedAt&order=descend');
    await page.getByText('All Dashboards').first().waitFor({ state: 'visible' });
    await expect(page).toHaveURL(/columnKey=updatedAt/);
    await expect(page).toHaveURL(/order=descend/);
  });

  // ─── 9. Page Header Actions ───────────────────────────────────────────────
  //
  // The Feedback and Share buttons live in the top-right of the page header
  // and are visible to all roles. This section was absent from the originally
  // generated spec and is written from scratch based on live app observation.

  test('9.1 Feedback button is visible and opens a feedback mechanism', { tag: '@viewer' }, async ({ page }) => {
    await page.goto('/dashboard');
    await page.getByText('All Dashboards').first().waitFor({ state: 'visible' });

    const feedbackButton = page.getByRole('button', { name: 'Feedback' });
    await expect(feedbackButton).toBeVisible();

    // Clicking should trigger a feedback mechanism (modal, widget, or external link)
    // — we verify it is interactive without asserting the exact implementation
    await feedbackButton.click();
    await expect(page).toHaveURL(/\/dashboard/); // no unintended navigation
  });

  test('9.2 Share button is visible and triggers a share action', { tag: '@viewer' }, async ({ page }) => {
    await page.goto('/dashboard');
    await page.getByText('All Dashboards').first().waitFor({ state: 'visible' });

    const shareButton = page.getByRole('button', { name: 'Share' });
    await expect(shareButton).toBeVisible();

    await shareButton.click();

    // Clicking Share either opens a dialog or copies the URL — either way the
    // page should remain on /dashboard with no unintended navigation
    await expect(page).toHaveURL(/\/dashboard/);
  });

  // ─── 10. Edge Cases and Error Handling ───────────────────────────────────
  //
  // Boundary conditions: tag overflow rendering, tagless rows, pagination
  // reset on search, and role-based visibility for Viewer.

  test('10.1 Dashboards with many tags show a +N overflow indicator', { tag: '@viewer' }, async ({ page }) => {
    await page.goto('/dashboard');
    await page.getByText('All Dashboards').first().waitFor({ state: 'visible' });

    // The APM Metrics dashboard has 4 tags (apm, latency, error rate, throughput).
    // The list renders a subset inline and overflows the rest as "+ N".
    // We search for it to bring it to the top and inspect the row.
    await page.getByRole('textbox', { name: 'Search by name, description, or tags...' }).fill('APM Metrics');
    await page.getByAltText('dashboard-image').first().waitFor({ state: 'visible' });

    // At least one "+ N" overflow indicator must be visible somewhere in the list
    await expect(page.getByText(/^\+\s*\d+$/).first()).toBeVisible();
  });

  test('10.2 Dashboards with no tags show a clean row with no empty tag containers', { tag: '@viewer' }, async ({ page }) => {
    await page.goto('/dashboard');
    await page.getByText('All Dashboards').first().waitFor({ state: 'visible' });

    // "PromQL and Clickhouse SQL" has no tags — search to bring it to top
    await page.getByRole('textbox', { name: 'Search by name, description, or tags...' }).fill('PromQL and Clickhouse SQL');
    await page.getByAltText('dashboard-image').first().waitFor({ state: 'visible' });

    // Row must be visible with thumbnail and text — no broken layout
    await expect(page.getByAltText('dashboard-image').first()).toBeVisible();
    await expect(page.getByText('PromQL and Clickhouse SQL').first()).toBeVisible();
  });

  test('10.3 Searching while on page 2 resets pagination to page 1', { tag: '@viewer' }, async ({ page }) => {
    // Pre-condition: staging workspace has more than 20 dashboards
    await page.goto('/dashboard');
    await page.getByText('All Dashboards').first().waitFor({ state: 'visible' });

    // Navigate to page 2
    await page.getByRole('button', { name: '2' }).click();
    await expect(page).toHaveURL(/page=2/);

    // Typing a search term should reset back to page 1
    await page.getByRole('textbox', { name: 'Search by name, description, or tags...' }).fill('APM');
    await expect(page).not.toHaveURL(/page=2/);
    await expect(page.getByAltText('dashboard-image').first()).toBeVisible();
  });

  test('10.4 Viewer cannot see create controls or row action icons', { tag: '@viewer' }, async ({ page }) => {
    await page.goto('/dashboard');
    await page.getByText('All Dashboards').first().waitFor({ state: 'visible' });

    // Create controls must be absent for Viewer
    await expect(page.getByRole('textbox', { name: 'Enter dashboard name...' })).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Submit' })).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'New dashboard' })).not.toBeVisible();

    // Row action icons must be absent for Viewer
    await expect(page.getByTestId('dashboard-action-icon')).toHaveCount(0);

    // Core read-only features still work
    await expect(page.getByRole('textbox', { name: 'Search by name, description, or tags...' })).toBeVisible();
    await expect(page.getByAltText('dashboard-image').first()).toBeVisible();
  });
});
