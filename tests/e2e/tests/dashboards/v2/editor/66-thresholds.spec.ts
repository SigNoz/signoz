import type { Locator, Page } from '@playwright/test';

import { expect, test } from '../../../../fixtures/dashboards';
import { PanelKind } from '../../../../helpers/dashboard-v2-spec';
import { getDashboardV2ViaApi } from '../../../../helpers/dashboards-v2';
import {
	Section,
	collapseSection,
	expandSection,
	savePanel,
	sectionToggle,
	selectOption,
} from '../../../../helpers/panel-editor-v2';
import {
	QueryRange,
	mockQueryRange,
} from '../../../../helpers/query-range-mock';
import {
	SINGLE_PANEL_ID,
	singlePanelDashboard,
} from '../../../../testdata/v2/panels-dashboard';

/** A Number panel whose value is pinned, so threshold crossings are exact. */
const PINNED_VALUE = 100;

function pinnedNumberValue(page: Parameters<typeof mockQueryRange>[0]) {
	return mockQueryRange(
		page,
		QueryRange.scalar({ aggregationColumns: ['A'], rows: [[PINNED_VALUE]] }),
	);
}

/** Inline background on a table cell — set only while a background threshold matches. */
async function cellBackground(cell: Locator): Promise<string> {
	return cell.evaluate((node) => (node as HTMLElement).style.backgroundColor);
}

/** The threshold's target column is derived from the live result, so don't assume its name. */
async function pickFirstOption(
	page: Page,
	triggerTestId: string,
): Promise<void> {
	await page.getByTestId(triggerTestId).click();
	await page
		.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)')
		.locator('.ant-select-item-option')
		.first()
		.click();
}

/** Inline colour on the rendered value — set only while a threshold matches. */
async function renderedValueColor(
	page: Parameters<typeof mockQueryRange>[0],
): Promise<string> {
	return page
		.getByTestId('number-panel-value')
		.evaluate((node) => (node as HTMLElement).style.color);
}

// Scope: the Thresholds section across its three variants, and the row
// lifecycle.
//
// Variant follows panel kind, not a user control: label → TimeSeries/Bar,
// comparison → Number, table → Table. The add button's testid varies with it.

const AddButton = {
	label: 'panel-editor-v2-add-threshold',
	comparison: 'panel-editor-v2-add-comparison-threshold',
	table: 'panel-editor-v2-add-table-threshold',
} as const;

async function savedThresholds(
	page: Parameters<typeof getDashboardV2ViaApi>[0],
	dashboardId: string,
): Promise<{ value?: number; color?: string; label?: string }[]> {
	const after = await getDashboardV2ViaApi(page, dashboardId);
	const spec = after.spec.panels[SINGLE_PANEL_ID].spec.plugin.spec as {
		thresholds?: { value?: number; color?: string; label?: string }[];
	};
	return spec.thresholds ?? [];
}

