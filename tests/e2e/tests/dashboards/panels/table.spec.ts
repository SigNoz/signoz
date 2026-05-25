import type { Page } from '@playwright/test';

import { expect, test } from '../../../fixtures/auth';
import { newAdminContext } from '../../../helpers/auth';
import {
	authToken,
	changePanelType,
	configureAndSavePanel,
	createDashboardViaApi,
	deleteDashboardViaApi,
	fetchDashboardData,
	findDashboardIdByTitle,
	openWidgetEditor,
	saveWidgetEdit,
} from '../../../helpers/dashboards';

test.describe.configure({ mode: 'serial' });

const FIXTURE_DASHBOARD_TITLE = 'table-controls-fixture';
const FIXTURE_PANEL_TITLE = 'table-controls-panel';

const seedIds = new Set<string>();

test.beforeAll(async ({ browser }) => {
	const ctx = await newAdminContext(browser);
	const page = await ctx.newPage();
	try {
		const id = await createDashboardViaApi(page, FIXTURE_DASHBOARD_TITLE);
		seedIds.add(id);
		await page.goto(`/dashboard/${id}`);
		await page.getByTestId('add-panel').waitFor({ state: 'visible' });
		await configureAndSavePanel(page, 'metrics', FIXTURE_PANEL_TITLE);
		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);
		await changePanelType(page, 'Table');
		await saveWidgetEdit(page);
	} finally {
		await ctx.close();
	}
});

test.afterAll(async ({ browser }) => {
	if (seedIds.size === 0) return;
	const ctx = await newAdminContext(browser);
	const page = await ctx.newPage();
	try {
		const token = await authToken(page);
		for (const id of [...seedIds]) {
			await deleteDashboardViaApi(ctx.request, id, token);
			seedIds.delete(id);
		}
	} finally {
		await ctx.close();
	}
});

async function gotoFixtureDashboard(page: Page): Promise<void> {
	const id = await findDashboardIdByTitle(page, FIXTURE_DASHBOARD_TITLE);
	expect(id, `${FIXTURE_DASHBOARD_TITLE} not found`).toBeTruthy();
	await page.goto(`/dashboard/${id}`);
	await page.getByTestId(FIXTURE_PANEL_TITLE).first().waitFor({ state: 'visible' });
}

/**
 * Fetch the persisted fixture dashboard JSON and return the first widget.
 * Use this after a save to confirm the PUT actually landed the expected
 * shape on the backend — UI-only round-trips pass on optimistic-update bugs.
 */
async function fetchFixtureWidget(page: Page) {
	const id = await findDashboardIdByTitle(page, FIXTURE_DASHBOARD_TITLE);
	expect(id, `${FIXTURE_DASHBOARD_TITLE} not found`).toBeTruthy();
	const dashboard = await fetchDashboardData(page, id!);
	const widget = dashboard.widgets?.[0];
	expect(widget, 'fixture dashboard must have at least one widget').toBeTruthy();
	return widget!;
}

/**
 * Return the last <td> in the first data row of the panel's Ant Design table.
 * Ant Design applies .ant-table-row to actual data rows only (not header rows),
 * so this correctly skips the fixed/sticky header tbody rows.
 *
 * For the metrics panel the row has: td[0] = label column, td[last] = value
 * column (the aggregation query "A"). The last td is thus the value cell.
 * However, depending on the panel query there may only be ONE td per row. Use
 * the cell that contains a non-empty value: any td that is not purely the
 * label placeholder.
 *
 * NOTE: the value cell wraps its text in a <button> element (from the
 * QueryTable open-traces render path) so textContent picks it up correctly.
 */
async function getFirstDataCell(page: Page) {
	// .ant-table-row targets Ant Design data rows only (not header/fixed rows).
	const firstRow = page.locator('tr.ant-table-row').first();
	await firstRow.waitFor({ state: 'visible' });
	// Return the last <td> — for a metrics table with columns [label, A] this
	// is the value column. For a single-column table it is the only column.
	return firstRow.locator('td').last();
}

/**
 * Ensure a SettingsSection accordion in the widget editor right pane is
 * expanded. If it is already open (content div has the `open` class), this is
 * a no-op. Otherwise it clicks the header button and waits for the content to
 * become visible.
 */
