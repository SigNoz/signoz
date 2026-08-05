import { expect, test } from '../../../../fixtures/dashboards';
import {
	getDashboardV2ViaApi,
	gotoPanelEditor,
	setDashboardLockedViaApi,
} from '../../../../helpers/dashboards-v2';
import {
	EditorText,
	capturePatchOps,
	closeEditor,
	editor,
	savePanel,
} from '../../../../helpers/panel-editor-v2';
import {
	SINGLE_PANEL_ID,
	singlePanelDashboard,
} from '../../../../testdata/v2/panels-dashboard';

// Scope: the editor shell — editing, dirty badge, save, discard guard, locking.
//
// Two counter-intuitive behaviours are pinned so a "cleanup" doesn't change
// them: Save is NOT gated on dirty state (TC-03), and only the in-app close
// button guards unsaved edits — there is no beforeunload blocker (TC-07).

test.describe('Dashboards V2 — panel editor shell', () => {
	test('TC-01 the editor opens on the panel with its saved title', async ({
		authedPage: page,
		dashboards,
	}) => {
		await dashboards.seedAndEdit(singlePanelDashboard(), SINGLE_PANEL_ID);

		await expect(page.getByText(EditorText.title)).toBeVisible();
		await expect(editor.title(page)).toHaveValue('Solo panel');
		await expect(page.getByTestId('preview-pane')).toBeVisible();
		await expect(editor.queryBuilder(page)).toBeVisible();
	});

	test('TC-02 editing the title marks the editor dirty', async ({
		authedPage: page,
		dashboards,
	}) => {
		await dashboards.seedAndEdit(singlePanelDashboard(), SINGLE_PANEL_ID);

		await expect(editor.unsavedBadge(page)).toHaveCount(0);
		await editor.title(page).fill('Renamed panel');
		await expect(editor.unsavedBadge(page)).toBeVisible();
	});

	test('TC-03 Save stays enabled on a pristine panel', async ({
		authedPage: page,
		dashboards,
	}) => {
		await dashboards.seedAndEdit(singlePanelDashboard(), SINGLE_PANEL_ID);

		// Gated on editability, not isDirty.
		await expect(editor.unsavedBadge(page)).toHaveCount(0);
		await expect(editor.save(page)).toBeEnabled();
	});

	test('TC-04 saving persists the title and returns to the dashboard', async ({
		authedPage: page,
		dashboards,
	}) => {
		const id = await dashboards.seedAndEdit(
			singlePanelDashboard(),
			SINGLE_PANEL_ID,
		);
		const patches = capturePatchOps(page);

		await editor.title(page).fill('Renamed via editor');
		await editor.description(page).fill('Edited in the E2E suite');
		await savePanel(page);

		await page.waitForURL(new RegExp(`/dashboard/${id}(\\?|$)`));

		const after = await getDashboardV2ViaApi(page, id);
		expect(after.spec.panels[SINGLE_PANEL_ID].spec.display.name).toBe(
			'Renamed via editor',
		);

		// A single targeted add at the panel's spec pointer.
		const ops = patches[patches.length - 1];
		expect(ops).toHaveLength(1);
		expect(ops[0].path).toBe(`/spec/panels/${SINGLE_PANEL_ID}/spec`);
		expect(ops[0].op).toBe('add');
	});

	test('TC-05 closing a pristine editor leaves immediately', async ({
		authedPage: page,
		dashboards,
	}) => {
		const id = await dashboards.seedAndEdit(
			singlePanelDashboard(),
			SINGLE_PANEL_ID,
		);

		await closeEditor(page);
		await page.waitForURL(new RegExp(`/dashboard/${id}(\\?|$)`));
		await expect(page.getByTestId('panel-editor-v2-discard-modal')).toHaveCount(
			0,
		);
	});

	test('TC-06 closing a dirty editor asks before discarding', async ({
		authedPage: page,
		dashboards,
	}) => {
		const id = await dashboards.seedAndEdit(
			singlePanelDashboard(),
			SINGLE_PANEL_ID,
		);

		await editor.title(page).fill('Throwaway edit');
		await expect(editor.unsavedBadge(page)).toBeVisible();

		// Keep editing leaves the edit intact.
		await closeEditor(page, { expectDirty: true, keepEditing: true });
		await expect(editor.root(page)).toBeVisible();
		await expect(editor.title(page)).toHaveValue('Throwaway edit');

		await closeEditor(page, { expectDirty: true });
		await page.waitForURL(new RegExp(`/dashboard/${id}(\\?|$)`));

		const after = await getDashboardV2ViaApi(page, id);
		expect(after.spec.panels[SINGLE_PANEL_ID].spec.display.name).toBe(
			'Solo panel',
		);
	});

	test('TC-07 navigating away by URL loses edits without a prompt', async ({
		authedPage: page,
		dashboards,
	}) => {
		const id = await dashboards.seedAndEdit(
			singlePanelDashboard(),
			SINGLE_PANEL_ID,
		);
		await editor.title(page).fill('Never saved');

		// Known behaviour, not endorsed: the guard is on the close button only. If
		// a router blocker is added, update this test rather than deleting it.
		await page.goto(`/dashboard/${id}`);
		await expect(page.getByTestId('panel-editor-v2-discard-modal')).toHaveCount(
			0,
		);

		const after = await getDashboardV2ViaApi(page, id);
		expect(after.spec.panels[SINGLE_PANEL_ID].spec.display.name).toBe(
			'Solo panel',
		);
	});

	test('TC-08 a locked dashboard disables Save and never PATCHes', async ({
		authedPage: page,
		dashboards,
	}) => {
		const id = await dashboards.seed(singlePanelDashboard());
		await setDashboardLockedViaApi(page, id, true);

		const patches = capturePatchOps(page);
		await gotoPanelEditor(page, id, SINGLE_PANEL_ID);

		const save = editor.save(page);
		await expect(save).toBeDisabled();

		// A disabled button swallows pointer events; hover the wrapping trigger.
		await page
			.locator('[data-slot="tooltip-trigger"]')
			.filter({ has: save })
			.hover();
		await expect(page.getByText(EditorText.lockedReason)).toBeVisible();

		// The store short-circuits a locked patch before the network.
		expect(patches).toHaveLength(0);
	});

	test('TC-09 an unknown panel id redirects back to the dashboard', async ({
		authedPage: page,
		dashboards,
	}) => {
		const id = await dashboards.seed(singlePanelDashboard());

		await page.goto(`/dashboard/${id}/panel/does-not-exist`);
		await page.waitForURL(new RegExp(`/dashboard/${id}(\\?|$)`));
		await expect(editor.root(page)).toHaveCount(0);
	});

	test('TC-10 Switch to View Mode hands off to the View modal', async ({
		authedPage: page,
		dashboards,
	}) => {
		const id = await dashboards.seedAndEdit(
			singlePanelDashboard(),
			SINGLE_PANEL_ID,
		);

		await editor.switchToView(page).click();
		await page.waitForURL(new RegExp(`/dashboard/${id}\\?`));
		await expect(page.getByTestId('view-panel-modal-content')).toBeVisible();
	});
});