test.describe('Dashboards V2 — editor thresholds', () => {
	test('TC-01 a TimeSeries panel gets the label variant', async ({
		authedPage: page,
		dashboards,
	}) => {
		await dashboards.seedAndEdit(singlePanelDashboard(), SINGLE_PANEL_ID);

		await expandSection(page, Section.thresholds);
		await expect(page.getByTestId(AddButton.label)).toBeVisible();
		await expect(page.getByTestId(AddButton.comparison)).toHaveCount(0);
		await expect(page.getByTestId(AddButton.table)).toHaveCount(0);
	});

	test('TC-02 a Number panel gets the comparison variant', async ({
		authedPage: page,
		dashboards,
	}) => {
		await dashboards.seedAndEdit(
			singlePanelDashboard({ kind: PanelKind.Number }),
			SINGLE_PANEL_ID,
		);

		await expandSection(page, Section.thresholds);
		await expect(page.getByTestId(AddButton.comparison)).toBeVisible();
		await expect(page.getByTestId(AddButton.label)).toHaveCount(0);
	});

	test('TC-03 a Table panel gets the table variant', async ({
		authedPage: page,
		dashboards,
	}) => {
		await dashboards.seedAndEdit(
			singlePanelDashboard({ kind: PanelKind.Table }),
			SINGLE_PANEL_ID,
		);

		await expandSection(page, Section.thresholds);
		await expect(page.getByTestId(AddButton.table)).toBeVisible();
		await expect(page.getByTestId(AddButton.label)).toHaveCount(0);
	});

	test('TC-04 adding a threshold and saving persists it', async ({
		authedPage: page,
		dashboards,
	}) => {
		const id = await dashboards.seedAndEdit(
			singlePanelDashboard(),
			SINGLE_PANEL_ID,
		);

		await expandSection(page, Section.thresholds);
		await page.getByTestId(AddButton.label).click();

		await page.getByTestId('threshold-value-0').fill('42');
		await page.getByTestId('threshold-label-0').fill('Too high');
		await page.getByTestId('threshold-save-0').click();
		await savePanel(page);

		const thresholds = await savedThresholds(page, id);
		expect(thresholds).toHaveLength(1);
		expect(thresholds[0]).toMatchObject({ value: 42, label: 'Too high' });
	});

	test('TC-05 the header quick-add expands a collapsed section and adds a row', async ({
		authedPage: page,
		dashboards,
	}) => {
		await dashboards.seedAndEdit(singlePanelDashboard(), SINGLE_PANEL_ID);

		// One click must both expand and add (SectionSlot's pendingAction hop).
		await collapseSection(page, Section.thresholds);
		await page.getByTestId('panel-editor-v2-add-threshold-header').click();

		await expect(sectionToggle(page, Section.thresholds)).toHaveAttribute(
			'aria-expanded',
			'true',
		);
		await expect(page.getByTestId('threshold-value-0')).toBeVisible();
	});

	test('TC-06 only one row is editable at a time', async ({
		authedPage: page,
		dashboards,
	}) => {
		await dashboards.seedAndEdit(singlePanelDashboard(), SINGLE_PANEL_ID);

		await expandSection(page, Section.thresholds);
		await page.getByTestId(AddButton.label).click();
		await page.getByTestId('threshold-value-0').fill('10');
		await page.getByTestId('threshold-save-0').click();

		// The first row must fall back to its summary.
		await page.getByTestId(AddButton.label).click();
		await expect(page.getByTestId('threshold-value-1')).toBeVisible();
		await expect(page.getByTestId('threshold-value-0')).toHaveCount(0);
	});

	test('TC-07 discarding a freshly added row removes it entirely', async ({
		authedPage: page,
		dashboards,
	}) => {
		await dashboards.seedAndEdit(singlePanelDashboard(), SINGLE_PANEL_ID);

		await expandSection(page, Section.thresholds);
		await page.getByTestId(AddButton.label).click();
		await page.getByTestId('threshold-value-0').fill('7');

		// Discard on a NEW row deletes it.
		await page.getByTestId('threshold-discard-0').click();
		await expect(page.getByTestId('threshold-value-0')).toHaveCount(0);
		await expect(page.getByTestId('threshold-edit-0')).toHaveCount(0);
	});

	test('TC-08 discarding an existing row restores its previous value', async ({
		authedPage: page,
		dashboards,
	}) => {
		const id = await dashboards.seedAndEdit(
			singlePanelDashboard({
				pluginSpec: { thresholds: [{ value: 11, color: 'Red' }] },
			}),
			SINGLE_PANEL_ID,
		);

		await expandSection(page, Section.thresholds);
		await page.getByTestId('threshold-edit-0').click();
		await page.getByTestId('threshold-value-0').fill('999');

		// Discard on an EXISTING row restores the snapshot.
		await page.getByTestId('threshold-discard-0').click();
		await savePanel(page);

		const thresholds = await savedThresholds(page, id);
		expect(thresholds).toHaveLength(1);
		expect(thresholds[0].value).toBe(11);
	});

	test('TC-09 a threshold can be removed', async ({
		authedPage: page,
		dashboards,
	}) => {
		const id = await dashboards.seedAndEdit(
			singlePanelDashboard({
				pluginSpec: { thresholds: [{ value: 11, color: 'Red' }] },
			}),
			SINGLE_PANEL_ID,
		);

		await expandSection(page, Section.thresholds);
		await page.getByTestId('threshold-remove-0').click();
		await savePanel(page);

		expect(await savedThresholds(page, id)).toHaveLength(0);
	});

	test('TC-11 a crossed threshold colours the rendered value', async ({
		authedPage: page,
		dashboards,
	}) => {
		// A renderer ignoring `thresholds` would still save the right JSON, so
		// assert the PANEL: value pinned at 100, threshold fires above 50.
		await pinnedNumberValue(page);
		await dashboards.seedAndEdit(
			singlePanelDashboard({
				kind: PanelKind.Number,
				pluginSpec: {
					thresholds: [
						{
							value: 50,
							color: 'Red',
							operator: 'above',
							format: 'text',
						},
					],
				},
			}),
			SINGLE_PANEL_ID,
		);

		await expect(page.getByTestId('number-panel-value')).toBeVisible();
		await expect.poll(() => renderedValueColor(page)).not.toBe('');
	});

	test('TC-12 raising the threshold past the value clears the colour live', async ({
		authedPage: page,
		dashboards,
	}) => {
		await pinnedNumberValue(page);
		await dashboards.seedAndEdit(
			singlePanelDashboard({
				kind: PanelKind.Number,
				pluginSpec: {
					thresholds: [
						{ value: 50, color: 'Red', operator: 'above', format: 'text' },
					],
				},
			}),
			SINGLE_PANEL_ID,
		);
		await expect.poll(() => renderedValueColor(page)).not.toBe('');

		// Edits stream into the preview as you type — no Run, no Save.
		await expandSection(page, Section.thresholds);
		await page.getByTestId('comparison-threshold-edit-0').click();
		await page.getByTestId('comparison-threshold-value-0').fill('500');

		await expect.poll(() => renderedValueColor(page)).toBe('');
	});

	test('TC-13 the threshold colour survives save and shows on the dashboard', async ({
		authedPage: page,
		dashboards,
	}) => {
		await pinnedNumberValue(page);
		const id = await dashboards.seedAndEdit(
			singlePanelDashboard({ kind: PanelKind.Number }),
			SINGLE_PANEL_ID,
		);

		await expandSection(page, Section.thresholds);
		await page.getByTestId(AddButton.comparison).click();
		await page.getByTestId('comparison-threshold-value-0').fill('50');
		await selectOption(page, 'comparison-threshold-operator-0', 'Above (>)');
		await page.getByTestId('comparison-threshold-save-0').click();
		await savePanel(page);

		// End-to-end: the saved panel on the dashboard renders the colour.
		await page.waitForURL(new RegExp(`/dashboard/${id}(\\?|$)`));
		await expect(page.getByTestId('number-panel-value')).toBeVisible();
		await expect.poll(() => renderedValueColor(page)).not.toBe('');
	});

	test('TC-14 a table threshold paints the targeted cell background', async ({
		authedPage: page,
		dashboards,
	}) => {
		// The column key is derived from the live result, so pick it from the
		// dropdown; ">= 0" fires on any non-negative value.
		const id = await dashboards.seedAndEdit(
			singlePanelDashboard({ kind: PanelKind.Table }),
			SINGLE_PANEL_ID,
		);
		await expect(page.getByTestId('table-panel-renderer')).toBeVisible();

		const valueCell = page
			.getByTestId('table-panel-renderer')
			.locator('tbody tr.ant-table-row')
			.first()
			.locator('td')
			.last();
		await expect(valueCell).toBeVisible();
		expect(await cellBackground(valueCell)).toBe('');

		await expandSection(page, Section.thresholds);
		await page.getByTestId(AddButton.table).click();
		await pickFirstOption(page, 'table-threshold-column-0');
		await page.getByTestId('table-threshold-value-0').fill('0');
		await selectOption(page, 'table-threshold-operator-0', 'Above or equal');
		await selectOption(page, 'table-threshold-format-0', 'Background');
		await page.getByTestId('table-threshold-save-0').click();

		// Live in the preview, before saving.
		await expect.poll(() => cellBackground(valueCell)).not.toBe('');

		await savePanel(page);

		// And on the saved panel back on the dashboard.
		await page.waitForURL(new RegExp(`/dashboard/${id}(\\?|$)`));
		const savedCell = page
			.getByTestId('table-panel-renderer')
			.locator('tbody tr.ant-table-row')
			.first()
			.locator('td')
			.last();
		await expect(savedCell).toBeVisible();
		await expect.poll(() => cellBackground(savedCell)).not.toBe('');
	});

	test('TC-15 the text format colours the value, not the cell', async ({
		authedPage: page,
		dashboards,
	}) => {
		await dashboards.seedAndEdit(
			singlePanelDashboard({ kind: PanelKind.Table }),
			SINGLE_PANEL_ID,
		);
		await expect(page.getByTestId('table-panel-renderer')).toBeVisible();

		const valueCell = page
			.getByTestId('table-panel-renderer')
			.locator('tbody tr.ant-table-row')
			.first()
			.locator('td')
			.last();
		await expect(valueCell).toBeVisible();

		await expandSection(page, Section.thresholds);
		await page.getByTestId(AddButton.table).click();
		await pickFirstOption(page, 'table-threshold-column-0');
		await page.getByTestId('table-threshold-value-0').fill('0');
		await selectOption(page, 'table-threshold-operator-0', 'Above or equal');
		await selectOption(page, 'table-threshold-format-0', 'Text');
		await page.getByTestId('table-threshold-save-0').click();

		// Text recolours the value; background paints the cell. Not interchangeable.
		await expect
			.poll(async () => valueCell.locator('span[style*="color"]').count())
			.toBeGreaterThan(0);
		expect(await cellBackground(valueCell)).toBe('');
	});

	test('TC-10 the comparison variant persists its operator and display mode', async ({
		authedPage: page,
		dashboards,
	}) => {
		const id = await dashboards.seedAndEdit(
			singlePanelDashboard({ kind: PanelKind.Number }),
			SINGLE_PANEL_ID,
		);

		await expandSection(page, Section.thresholds);
		await page.getByTestId(AddButton.comparison).click();

		await page.getByTestId('comparison-threshold-value-0').fill('5');
		await selectOption(page, 'comparison-threshold-operator-0', 'Below (<)');
		await selectOption(page, 'comparison-threshold-format-0', 'Background');
		await page.getByTestId('comparison-threshold-save-0').click();
		await savePanel(page);

		const after = await getDashboardV2ViaApi(page, id);
		const thresholds = (
			after.spec.panels[SINGLE_PANEL_ID].spec.plugin.spec as {
				thresholds?: { operator?: string; format?: string; value?: number }[];
			}
		).thresholds;
		expect(thresholds?.[0]).toMatchObject({
			value: 5,
			operator: 'below',
			format: 'background',
		});
	});
});