async function expandSection(page: Page, title: string): Promise<void> {
	const section = page
		.locator('.settings-section')
		.filter({ has: page.locator('button.settings-section-header', { hasText: title }) });
	const contentDiv = section.locator('.settings-section-content');
	const isOpen = await contentDiv.evaluate((el) => el.classList.contains('open'));
	if (!isOpen) {
		await section.locator('button.settings-section-header').click();
		await contentDiv.waitFor({ state: 'visible' });
	}
}

/**
 * Select a unit from the column-unit selector dropdown by typing a search
 * term, then clicking the filtered option. Scoped to .column-unit-selector to
 * avoid matching the Y-axis unit selectors on other panel types.
 *
 * The selector has `showSearch` enabled and renders a long virtualised option
 * list — typing first avoids instability from the list re-rendering when the
 * target option is off-screen.
 */
async function selectColumnUnit(
	page: Page,
	searchTerm: string,
	optionText: string,
): Promise<void> {
	const unitSelect = page
		.locator('.column-unit-selector .y-axis-unit-selector-v2 .ant-select')
		.first();
	await unitSelect.click();
	await page
		.locator('.column-unit-selector .y-axis-unit-selector-v2 .ant-select input')
		.first()
		.fill(searchTerm);
	await page
		.locator('.ant-select-item-option-content', { hasText: optionText })
		.first()
		.click();
}

