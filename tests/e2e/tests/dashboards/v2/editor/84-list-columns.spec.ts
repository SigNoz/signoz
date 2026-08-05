import { expect, test } from '../../../../fixtures/dashboards';
import {
	PanelKind,
	logsCountQuery,
	rawQuery,
} from '../../../../helpers/dashboard-v2-spec';
import { getDashboardV2ViaApi } from '../../../../helpers/dashboards-v2';
import { editor, savePanel } from '../../../../helpers/panel-editor-v2';
import {
	SINGLE_PANEL_ID,
	singlePanelDashboard,
} from '../../../../testdata/v2/panels-dashboard';

// Scope: the List columns editor — the one per-kind control that lives in the
// query builder's footer rather than the ConfigPane. Persists to
// `plugin.spec.selectFields`.

async function savedFields(
	page: Parameters<typeof getDashboardV2ViaApi>[0],
	dashboardId: string,
): Promise<{ name?: string }[]> {
	const after = await getDashboardV2ViaApi(page, dashboardId);
	const spec = after.spec.panels[SINGLE_PANEL_ID].spec.plugin.spec as {
		selectFields?: { name?: string }[];
	};
	return spec.selectFields ?? [];
}

function listDashboard(fields?: { name: string; signal?: 'logs' }[]) {
	return singlePanelDashboard({
		kind: PanelKind.List,
		query: rawQuery({ signal: 'logs' }),
		...(fields ? { pluginSpec: { selectFields: fields } } : {}),
	});
}

test.describe('Dashboards V2 — editor list columns', () => {
	test('TC-01 the columns editor renders only for List panels', async ({
		authedPage: page,
		dashboards,
	}) => {
		await dashboards.seedAndEdit(listDashboard(), SINGLE_PANEL_ID);
		await expect(page.getByTestId('list-columns-editor')).toBeVisible();
	});

	test('TC-02 a TimeSeries panel has no columns editor', async ({
		authedPage: page,
		dashboards,
	}) => {
		await dashboards.seedAndEdit(singlePanelDashboard(), SINGLE_PANEL_ID);
		await expect(editor.queryBuilder(page)).toBeVisible();
		await expect(page.getByTestId('list-columns-editor')).toHaveCount(0);
	});

	test('TC-03 seeded columns render as chips', async ({
		authedPage: page,
		dashboards,
	}) => {
		await dashboards.seedAndEdit(
			listDashboard([
				{ name: 'timestamp', signal: 'logs' },
				{ name: 'body', signal: 'logs' },
			]),
			SINGLE_PANEL_ID,
		);

		await expect(page.getByTestId('list-column-chip-timestamp')).toBeVisible();
		await expect(page.getByTestId('list-column-chip-body')).toBeVisible();
	});

	test('TC-04 a column can be removed and the removal persists', async ({
		authedPage: page,
		dashboards,
	}) => {
		const id = await dashboards.seedAndEdit(
			listDashboard([
				{ name: 'timestamp', signal: 'logs' },
				{ name: 'body', signal: 'logs' },
			]),
			SINGLE_PANEL_ID,
		);

		await page.getByTestId('list-column-remove-body').click();
		await expect(page.getByTestId('list-column-chip-body')).toHaveCount(0);
		await savePanel(page);

		const fields = await savedFields(page, id);
		expect(fields.map((field) => field.name)).not.toContain('body');
	});

	test('TC-05 a custom column can be added by free text', async ({
		authedPage: page,
		dashboards,
	}) => {
		const id = await dashboards.seedAndEdit(
			listDashboard([{ name: 'timestamp', signal: 'logs' }]),
			SINGLE_PANEL_ID,
		);

		await page.getByTestId('list-columns-add').click();
		await page.getByTestId('list-columns-search').fill('my_custom_field');

		// Explicit "Add …" entry, so a typo can't be committed by blurring.
		await page.getByTestId('list-columns-add-custom').click();
		await expect(
			page.getByTestId('list-column-chip-my_custom_field'),
		).toBeVisible();

		await savePanel(page);
		const fields = await savedFields(page, id);
		expect(fields.map((field) => field.name)).toContain('my_custom_field');
	});

	test('TC-06 a suggested field can be added from the dropdown', async ({
		authedPage: page,
		dashboards,
	}) => {
		const id = await dashboards.seedAndEdit(
			listDashboard([{ name: 'timestamp', signal: 'logs' }]),
			SINGLE_PANEL_ID,
		);

		await page.getByTestId('list-columns-add').click();
		await page.getByTestId('list-columns-search').fill('service');

		// The list repaints as backend results land; waiting for the loading row
		// avoids resolving `.first()` against a node about to be replaced.
		await expect(page.getByText('Loading…')).toHaveCount(0);
		const suggestion = page
			.locator('[data-testid^="list-columns-suggestion-"]')
			.first();
		await expect(suggestion).toBeVisible();
		const testId = (await suggestion.getAttribute('data-testid')) ?? '';
		const fieldName = testId.replace('list-columns-suggestion-', '');
		await suggestion.click();

		await savePanel(page);
		const fields = await savedFields(page, id);
		expect(fields.map((field) => field.name)).toContain(fieldName);
	});

	test('TC-07 an empty column set is allowed and explains itself', async ({
		authedPage: page,
		dashboards,
	}) => {
		await dashboards.seedAndEdit(
			listDashboard([{ name: 'timestamp', signal: 'logs' }]),
			SINGLE_PANEL_ID,
		);

		await page.getByTestId('list-column-remove-timestamp').click();
		// Empty means "show everything the query returns".
		await expect(
			page.getByText('Leave empty to show all fields returned by the query.'),
		).toBeVisible();
	});

	test('TC-08 switching a List panel to Table drops the columns editor', async ({
		authedPage: page,
		dashboards,
	}) => {
		// Logs-shaped so Table stays a legal target.
		await dashboards.seedAndEdit(
			singlePanelDashboard({
				kind: PanelKind.List,
				query: logsCountQuery(),
			}),
			SINGLE_PANEL_ID,
		);
		await expect(page.getByTestId('list-columns-editor')).toBeVisible();

		await page.getByTestId('panel-editor-v2-type-switcher').click();
		await page
			.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)')
			.getByText('Table', { exact: true })
			.click();

		await expect(page.getByTestId('list-columns-editor')).toHaveCount(0);
	});
});
