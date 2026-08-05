import { expect, test } from '../../../../fixtures/dashboards';
import {
	getDashboardV2ViaApi,
	gotoDashboardV2,
	setDashboardLockedViaApi,
} from '../../../../helpers/dashboards-v2';
import { editor } from '../../../../helpers/panel-editor-v2';
import {
	PanelAction,
	openViewModal,
	runPanelAction,
} from '../../../../helpers/panels-v2';
import {
	SINGLE_PANEL_ID,
	singlePanelDashboard,
} from '../../../../testdata/v2/panels-dashboard';

// Scope: the View modal, and its two-way handoff with the panel editor.
//
// Both directions carry LIVE, unsaved state — modal → editor via router state
// (`editSpec`), editor → modal via sessionStorage + `compositeQuery`. Losing
// either silently discards in-progress work, so TC-09/TC-10 assert the carried
// state AND that nothing was persisted.

test.describe('Dashboards V2 — View modal', () => {
	test('TC-01 View opens the modal and reflects it in the URL', async ({
		authedPage: page,
		dashboards,
	}) => {
		await dashboards.seedAndOpen(singlePanelDashboard());
		const modal = await openViewModal(page, SINGLE_PANEL_ID);

		await expect(modal).toBeVisible();
		await expect(page.getByTestId('view-panel-refresh')).toBeVisible();
		expect(new URL(page.url()).searchParams.get('expandedWidgetId')).toBe(
			SINGLE_PANEL_ID,
		);
	});

	test('TC-02 the modal opens directly from a deep link', async ({
		authedPage: page,
		dashboards,
	}) => {
		const id = await dashboards.seedAndOpen(singlePanelDashboard());

		await page.goto(
			`/dashboard/${id}?expandedWidgetId=${SINGLE_PANEL_ID}&graphType=graph`,
		);
		await expect(page.getByTestId('view-panel-modal-content')).toBeVisible();
	});

	test('TC-04 Refresh re-issues the query', async ({
		authedPage: page,
		dashboards,
	}) => {
		await dashboards.seedAndOpen(singlePanelDashboard());
		await openViewModal(page, SINGLE_PANEL_ID);

		const refetch = page.waitForRequest((r) => r.url().includes('/query_range'));
		await page.getByTestId('view-panel-refresh').click();
		const request = await refetch;
		expect(request.method()).toBe('POST');
	});

	test('TC-05 switching the panel type in the modal does not persist', async ({
		authedPage: page,
		dashboards,
	}) => {
		const id = await dashboards.seedAndOpen(singlePanelDashboard());
		await openViewModal(page, SINGLE_PANEL_ID);

		await page.getByTestId('view-panel-type-selector').click();
		await page
			.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)')
			.getByText('Table', { exact: true })
			.click();
		await expect(page.getByTestId('table-panel-renderer')).toBeVisible();

		await page.goBack();
		const after = await getDashboardV2ViaApi(page, id);
		expect(after.spec.panels[SINGLE_PANEL_ID].spec.plugin.kind).toBe(
			'signoz/TimeSeriesPanel',
		);
	});

	test('TC-06 Switch to Edit Mode hands off to the panel editor', async ({
		authedPage: page,
		dashboards,
	}) => {
		const id = await dashboards.seedAndOpen(singlePanelDashboard());
		await openViewModal(page, SINGLE_PANEL_ID);

		await page.getByTestId('view-panel-switch-to-edit').click();

		await page.waitForURL(new RegExp(`/dashboard/${id}/panel/`));
		await expect(editor.root(page)).toBeVisible();
	});

	test('TC-07 a locked panel opens in View but offers no Switch to Edit', async ({
		authedPage: page,
		dashboards,
	}) => {
		// `canSwitchToEdit = canEditDashboard && !isLocked`, but View itself is not
		// role-gated — so the modal opens and only the handoff button disappears.
		const id = await dashboards.seed(singlePanelDashboard());
		await setDashboardLockedViaApi(page, id, true);
		await gotoDashboardV2(page, id);

		await runPanelAction(page, SINGLE_PANEL_ID, PanelAction.view);
		await expect(page.getByTestId('view-panel-modal-content')).toBeVisible();
		await expect(page.getByTestId('view-panel-switch-to-edit')).toHaveCount(0);
		await expect(page.getByTestId('view-panel-refresh')).toBeVisible();
	});

	test('TC-08 View → Edit → View round-trips with no changes', async ({
		authedPage: page,
		dashboards,
	}) => {
		const id = await dashboards.seedAndOpen(
			singlePanelDashboard({ panelName: 'Round trip' }),
		);
		await openViewModal(page, SINGLE_PANEL_ID);

		await page.getByTestId('view-panel-switch-to-edit').click();
		await page.waitForURL(new RegExp(`/dashboard/${id}/panel/`));
		await expect(editor.title(page)).toHaveValue('Round trip');
		await expect(editor.unsavedBadge(page)).toHaveCount(0);

		await editor.switchToView(page).click();
		await expect(page.getByTestId('view-panel-modal-content')).toBeVisible();

		const after = await getDashboardV2ViaApi(page, id);
		expect(after.spec.panels[SINGLE_PANEL_ID].spec.display.name).toBe(
			'Round trip',
		);
	});

	test('TC-09 an unsaved change in the modal carries into the editor', async ({
		authedPage: page,
		dashboards,
	}) => {
		const id = await dashboards.seedAndOpen(singlePanelDashboard());
		await openViewModal(page, SINGLE_PANEL_ID);

		await page.getByTestId('view-panel-type-selector').click();
		await page
			.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)')
			.getByText('Table', { exact: true })
			.click();
		await expect(page.getByTestId('table-panel-renderer')).toBeVisible();

		await page.getByTestId('view-panel-switch-to-edit').click();
		await page.waitForURL(new RegExp(`/dashboard/${id}/panel/`));

		// Editor opens on the MODIFIED panel, and still nothing is committed.
		await expect(page.getByTestId('table-panel-renderer')).toBeVisible();
		const after = await getDashboardV2ViaApi(page, id);
		expect(after.spec.panels[SINGLE_PANEL_ID].spec.plugin.kind).toBe(
			'signoz/TimeSeriesPanel',
		);
	});

	test('TC-10 an unsaved change in the editor carries back into the modal', async ({
		authedPage: page,
		dashboards,
	}) => {
		const id = await dashboards.seedAndEdit(
			singlePanelDashboard(),
			SINGLE_PANEL_ID,
		);

		await editor.title(page).fill('Edited but not saved');
		await expect(editor.unsavedBadge(page)).toBeVisible();

		await editor.switchToView(page).click();
		await expect(page.getByTestId('view-panel-modal-content')).toBeVisible();
		await expect(page.getByRole('dialog')).toContainText('Edited but not saved');

		const after = await getDashboardV2ViaApi(page, id);
		expect(after.spec.panels[SINGLE_PANEL_ID].spec.display.name).toBe(
			'Solo panel',
		);
	});
});