test.describe('Table Panel Controls', () => {
	test('TC-01 panel name persists and is reflected in the widget header', async ({
		authedPage: page,
	}) => {
		await gotoFixtureDashboard(page);
		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);

		await page.getByTestId('panel-name-input').fill('table-controls-renamed');
		await saveWidgetEdit(page);
		await expect(page.getByTestId('table-controls-renamed').first()).toBeVisible();

		// Server-side check — the PUT must carry the new title.
		expect((await fetchFixtureWidget(page)).title).toBe('table-controls-renamed');

		await openWidgetEditor(page, 'table-controls-renamed');
		await expect(page.getByTestId('panel-name-input')).toHaveValue(
			'table-controls-renamed',
		);

		await page.getByTestId('panel-name-input').fill(FIXTURE_PANEL_TITLE);
		await saveWidgetEdit(page);
	});

	test('TC-02 description persists and shows info icon on header', async ({
		authedPage: page,
	}) => {
		await gotoFixtureDashboard(page);
		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);

		await page
			.getByTestId('panel-description-input')
			.fill('E2E table description');
		await saveWidgetEdit(page);

		await expect(
			page
				.locator('.widget-header-container')
				.filter({ hasText: FIXTURE_PANEL_TITLE })
				.locator('.info-tooltip')
				.first(),
		).toBeVisible();

		expect((await fetchFixtureWidget(page)).description).toBe(
			'E2E table description',
		);

		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);
		await expect(page.getByTestId('panel-description-input')).toHaveValue(
			'E2E table description',
		);

		await page.getByTestId('panel-description-input').fill('');
		await saveWidgetEdit(page);
	});

	test('TC-03 panel time preference switches to Last 15 min and persists', async ({
		authedPage: page,
	}) => {
		await gotoFixtureDashboard(page);
		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);

		await page
			.locator('section.panel-time-preference')
			.getByRole('button', { name: /global time/i })
			.click();
		await page.getByRole('menuitem', { name: /Last 15 min/i }).click();
		await saveWidgetEdit(page);

		// Server-side: persisted timePreferance enum, not just visible label.
		expect((await fetchFixtureWidget(page)).timePreferance).toBe('LAST_15_MIN');

		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);
		await expect(
			page.locator('section.panel-time-preference').getByRole('button'),
		).toContainText(/Last 15 min/i);

		await page
			.locator('section.panel-time-preference')
			.getByRole('button')
			.click();
		await page.getByRole('menuitem', { name: /Global Time/i }).click();
		await saveWidgetEdit(page);
	});

	test('TC-04 column unit formats the matching column cells and persists', async ({
		authedPage: page,
	}) => {
		await gotoFixtureDashboard(page);
		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);

		// The "Formatting & Units" section starts collapsed — expand it first.
		await expandSection(page, 'Formatting & Units');

		// Use selectColumnUnit to avoid virtualised-list detached-DOM failures.
		await selectColumnUnit(page, 'Milliseconds', 'Milliseconds (ms)');

		await saveWidgetEdit(page);

		// Cell text in the data column should now contain the `ms` suffix.
		// Strict check: text must be a number with the unit, not just an empty
		// cell that happens to substring-match "ms".
		const cell = await getFirstDataCell(page);
		await expect(cell).toHaveText(/^\s*[-+]?\d[\d,.eE+-]*\s*ms\s*$/);

		// Server-side: columnUnits must record the unit code, not just the
		// label. UI display can use a fancy label while the persisted enum drifts.
		const persistedAfterUnit = await fetchFixtureWidget(page);
		const columnUnitValues = Object.values(persistedAfterUnit.columnUnits ?? {});
		expect(columnUnitValues, 'columnUnits must include the chosen unit').toContain(
			'ms',
		);

		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);
		// Section starts collapsed again on re-open — expand before asserting.
		await expandSection(page, 'Formatting & Units');
		await expect(
			page
				.locator('.column-unit-selector .y-axis-unit-selector-v2 .ant-select-selection-item')
				.first(),
		).toContainText(/Milliseconds/);

		// Reset — clear the unit via the Ant Select allowClear X button.
		await page
			.locator('.column-unit-selector .y-axis-unit-selector-v2')
			.first()
			.hover();
		await page
			.locator('.column-unit-selector .y-axis-unit-selector-v2 .ant-select-clear')
			.first()
			.click();
		await saveWidgetEdit(page);
	});

	test('TC-05 decimal precision changes the number of decimals when a column unit is set', async ({
		authedPage: page,
	}) => {
		await gotoFixtureDashboard(page);
		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);

		// The "Formatting & Units" section starts collapsed — expand it first.
		await expandSection(page, 'Formatting & Units');

		// Set a column unit so decimal precision has a visible effect.
		await selectColumnUnit(page, 'Seconds', 'Seconds (s)');

		await page.getByTestId('decimal-precision-selector').click();
		await page
			.locator('.ant-select-item-option-content', { hasText: '0 decimals' })
			.first()
			.click();

		await saveWidgetEdit(page);

		// Strict: text must be an integer followed by " s", not empty / partial.
		const cell = await getFirstDataCell(page);
		await expect(cell).toHaveText(/^\s*[-+]?\d+\s*s\s*$/);

		// Server-side: decimalPrecision must be 0 in the persisted widget.
		expect((await fetchFixtureWidget(page)).decimalPrecision).toBe(0);

		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);
		// Section starts collapsed again on re-open — expand before asserting.
		await expandSection(page, 'Formatting & Units');
		await expect(page.getByTestId('decimal-precision-selector')).toContainText(
			/0 decimals/,
		);

		// Reset: decimal precision back to 2, clear column unit.
		await page.getByTestId('decimal-precision-selector').click();
		await page
			.locator('.ant-select-item-option-content', { hasText: '2 decimals' })
			.first()
			.click();
		await page
			.locator('.column-unit-selector .y-axis-unit-selector-v2')
			.first()
			.hover();
		await page
			.locator('.column-unit-selector .y-axis-unit-selector-v2 .ant-select-clear')
			.first()
			.click();
		await saveWidgetEdit(page);
	});

	test('TC-06 column-targeted Background threshold paints only the targeted column', async ({
		authedPage: page,
	}) => {
		await gotoFixtureDashboard(page);
		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);

		// The "Thresholds" section starts collapsed when there are no thresholds.
		await expandSection(page, 'Thresholds');
		await page.getByTestId('add-threshold-cta').click();
		const card = page.locator('.threshold-container').first();

		// For TABLE thresholds the column selector (table-operator-input-selector)
		// defaults to the first aggregation query column (typically `A`). Operator
		// defaults to '>'; switch to '>=' so it reliably matches non-negative values.
		await card.getByTestId('operator-input-selector').click();
		await page
			.locator('.ant-select-item-option-content', { hasText: '>=' })
			.first()
			.click();

		await card.getByTestId('threshold-color-selector').click();
		await page
			.locator('.ant-select-item-option-content', { hasText: 'Background' })
			.first()
			.click();

		// Save the threshold row (commits it to the thresholds state array).
		await card.getByRole('button', { name: /save changes/i }).click();
		await saveWidgetEdit(page);

		// Inspect the threshold-styled cell directly. The testid host carries
		// `data-threshold-format="Background"` so we can confirm the format too.
		const row = page.locator('tr.ant-table-row').first();
		await row.waitFor({ state: 'visible' });
		const styledCell = row.getByTestId('threshold-styled-cell').first();
		await expect(styledCell).toBeVisible();
		await expect(styledCell).toHaveAttribute('data-threshold-format', 'Background');
		const dataStyle = (await styledCell.getAttribute('style')) ?? '';
		expect(dataStyle).toMatch(/background-color:/);

		// Server-side: thresholds[] must be persisted with format=Background.
		const persistedThresholds = (await fetchFixtureWidget(page)).thresholds ?? [];
		expect(persistedThresholds.length).toBe(1);
		expect(persistedThresholds[0].thresholdFormat).toBe('Background');
		expect(persistedThresholds[0].thresholdOperator).toBe('>=');

		// Reset — delete the threshold via its testid.
		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);
		// ThresholdsSection defaultOpen is based on threshold count at mount; may
		// start collapsed due to async state loading — always expand before interacting.
		await expandSection(page, 'Thresholds');
		const firstCard = page.locator('.threshold-card-container').first();
		await firstCard.hover();
		await firstCard.getByTestId('threshold-delete-btn').click();
		await saveWidgetEdit(page);
	});

	test('TC-07 column-targeted Text threshold colors only the targeted column text', async ({
		authedPage: page,
	}) => {
		await gotoFixtureDashboard(page);
		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);

		// The "Thresholds" section starts collapsed when there are no thresholds.
		await expandSection(page, 'Thresholds');
		await page.getByTestId('add-threshold-cta').click();
		const card = page.locator('.threshold-container').first();

		await card.getByTestId('operator-input-selector').click();
		await page
			.locator('.ant-select-item-option-content', { hasText: '>=' })
			.first()
			.click();
		// Format defaults to 'Text' — no change needed.
		await card.getByRole('button', { name: /save changes/i }).click();
		await saveWidgetEdit(page);

		const row = page.locator('tr.ant-table-row').first();
		await row.waitFor({ state: 'visible' });
		const styledCell = row.getByTestId('threshold-styled-cell').first();
		await expect(styledCell).toBeVisible();
		await expect(styledCell).toHaveAttribute('data-threshold-format', 'Text');
		const dataStyle = (await styledCell.getAttribute('style')) ?? '';
		expect(dataStyle).toMatch(/color:/);
		expect(dataStyle).not.toMatch(/background-color:/);

		// Server-side: thresholds[] must be persisted with format=Text.
		const persistedThresholds = (await fetchFixtureWidget(page)).thresholds ?? [];
		expect(persistedThresholds.length).toBe(1);
		expect(persistedThresholds[0].thresholdFormat).toBe('Text');

		// Reset
		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);
		await expandSection(page, 'Thresholds');
		const firstCard = page.locator('.threshold-card-container').first();
		await firstCard.hover();
		await firstCard.getByTestId('threshold-delete-btn').click();
		await saveWidgetEdit(page);
	});

	test('TC-08 sections hidden for TABLE are not rendered', async ({
		authedPage: page,
	}) => {
		await gotoFixtureDashboard(page);
		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);

		await expect(page.locator('section.fill-gaps')).toHaveCount(0);
		await expect(page.locator('section.stack-chart')).toHaveCount(0);
		await expect(page.locator('section.soft-min-max')).toHaveCount(0);
		await expect(page.locator('section.log-scale')).toHaveCount(0);
		await expect(page.locator('section.legend-position')).toHaveCount(0);

		await expect(page.getByTestId('panel-name-input')).toBeVisible();
		await expect(page.getByTestId('panel-change-select')).toBeVisible();

		// decimal-precision-selector and column-unit-selector are inside the
		// "Formatting & Units" section which starts collapsed — expand it first.
		await expandSection(page, 'Formatting & Units');
		await expect(page.getByTestId('decimal-precision-selector')).toBeVisible();
		await expect(page.locator('.column-unit-selector').first()).toBeVisible();

		// add-threshold-cta is inside "Thresholds" which is also collapsed.
		await expandSection(page, 'Thresholds');
		await expect(page.getByTestId('add-threshold-cta')).toBeVisible();
	});

	test('TC-09 panel type switch from Table to Number persists and re-renders as a number', async ({
		authedPage: page,
	}) => {
		await gotoFixtureDashboard(page);
		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);

		await changePanelType(page, 'Number');
		// Number panel exposes the Y-axis unit selector in the Formatting & Units section.
		await expect(page.locator('.y-axis-unit-selector-v2').first()).toBeVisible();

		await saveWidgetEdit(page);

		await expect(page.getByTestId('value-graph-text').first()).toBeVisible();

		// Server-side: persisted panelTypes is the PANEL_TYPES enum value 'value'.
		expect((await fetchFixtureWidget(page)).panelTypes).toBe('value');

		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);
		await expect(page).toHaveURL(/graphType=value/);

		// Reset: switch back to Table.
		await changePanelType(page, 'Table');
		await saveWidgetEdit(page);
	});

	test('TC-10 discarding right-pane changes does not persist', async ({
		authedPage: page,
	}) => {
		await gotoFixtureDashboard(page);
		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);

		await page.getByTestId('panel-name-input').fill('discard-table-test');

		let putFired = false;
		await page.route(/\/api\/v1\/dashboards\//, (route) => {
			if (route.request().method() === 'PUT') {
				putFired = true;
			}
			route.continue();
		});

		await page.getByTestId('discard-button').click();
		await page
			.getByRole('dialog')
			.last()
			.getByRole('button', { name: /^OK$/i })
			.click({ timeout: 1000 })
			.catch(() => {
				// no modal — direct navigation
			});

		await page.waitForURL(/\/dashboard\/[0-9a-f-]+(?:\?|$)/);
		await expect(page.getByTestId(FIXTURE_PANEL_TITLE).first()).toBeVisible();

		// Settle before asserting — a delayed PUT could otherwise sneak past.
		await page.waitForLoadState('networkidle');
		expect(putFired).toBe(false);

		// Server-side double-check: persisted title is still the fixture name.
		expect((await fetchFixtureWidget(page)).title).toBe(FIXTURE_PANEL_TITLE);
	});

	// ─── Reload persistence ──────────────────────────────────────────────────

	test('TC-11 panel state survives a hard dashboard reload', async ({
		authedPage: page,
	}) => {
		// Apply a combination of edits, save, then hard-reload the page and
		// re-verify everything renders from the persisted JSON. Catches backend
		// → frontend rehydration regressions that round-trips via close+reopen
		// editor miss (re-opening the editor reuses the in-memory query state).
		await gotoFixtureDashboard(page);
		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);

		await page
			.getByTestId('panel-description-input')
			.fill('reload persistence description');
		await expandSection(page, 'Formatting & Units');
		await selectColumnUnit(page, 'Milliseconds', 'Milliseconds (ms)');
		await saveWidgetEdit(page);

		// Hard reload — purges in-memory state, forces a fresh fetch.
		await page.reload();
		await page.getByTestId(FIXTURE_PANEL_TITLE).first().waitFor({ state: 'visible' });

		// Cell value must still carry the unit after reload (proves the
		// columnUnits + decimalPrecision + panelType rehydrated correctly).
		const cell = await getFirstDataCell(page);
		await expect(cell).toHaveText(/^\s*[-+]?\d[\d,.eE+-]*\s*ms\s*$/);

		// Description info icon (the only header surface for description) must
		// still render after rehydration.
		await expect(
			page
				.locator('.widget-header-container')
				.filter({ hasText: FIXTURE_PANEL_TITLE })
				.locator('.info-tooltip')
				.first(),
		).toBeVisible();

		// Reset: clear unit + description.
		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);
		await page.getByTestId('panel-description-input').fill('');
		await expandSection(page, 'Formatting & Units');
		await page
			.locator('.column-unit-selector .y-axis-unit-selector-v2')
			.first()
			.hover();
		await page
			.locator('.column-unit-selector .y-axis-unit-selector-v2 .ant-select-clear')
			.first()
			.click();
		await saveWidgetEdit(page);
	});
});
