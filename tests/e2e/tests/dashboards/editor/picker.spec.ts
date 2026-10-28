import {
	compactDashboard,
	emptyDashboard,
	expect,
	PanelKind,
	PATH,
	singlePanelDashboard,
	SINGLE_PANEL_ID,
	test,
} from '../../../drivers/panel-editor';

// Scope: creating a panel — the New panel drawer, the route it hands off to,
// and the JSON-Patch a save emits.
//
// The subtlety: a tile click only selects; the confirm button carries the
// target section, and the editor route carries it on as `layoutIndex`.

test.describe('Dashboards — panel picker', () => {
	test('TC-01 with one section a tile click selects and Add panel creates', async ({
		authedPage: page,
		dashboards,
		editor,
		newPanel,
	}) => {
		const id = await dashboards.seed(emptyDashboard());
		await dashboards.openEmpty(id);

		await dashboards.emptyAddPanel().click();
		// No section to choose, so the confirm names none.
		await expect(newPanel.confirmButton()).toHaveText('Add panel');

		await newPanel.pick(PanelKind.Table);
		await expect(page).toHaveURL(PATH.onDashboard(id));
		await expect(newPanel.root()).toBeVisible();

		await newPanel.confirm();
		expect(dashboards.param('panelKind')).toBe(PanelKind.Table);
		await expect(editor.root()).toBeVisible();
	});

	test('TC-02 with several sections the confirm names its target section', async ({
		dashboards,
		newPanel,
	}) => {
		await dashboards.seedAndOpen(compactDashboard());

		await dashboards.headerAddPanel().click();
		await expect(newPanel.root()).toBeVisible();

		// Every section is titled, so the toolbar trigger defaults to a new root.
		await expect(newPanel.confirmButton()).toHaveText('Add to Dashboard (root)');
		await expect(newPanel.tile(PanelKind.TimeSeries)).toHaveAttribute(
			'aria-pressed',
			'true',
		);

		await newPanel.choose(PanelKind.Number);
		expect(dashboards.param('panelKind')).toBe(PanelKind.Number);
		expect(dashboards.param('layoutIndex')).toBe('root');
	});

	test('TC-03 the chosen section becomes the new panel layoutIndex', async ({
		dashboards,
		newPanel,
	}) => {
		await dashboards.seedAndOpen(compactDashboard());

		await dashboards.headerAddPanel().click();
		await newPanel.pick(PanelKind.Number);
		await newPanel.chooseSection('1');
		await expect(newPanel.confirmButton()).toHaveText('Add to Tabular');
		await newPanel.confirm();

		expect(dashboards.param('layoutIndex')).toBe('1');
	});

	test('TC-04 creating from an empty section targets that section', async ({
		dashboards,
		newPanel,
	}) => {
		const dashboard = compactDashboard();

		dashboard.spec.layouts.push({
			kind: 'Grid',
			spec: { display: { title: 'Empty' }, items: [] },
		});
		await dashboards.seedAndOpen(dashboard);

		await newPanel.sectionAddPanel().scrollIntoViewIfNeeded();
		await newPanel.sectionAddPanel().click();

		await expect(newPanel.root()).toBeVisible();
		await expect(newPanel.confirmButton()).toHaveText('Add to Empty');
		await newPanel.choose(PanelKind.TimeSeries);
		expect(dashboards.param('layoutIndex')).toBe('2');
	});

	test('TC-05 saving a new panel emits add-panel and add-layout-item ops', async ({
		dashboards,
		editor,
		newPanel,
	}) => {
		await dashboards.seedAndOpen(singlePanelDashboard());

		const patches = editor.capturePatches();

		await dashboards.headerAddPanel().click();
		// List: its seeded query passes validation (see TC-06).
		await newPanel.choose(PanelKind.List);
		await expect(editor.root()).toBeVisible();

		await editor.title().fill('Created from the modal');
		await editor.save();

		// Targeted adds for panel AND grid item — a replace would clobber edits.
		expect(patches.length).toBeGreaterThan(0);
		const ops = patches[patches.length - 1];
		const panelAdd = ops.find((op) => /^\/spec\/panels\/[^/]+$/.test(op.path));
		expect(panelAdd?.op).toBe('add');
		expect(
			ops.some((op) => /^\/spec\/layouts\/\d+\/spec\/items\/-$/.test(op.path)),
		).toBe(true);
	});

	test('TC-06 the created panel lands on the dashboard and persists', async ({
		authedPage: page,
		dashboards,
		editor,
		newPanel,
		panels,
	}) => {
		const id = await dashboards.seedAndOpen(singlePanelDashboard());

		const before = await dashboards.get(id);
		const beforeCount = Object.keys(before.spec.panels).length;

		await dashboards.headerAddPanel().click();
		// List is the one kind whose seeded query saves as-is (logs `count()`);
		// metrics kinds are rejected until a metric is chosen — see TC-07.
		await newPanel.choose(PanelKind.List);
		await expect(editor.root()).toBeVisible();
		await editor.title().fill('Fresh list panel');
		await editor.save();

		await page.waitForURL(PATH.onDashboard(id));
		await expect(
			panels.titles().filter({ hasText: 'Fresh list panel' }),
		).toBeVisible();

		const after = await dashboards.get(id);
		expect(Object.keys(after.spec.panels)).toHaveLength(beforeCount + 1);
	});

	test('TC-07 saving a metrics panel with no metric chosen is rejected', async ({
		dashboards,
		editor,
		newPanel,
	}) => {
		await dashboards.seedAndOpen(singlePanelDashboard());

		await dashboards.headerAddPanel().click();
		await newPanel.choose(PanelKind.Number);
		await expect(editor.root()).toBeVisible();

		// Metrics kinds seed an empty aggregation, so the editor must stay open and
		// surface the reason rather than dropping the panel.
		const { ok, body } = await editor.trySave();
		expect(ok).toBe(false);
		expect(body).toContain('metric name is required');

		await expect(editor.root()).toBeVisible();
	});

	test('TC-08 the editor route redirects when panelKind is missing', async ({
		authedPage: page,
		dashboards,
		panels,
	}) => {
		const id = await dashboards.seed(singlePanelDashboard());

		// No kind to seed, so the page bounces back.
		await dashboards.visit(PATH.editor(id, 'new'));
		await page.waitForURL(PATH.onDashboard(id));
		await expect(panels.panel(SINGLE_PANEL_ID).root()).toBeVisible();
	});

	test('TC-09 a new section from the picker is created on save', async ({
		authedPage: page,
		dashboards,
		editor,
		newPanel,
	}) => {
		const id = await dashboards.seedAndOpen(singlePanelDashboard());

		await dashboards.headerAddPanel().click();
		await newPanel.pick(PanelKind.List);
		await newPanel.newSection('Fresh section');
		await expect(newPanel.confirmButton()).toHaveText('Add to new section');
		await newPanel.confirm();
		expect(dashboards.param('newSection')).toBe('Fresh section');

		await editor.save();
		await page.waitForURL(PATH.onDashboard(id));

		const after = await dashboards.get(id);
		const section = after.spec.layouts.find(
			(layout) => layout.spec.display?.title === 'Fresh section',
		);
		expect(section?.spec.items).toHaveLength(1);
	});
});
