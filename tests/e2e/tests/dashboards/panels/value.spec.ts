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

// All TCs operate on the same fixture panel and toggle its state — they MUST
// run serially within the worker. Project-level fullyParallel still runs this
// file in parallel with other files.
test.describe.configure({ mode: 'serial' });

const FIXTURE_DASHBOARD_TITLE = 'value-controls-fixture';
const FIXTURE_PANEL_TITLE = 'value-controls-panel';

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
		// configureAndSavePanel creates a Time Series panel. Switch it to the
		// Number (VALUE) type before the per-TC bodies run.
		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);
		await changePanelType(page, 'Number');
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
 * Ensure a SettingsSection accordion in the widget editor right pane is
 * expanded. If it is already open (content div has the `open` class), this is
 * a no-op. Otherwise it clicks the header button and waits for the CSS
 * transition to complete. This handles both the common case (collapsed on
 * mount) and the defensive case (already open).
 */
async function expandSection(page: Page, title: string): Promise<void> {
	// Find the settings-section that contains this title in its header.
	const section = page
		.locator('.settings-section')
		.filter({ has: page.locator('button.settings-section-header', { hasText: title }) });

	// Check if the content div already has the `open` class.
	const contentDiv = section.locator('.settings-section-content');
	const isOpen = await contentDiv.evaluate((el) =>
		el.classList.contains('open'),
	);

	if (!isOpen) {
		// Click the header button to open the section.
		await section.locator('button.settings-section-header').click();
		// Wait for the CSS transition to complete (opacity 0→1, max-height 0→1000px).
		await contentDiv.waitFor({ state: 'visible' });
	}
}

/**
 * Select a unit from the Y-axis unit selector dropdown by typing a search
 * term, then clicking the filtered option. The selector has `showSearch`
 * enabled and renders a long virtualised option list — typing first avoids
 * instability from the virtualised list re-rendering when the target option
 * is off-screen.
 */
async function selectYAxisUnit(
	page: Page,
	searchTerm: string,
	optionText: string,
): Promise<void> {
	// Click the outer wrapper to open the dropdown.
	const unitSelect = page.locator('.y-axis-unit-selector-v2 .ant-select').first();
	await unitSelect.click();
	// The Ant Select input is now focused — type to filter the virtual list.
	await page.locator('.y-axis-unit-selector-v2 .ant-select input').first().fill(searchTerm);
	// Wait for the dropdown to show the filtered option, then click it.
	await page
		.locator('.ant-select-item-option-content', { hasText: optionText })
		.first()
		.click();
}

