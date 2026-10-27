import {
	emptyDashboard,
	expect,
	PanelKind,
	PATH,
	test,
} from '../../../drivers/panel-editor';

// Markdown rendering itself is covered by MarkdownContent.test.tsx and the Text story.
const BODY = '# Release notes\n\nShipped this week.';

test.describe('Dashboards — Text panel', () => {
	test('TC-01 a Text panel from the picker opens the Markdown editor, not the query builder', async ({
		dashboards,
		editor,
		newPanel,
	}) => {
		const id = await dashboards.seed(emptyDashboard());
		await dashboards.openEmpty(id);

		await dashboards.emptyAddPanel().click();
		await newPanel.choose(PanelKind.Text);
		expect(dashboards.param('panelKind')).toBe(PanelKind.Text);

		await expect(editor.text.pane()).toBeVisible();
		await expect(editor.text.toolbar()).toBeVisible();
		await expect(editor.query.builder()).toHaveCount(0);
		await expect(editor.query.runButton()).toHaveCount(0);
	});

	test('TC-02 written Markdown previews live, saves without a query and renders on the grid', async ({
		authedPage: page,
		dashboards,
		editor,
		newPanel,
		panels,
	}) => {
		const id = await dashboards.seed(emptyDashboard());
		await dashboards.openEmpty(id);
		await dashboards.emptyAddPanel().click();
		await newPanel.choose(PanelKind.Text);

		// A blank body previews as the empty state.
		await expect(editor.preview.markdown.empty()).toBeVisible();

		await editor.title().fill('Release notes');
		await editor.text.setMarkdown(BODY);
		await expect(editor.preview.markdown.heading('Release notes')).toBeVisible();

		await editor.save();
		await page.waitForURL(PATH.onDashboard(id));

		const saved = await dashboards.get(id);
		const [panelId, persisted] = Object.entries(saved.spec.panels)[0];
		expect(persisted.spec.plugin.kind).toBe(PanelKind.Text);
		expect(persisted.spec.queries).toEqual([]);
		expect(persisted.spec.plugin.spec.text).toBe(BODY);

		await expect(
			panels.panel(panelId).markdown.heading('Release notes'),
		).toBeVisible();
	});
});
