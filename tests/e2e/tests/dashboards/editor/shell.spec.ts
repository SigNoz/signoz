import {
	EditorText,
	expect,
	PATH,
	SINGLE_PANEL_ID,
	singlePanelDashboard,
	test,
} from '../../../drivers/panel-editor';

// Scope: the editor shell — editing, dirty badge, save, discard guard, locking.
//
// Two counter-intuitive behaviours are pinned so a "cleanup" doesn't change
// them: Save is NOT gated on dirty state (Header.test.tsx), and only the in-app
// close button guards unsaved edits — there is no beforeunload blocker (TC-06).

test.describe('Dashboards — panel editor shell', () => {
	test('TC-01 the editor opens on the panel with its saved title', async ({
		dashboards,
		editor,
	}) => {
		await dashboards.seedAndEdit(singlePanelDashboard(), SINGLE_PANEL_ID);

		await expect(editor.heading()).toBeVisible();
		await expect(editor.title()).toHaveValue('Solo panel');
		await expect(editor.preview.root()).toBeVisible();
		await expect(editor.query.builder()).toBeVisible();
	});

	test('TC-02 editing the title marks the editor dirty', async ({
		dashboards,
		editor,
	}) => {
		await dashboards.seedAndEdit(singlePanelDashboard(), SINGLE_PANEL_ID);

		await expect(editor.unsavedBadge()).toHaveCount(0);
		await editor.title().fill('Renamed panel');
		await expect(editor.unsavedBadge()).toBeVisible();
	});

	test('TC-03 saving persists the title and returns to the dashboard', async ({
		authedPage: page,
		dashboards,
		editor,
	}) => {
		const id = await dashboards.seedAndEdit(
			singlePanelDashboard(),
			SINGLE_PANEL_ID,
		);
		const patches = editor.capturePatches();

		await editor.title().fill('Renamed via editor');
		await editor.description().fill('Edited in the E2E suite');
		await editor.save();

		await page.waitForURL(PATH.onDashboard(id));

		const after = await dashboards.get(id);
		expect(after.spec.panels[SINGLE_PANEL_ID].spec.display.name).toBe(
			'Renamed via editor',
		);

		// A single targeted add at the panel's spec pointer.
		const ops = patches[patches.length - 1];
		expect(ops).toHaveLength(1);
		expect(ops[0].path).toBe(`/spec/panels/${SINGLE_PANEL_ID}/spec`);
		expect(ops[0].op).toBe('add');
	});

	test('TC-04 closing a pristine editor leaves immediately', async ({
		authedPage: page,
		dashboards,
		editor,
	}) => {
		const id = await dashboards.seedAndEdit(
			singlePanelDashboard(),
			SINGLE_PANEL_ID,
		);

		await editor.close();
		await page.waitForURL(PATH.onDashboard(id));
		await expect(editor.discardModal()).toHaveCount(0);
	});

	test('TC-05 closing a dirty editor asks before discarding', async ({
		authedPage: page,
		dashboards,
		editor,
	}) => {
		const id = await dashboards.seedAndEdit(
			singlePanelDashboard(),
			SINGLE_PANEL_ID,
		);

		await editor.title().fill('Throwaway edit');
		await expect(editor.unsavedBadge()).toBeVisible();

		await editor.close({ expectDirty: true, keepEditing: true });
		await expect(editor.root()).toBeVisible();
		await expect(editor.title()).toHaveValue('Throwaway edit');

		await editor.close({ expectDirty: true });
		await page.waitForURL(PATH.onDashboard(id));

		const after = await dashboards.get(id);
		expect(after.spec.panels[SINGLE_PANEL_ID].spec.display.name).toBe(
			'Solo panel',
		);
	});

	test('TC-06 unsaved edits hold a refresh, but an in-app route change drops them', async ({
		authedPage: page,
		dashboards,
		editor,
		panels,
	}) => {
		const id = await dashboards.seedAndEdit(
			singlePanelDashboard(),
			SINGLE_PANEL_ID,
		);
		expect(await editor.blocksUnload()).toBe(false);

		await editor.title().fill('Never saved');
		await expect(editor.unsavedBadge()).toBeVisible();
		expect(await editor.blocksUnload()).toBe(true);

		// Known behaviour, not endorsed: a refresh or tab close prompts, but there
		// is no router blocker. If one is added, update this test, don't delete it.
		// The editor offers no link out, and Back only replays its own query sync.
		await dashboards.navigateInApp(PATH.dashboard(id));
		await page.waitForURL(PATH.onDashboard(id));
		await expect(editor.discardModal()).toHaveCount(0);
		await expect(panels.panel(SINGLE_PANEL_ID).title()).toHaveText('Solo panel');

		const after = await dashboards.get(id);
		expect(after.spec.panels[SINGLE_PANEL_ID].spec.display.name).toBe(
			'Solo panel',
		);
	});

	test('TC-07 a locked dashboard disables Save and says why', async ({
		dashboards,
		editor,
		panels,
	}) => {
		const id = await dashboards.seed(singlePanelDashboard());
		await dashboards.setLocked(id, true);

		await dashboards.openEditor(id, SINGLE_PANEL_ID);

		const save = editor.saveButton();
		await expect(save).toBeDisabled();

		await editor.hoverSave();
		await expect(panels.tooltip.text(EditorText.lockedReason)).toBeVisible();
	});

	test('TC-08 an unknown panel id redirects back to the dashboard', async ({
		authedPage: page,
		dashboards,
		editor,
	}) => {
		const id = await dashboards.seed(singlePanelDashboard());

		await dashboards.visit(PATH.editor(id, 'does-not-exist'));
		await page.waitForURL(PATH.onDashboard(id));
		await expect(editor.root()).toHaveCount(0);
	});

	test('TC-09 Switch to View Mode hands off to the View modal', async ({
		authedPage: page,
		dashboards,
		editor,
		panels,
	}) => {
		const id = await dashboards.seedAndEdit(
			singlePanelDashboard(),
			SINGLE_PANEL_ID,
		);

		await editor.switchToView().click();
		await page.waitForURL(PATH.onDashboardWithParams(id));
		await expect(panels.view.content()).toBeVisible();
	});
});