test.describe('Value Panel Controls', () => {
	test('TC-01 panel name persists and is reflected in the widget header', async ({
		authedPage: page,
	}) => {
		await gotoFixtureDashboard(page);
		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);

		await page.getByTestId('panel-name-input').fill('value-controls-renamed');
		await saveWidgetEdit(page);

		await expect(page.getByTestId('value-controls-renamed').first()).toBeVisible();

		await openWidgetEditor(page, 'value-controls-renamed');
		await expect(page.getByTestId('panel-name-input')).toHaveValue(
			'value-controls-renamed',
		);

		// Reset back to fixture title so subsequent TCs locate the panel.
		await page.getByTestId('panel-name-input').fill(FIXTURE_PANEL_TITLE);
		await saveWidgetEdit(page);
	});

	test('TC-02 panel description persists and renders the info icon on the header', async ({
		authedPage: page,
	}) => {
		await gotoFixtureDashboard(page);
		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);

		await page
			.getByTestId('panel-description-input')
			.fill('E2E test description');
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
			'E2E test description',
		);

		// Reset
		await page.getByTestId('panel-description-input').fill('');
		await saveWidgetEdit(page);
	});

	test('TC-03 panel time preference switches from Global Time to Last 15 min and persists', async ({
		authedPage: page,
	}) => {
		await gotoFixtureDashboard(page);
		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);

		const timeButton = page
			.locator('section.panel-time-preference')
			.getByRole('button', { name: /global time/i });
		await timeButton.click();
		await page.getByRole('menuitem', { name: /Last 15 min/i }).click();
		await expect(
			page.locator('section.panel-time-preference').getByRole('button'),
		).toContainText(/Last 15 min/i);

		await saveWidgetEdit(page);

		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);
		await expect(
			page.locator('section.panel-time-preference').getByRole('button'),
		).toContainText(/Last 15 min/i);

		// Reset
		await page
			.locator('section.panel-time-preference')
			.getByRole('button')
			.click();
		await page.getByRole('menuitem', { name: /Global Time/i }).click();
		await saveWidgetEdit(page);
	});

	test('TC-04 Y-axis unit applies a suffix to the rendered value and persists', async ({
		authedPage: page,
	}) => {
		await gotoFixtureDashboard(page);
		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);

		// The "Formatting & Units" section starts collapsed — expand it first.
		await expandSection(page, 'Formatting & Units');

		// The Y-Axis Unit selector has showSearch enabled and a long virtualised
		// option list. Type "Seconds" to filter before clicking.
		await selectYAxisUnit(page, 'Seconds', 'Seconds (s)');

		// Live preview should now render a suffix unit `s`.
		await expect(page.getByTestId('value-graph-suffix-unit').first()).toBeVisible();

		await saveWidgetEdit(page);

		// Back on the dashboard the panel card should also render the suffix.
		await expect(page.getByTestId('value-graph-suffix-unit').first()).toBeVisible();

		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);
		await expandSection(page, 'Formatting & Units');
		await expect(
			page.locator('.y-axis-unit-selector-v2 .ant-select-selection-item').first(),
		).toContainText(/Seconds/);

		// Reset — clear the unit via allowClear (X button on the Ant Select).
		await page.locator('.y-axis-unit-selector-v2').first().hover();
		await page.locator('.y-axis-unit-selector-v2 .ant-select-clear').first().click();
		await saveWidgetEdit(page);
	});

	test('TC-05 decimal precision reformats the rendered value when a unit is set', async ({
		authedPage: page,
	}) => {
		await gotoFixtureDashboard(page);
		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);

		// The "Formatting & Units" section starts collapsed — expand it first.
		await expandSection(page, 'Formatting & Units');

		// Setting a unit is required for decimal precision to have a visible
		// effect — see Known Limitations #3 in the test plan.
		await selectYAxisUnit(page, 'Seconds', 'Seconds (s)');

		await page.getByTestId('decimal-precision-selector').click();
		await page
			.locator('.ant-select-item-option-content', { hasText: '0 decimals' })
			.first()
			.click();

		// Live preview: the numeric text should no longer contain a decimal point.
		await expect(page.getByTestId('value-graph-text').first()).not.toContainText(
			/\./,
		);

		await saveWidgetEdit(page);

		// Dashboard render: same assertion.
		await expect(page.getByTestId('value-graph-text').first()).not.toContainText(
			/\./,
		);

		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);
		await expandSection(page, 'Formatting & Units');
		await expect(page.getByTestId('decimal-precision-selector')).toContainText(
			/0 decimals/,
		);

		// Reset: restore default 2 decimals and clear the unit.
		await page.getByTestId('decimal-precision-selector').click();
		await page
			.locator('.ant-select-item-option-content', { hasText: '2 decimals' })
			.first()
			.click();
		await page.locator('.y-axis-unit-selector-v2').first().hover();
		await page.locator('.y-axis-unit-selector-v2 .ant-select-clear').first().click();
		await saveWidgetEdit(page);
	});

	test('TC-06 Text-format threshold colors the rendered value text and persists', async ({
		authedPage: page,
	}) => {
		await gotoFixtureDashboard(page);
		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);

		// The "Thresholds" section starts collapsed when there are no thresholds
		// (defaultOpen={!!thresholds.length}) — expand it first.
		await expandSection(page, 'Thresholds');
		await page.getByTestId('add-threshold-cta').click();

		// VALUE panels do not render a threshold label input — only operator,
		// value, unit, format (Text/Background), and color. Defaults: operator
		// '>', format 'Text', value 0, color 'Red'. We force operator to '>=' so
		// the threshold reliably matches non-negative values.
		const thresholdCard = page.locator('.threshold-container').first();
		await thresholdCard
			.getByTestId('operator-input-selector')
			.click();
		await page
			.locator('.ant-select-item-option-content', { hasText: '>=' })
			.first()
			.click();

		// Save the threshold row (commits it to the thresholds state array). The
		// dashboard PUT still needs `saveWidgetEdit` after this.
		await thresholdCard.getByRole('button', { name: /save changes/i }).click();

		await saveWidgetEdit(page);

		// Dashboard render: value text should now carry an inline color style.
		const valueText = page.getByTestId('value-graph-text').first();
		await expect(valueText).toBeVisible();
		const inlineStyle = await valueText.getAttribute('style');
		expect(inlineStyle).toMatch(/color:/);

		// Re-open editor and verify the threshold round-tripped.
		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);
		// The ThresholdsSection defaultOpen is based on threshold count at mount
		// time; due to async state loading it may start collapsed. Expand it.
		await expandSection(page, 'Thresholds');
		await expect(
			page.locator('.threshold-container').first(),
		).toBeVisible();

		// Reset — delete the threshold. The delete button is `display:none` by
		// default and revealed only on `.threshold-card-container:hover`; hover
		// the card so the CSS :hover rule activates, then click via testid.
		const firstCard = page.locator('.threshold-card-container').first();
		await firstCard.hover();
		// TODO: switch to `getByTestId('threshold-delete-btn')` once the frontend
		// build deployed to the test stack includes the new testid (added in
		// Threshold.tsx). The class-based fallback is robust meanwhile.
		await firstCard.locator('button.delete-btn').click();
		await saveWidgetEdit(page);
	});

	test('TC-07 Background-format threshold paints the value container background', async ({
		authedPage: page,
	}) => {
		await gotoFixtureDashboard(page);
		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);

		// The "Thresholds" section starts collapsed when there are no thresholds.
		await expandSection(page, 'Thresholds');
		await page.getByTestId('add-threshold-cta').click();
		const thresholdCard = page.locator('.threshold-container').first();

		// Set operator >= and switch format from Text to Background.
		await thresholdCard.getByTestId('operator-input-selector').click();
		await page
			.locator('.ant-select-item-option-content', { hasText: '>=' })
			.first()
			.click();

		await thresholdCard.getByTestId('threshold-color-selector').click();
		await page
			.locator('.ant-select-item-option-content', { hasText: 'Background' })
			.first()
			.click();

		await thresholdCard.getByRole('button', { name: /save changes/i }).click();
		await saveWidgetEdit(page);

		// Dashboard render: .value-graph-container should now have an inline
		// background-color style. TODO: switch to `getByTestId('value-graph-container')`
		// once the frontend build deployed to the test stack picks up the testid
		// added in ValueGraph/index.tsx.
		const container = page.locator('.value-graph-container').first();
		await expect(container).toBeVisible();
		const inlineStyle = await container.getAttribute('style');
		expect(inlineStyle).toMatch(/background-color:/);

		// Reset
		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);
		// ThresholdsSection may start collapsed even with thresholds — always
		// expand before interacting with threshold cards.
		await expandSection(page, 'Thresholds');
		// Edit/delete buttons are display:none by default, revealed on :hover.
		const firstCard = page.locator('.threshold-card-container').first();
		await firstCard.hover();
		// TODO: switch to `getByTestId('threshold-delete-btn')` once the frontend
		// build deployed to the test stack includes the new testid (added in
		// Threshold.tsx). The class-based fallback is robust meanwhile.
		await firstCard.locator('button.delete-btn').click();
		await saveWidgetEdit(page);
	});

	test('TC-08 clearing the Y-axis unit removes the suffix from the rendered value', async ({
		authedPage: page,
	}) => {
		await gotoFixtureDashboard(page);
		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);

		// The "Formatting & Units" section starts collapsed — expand it first.
		await expandSection(page, 'Formatting & Units');

		// Apply a unit first.
		await selectYAxisUnit(page, 'Seconds', 'Seconds (s)');
		await saveWidgetEdit(page);
		await expect(page.getByTestId('value-graph-suffix-unit').first()).toBeVisible();

		// Clear it.
		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);
		await expandSection(page, 'Formatting & Units');
		await page.locator('.y-axis-unit-selector-v2').first().hover();
		await page.locator('.y-axis-unit-selector-v2 .ant-select-clear').first().click();
		await saveWidgetEdit(page);

		// Suffix should be gone from the rendered panel.
		await expect(page.getByTestId('value-graph-suffix-unit')).toHaveCount(0);
	});

	test('TC-09 panel type switch from Number to Time Series persists and re-renders', async ({
		authedPage: page,
	}) => {
		await gotoFixtureDashboard(page);
		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);

		await changePanelType(page, 'Time Series');
		// Time Series exposes Fill gaps — confirm the right pane re-rendered.
		await expect(page.locator('section.fill-gaps')).toBeVisible();

		await saveWidgetEdit(page);

		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);
		await expect(page).toHaveURL(/graphType=graph/);

		// Reset: switch back to Number for downstream TCs.
		await changePanelType(page, 'Number');
		await saveWidgetEdit(page);
	});

	test('TC-10 sections hidden for VALUE are not rendered in the right pane', async ({
		authedPage: page,
	}) => {
		await gotoFixtureDashboard(page);
		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);

		// Hidden by the panel-type matrix for VALUE — these sections are not
		// rendered in the DOM at all (conditionally excluded by RightContainer).
		await expect(page.locator('section.soft-min-max')).toHaveCount(0);
		await expect(page.locator('section.log-scale')).toHaveCount(0);
		await expect(page.locator('section.legend-position')).toHaveCount(0);
		await expect(page.locator('section.fill-gaps')).toHaveCount(0);
		await expect(page.locator('section.stack-chart')).toHaveCount(0);

		// Expected to be present in the always-open General and Visualization
		// sections.
		await expect(page.getByTestId('panel-name-input')).toBeVisible();
		await expect(page.getByTestId('panel-change-select')).toBeVisible();

		// The "Formatting & Units" section is collapsed on open — expand it to
		// verify the controls are rendered for VALUE.
		await expandSection(page, 'Formatting & Units');
		await expect(page.getByTestId('decimal-precision-selector')).toBeVisible();

		// The "Thresholds" section is collapsed when there are no thresholds —
		// expand it to verify the Add Threshold CTA is rendered for VALUE.
		await expandSection(page, 'Thresholds');
		await expect(page.getByTestId('add-threshold-cta')).toBeVisible();
	});

	test('TC-11 discarding right-pane changes does not persist or visually update', async ({
		authedPage: page,
	}) => {
		await gotoFixtureDashboard(page);
		await openWidgetEditor(page, FIXTURE_PANEL_TITLE);

		await page.getByTestId('panel-name-input').fill('discard-value-test');

		let putFired = false;
		await page.route(/\/api\/v1\/dashboards\//, (route) => {
			if (route.request().method() === 'PUT') {
				putFired = true;
			}
			route.continue();
		});

		await page.getByTestId('discard-button').click();
		// If a discard confirmation appears, OK it. Right-pane-only changes
		// usually don't trigger one.
		const confirmDialog = page.getByRole('dialog').last();
		await confirmDialog
			.getByRole('button', { name: /^OK$/i })
			.click({ timeout: 1000 })
			.catch(() => {
				// no modal — the editor navigated away immediately
			});

		await page.waitForURL(/\/dashboard\/[0-9a-f-]+(?:\?|$)/);
		await expect(page.getByTestId(FIXTURE_PANEL_TITLE).first()).toBeVisible();
		expect(putFired).toBe(false);
	});
});
