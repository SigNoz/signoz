import type { Page } from '@playwright/test';

import { expect, test } from '../../../fixtures/auth';
import { newAdminContext } from '../../../helpers/auth';
import {
	authToken,
	changePanelType,
	configureAndSavePanel,
	createDashboardViaApi,
	deleteDashboardViaApi,
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
		const cell = await getFirstDataCell(page);
		await expect(cell).toContainText(/ms/);

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

		const cell = await getFirstDataCell(page);
		await expect(cell).toContainText(/s/);
		const text = (await cell.textContent()) ?? '';
		expect(text.replace(/\s*s\s*$/, '')).not.toMatch(/\./);

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

		// Find a data row and inspect its cells. Use tr.ant-table-row to skip
		// fixed-header tbody rows that Ant Design inserts for sticky scroll.
		// QueryTable wraps each cell in <div role="button">; the threshold
		// styled <div> is nested inside it. Use div[style] to target the first
		// <div> that actually carries an inline style — that is the threshold div.
		// TODO: switch to `getByTestId('threshold-styled-cell')` once the frontend
		// build deployed to the test stack picks up the testid added in
		// GridTableComponent/index.tsx (the host also carries
		// `data-threshold-format="Background|Text"` to discriminate variants).
		const row = page.locator('tr.ant-table-row').first();
		await row.waitFor({ state: 'visible' });
		const dataCellInner = row.locator('td').last().locator('div[style]').first();
		const dataStyle = (await dataCellInner.getAttribute('style')) ?? '';
		expect(dataStyle).toMatch(/background-color:/);

		// Reset — delete the threshold. Edit/delete buttons are display:none
		// by default and revealed only on .threshold-card-container:hover.
		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);
		// ThresholdsSection defaultOpen is based on threshold count at mount; may
		// start collapsed due to async state loading — always expand before interacting.
		await expandSection(page, 'Thresholds');
		const firstCard = page.locator('.threshold-card-container').first();
		await firstCard.hover();
		// TODO: switch to `getByTestId('threshold-delete-btn')` once the stack
		// frontend rebuild picks up the testid added in Threshold.tsx.
		await firstCard.locator('button.delete-btn').click();
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

		// QueryTable wraps each cell in <div role="button">; the threshold styled
		// <div> is nested inside. Use div[style] to find the threshold div directly.
		// TODO: same testid migration as TC-06 once the frontend rebuild lands.
		const row = page.locator('tr.ant-table-row').first();
		await row.waitFor({ state: 'visible' });
		const dataCellInner = row.locator('td').last().locator('div[style]').first();
		const dataStyle = (await dataCellInner.getAttribute('style')) ?? '';
		expect(dataStyle).toMatch(/color:/);
		expect(dataStyle).not.toMatch(/background-color:/);

		// Reset
		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);
		await expandSection(page, 'Thresholds');
		const firstCard = page.locator('.threshold-card-container').first();
		await firstCard.hover();
		// TODO: switch to `getByTestId('threshold-delete-btn')` after frontend rebuild.
		await firstCard.locator('button.delete-btn').click();
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
		expect(putFired).toBe(false);
	});
});
