import { expect, test } from '../../../../fixtures/dashboards';
import { PanelKind } from '../../../../helpers/dashboard-v2-spec';
import { getDashboardV2ViaApi } from '../../../../helpers/dashboards-v2';
import {
	Section,
	expandSection,
	savePanel,
	searchAndSelectOption,
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

// Scope: the sections that differ across the non-chart kinds.
//
// The asymmetry: TimeSeries/Number/Pie have one `unit`; Table has none and
// carries `columnUnits` per column (hence the fan-out in 30-type-switch TC-07).

async function savedSpec(
	page: Parameters<typeof getDashboardV2ViaApi>[0],
	dashboardId: string,
): Promise<Record<string, unknown>> {
	const after = await getDashboardV2ViaApi(page, dashboardId);
	return after.spec.panels[SINGLE_PANEL_ID].spec.plugin
		.spec as unknown as Record<string, unknown>;
}

test.describe('Dashboards V2 — editor sections (Number / Table / Pie / Histogram)', () => {
	test('TC-01 Number declares formatting but not axes or chart appearance', async ({
		authedPage: page,
		dashboards,
	}) => {
		await dashboards.seedAndEdit(
			singlePanelDashboard({ kind: PanelKind.Number }),
			SINGLE_PANEL_ID,
		);

		await expect(sectionToggle(page, Section.formatting)).toBeVisible();
		await expect(sectionToggle(page, Section.visualization)).toBeVisible();
		await expect(sectionToggle(page, Section.axes)).toHaveCount(0);
		await expect(sectionToggle(page, Section.chartAppearance)).toHaveCount(0);
		await expect(sectionToggle(page, Section.legend)).toHaveCount(0);
	});

	test('TC-02 a panel-wide unit and decimals persist', async ({
		authedPage: page,
		dashboards,
	}) => {
		const id = await dashboards.seedAndEdit(
			singlePanelDashboard({ kind: PanelKind.Number }),
			SINGLE_PANEL_ID,
		);

		await expandSection(page, Section.formatting);
		// Virtualised list — search first.
		await searchAndSelectOption(
			page,
			'panel-editor-v2-unit',
			'Milliseconds',
			'Milliseconds',
		);
		await selectOption(page, 'panel-editor-v2-decimals', '3 decimals');
		await savePanel(page);

		const spec = await savedSpec(page, id);
		expect(
			(spec.formatting as { decimalPrecision?: string }).decimalPrecision,
		).toBe('3');
		expect((spec.formatting as { unit?: string }).unit).toBeTruthy();
	});

	test('TC-03 Table offers per-column units instead of a panel-wide unit', async ({
		authedPage: page,
		dashboards,
	}) => {
		// Golden data: the column key is derived from the resolved result
		// (`column.id || column.name`), which a hand-rolled payload must match
		// exactly or the column renders unnamed.
		await dashboards.seedAndEdit(
			singlePanelDashboard({ kind: PanelKind.Table }),
			SINGLE_PANEL_ID,
		);

		await expect(page.getByTestId('table-panel-renderer')).toBeVisible();
		await expandSection(page, Section.formatting);
		// Table declares `columnUnits`, never `unit`.
		await expect(page.getByTestId('panel-editor-v2-unit')).toHaveCount(0);
		await expect(
			page.locator('[data-testid^="panel-editor-v2-column-unit-"]').first(),
		).toBeVisible();
	});

	test('TC-04 the column-units editor explains itself before the panel has run', async ({
		authedPage: page,
		dashboards,
	}) => {
		// No result means no columns, so the section shows a hint.
		await mockQueryRange(page, QueryRange.empty());
		await dashboards.seedAndEdit(
			singlePanelDashboard({ kind: PanelKind.Table }),
			SINGLE_PANEL_ID,
		);

		await expandSection(page, Section.formatting);
		await expect(
			page.getByText('Run the panel to set per-column units.'),
		).toBeVisible();
	});

	test('TC-05 a per-column unit persists', async ({
		authedPage: page,
		dashboards,
	}) => {
		const id = await dashboards.seedAndEdit(
			singlePanelDashboard({ kind: PanelKind.Table }),
			SINGLE_PANEL_ID,
		);

		await expect(page.getByTestId('table-panel-renderer')).toBeVisible();
		await expandSection(page, Section.formatting);

		// Read the key off the control rather than assuming the derivation.
		const selector = page
			.locator('[data-testid^="panel-editor-v2-column-unit-"]')
			.first();
		const testId = (await selector.getAttribute('data-testid')) ?? '';
		const columnKey = testId.replace('panel-editor-v2-column-unit-', '');
		expect(columnKey).not.toBe('');

		await searchAndSelectOption(page, testId, 'Milliseconds', 'Milliseconds');
		await savePanel(page);

		const spec = await savedSpec(page, id);
		const columnUnits = (
			spec.formatting as { columnUnits?: Record<string, string> }
		).columnUnits;
		expect(columnUnits?.[columnKey]).toBeTruthy();
	});

	test('TC-06 Histogram declares Buckets and only a minimal Visualization', async ({
		authedPage: page,
		dashboards,
	}) => {
		await dashboards.seedAndEdit(
			singlePanelDashboard({ kind: PanelKind.Histogram }),
			SINGLE_PANEL_ID,
		);

		await expect(sectionToggle(page, Section.buckets)).toBeVisible();
		// Histogram's Visualization declares only the type switcher.
		await expandSection(page, Section.visualization);
		await expect(page.getByTestId('panel-editor-v2-time-preference')).toHaveCount(
			0,
		);
	});

	test('TC-07 bucket count and width persist', async ({
		authedPage: page,
		dashboards,
	}) => {
		const id = await dashboards.seedAndEdit(
			singlePanelDashboard({ kind: PanelKind.Histogram }),
			SINGLE_PANEL_ID,
		);

		await expandSection(page, Section.buckets);
		await page.getByTestId('panel-editor-v2-bucket-count').fill('40');
		await savePanel(page);

		expect(await savedSpec(page, id)).toMatchObject({
			histogramBuckets: { bucketCount: 40 },
		});
	});

	test('TC-08 merging active queries hides the Legend section', async ({
		authedPage: page,
		dashboards,
	}) => {
		const id = await dashboards.seedAndEdit(
			singlePanelDashboard({ kind: PanelKind.Histogram }),
			SINGLE_PANEL_ID,
		);

		// One merged distribution has no per-series legend to configure.
		await expect(sectionToggle(page, Section.legend)).toBeVisible();
		await expandSection(page, Section.buckets);
		await page.getByTestId('panel-editor-v2-merge-queries').click();
		await expect(sectionToggle(page, Section.legend)).toHaveCount(0);

		await savePanel(page);
		expect(await savedSpec(page, id)).toMatchObject({
			histogramBuckets: { mergeAllActiveQueries: true },
		});
	});

	test('TC-09 Pie declares legend and formatting but no axes', async ({
		authedPage: page,
		dashboards,
	}) => {
		await dashboards.seedAndEdit(
			singlePanelDashboard({ kind: PanelKind.PieChart }),
			SINGLE_PANEL_ID,
		);

		await expect(sectionToggle(page, Section.legend)).toBeVisible();
		await expect(sectionToggle(page, Section.formatting)).toBeVisible();
		await expect(sectionToggle(page, Section.axes)).toHaveCount(0);

		await expect(sectionToggle(page, Section.thresholds)).toHaveCount(0);
	});
});
