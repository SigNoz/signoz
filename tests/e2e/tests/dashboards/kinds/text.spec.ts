import {
	emptyDashboard,
	expect,
	PanelKind,
	PATH,
	Section,
	test,
} from '../../../drivers/panel-editor';

const BODY = [
	'# Release notes',
	'',
	'- first item',
	'- second item',
	'',
	'[SigNoz docs](https://signoz.io/docs)',
	'',
	'```js',
	'const answer = 42;',
	'```',
].join('\n');

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
		// Nothing to insert on a dashboard without variables.
		await expect(editor.text.insertVariableButton()).toHaveCount(0);

		for (const title of [Section.visualization, Section.panelAppearance]) {
			await expect(editor.section.toggle(title)).toBeVisible();
		}
		await expect(editor.text.hideHeader()).toBeVisible();
		// No data to format, scale or threshold, and no fields for links to resolve.
		for (const title of [
			Section.formatting,
			Section.axes,
			Section.legend,
			Section.chartAppearance,
			Section.thresholds,
			Section.contextLinks,
		]) {
			await expect(editor.section.toggle(title)).toHaveCount(0);
		}
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

		const markdown = panels.panel(panelId).markdown;
		await expect(markdown.heading('Release notes')).toBeVisible();
		await expect(markdown.listItems()).toHaveText(['first item', 'second item']);
		// Links always leave the dashboard.
		const link = markdown.link('SigNoz docs');
		await expect(link).toHaveAttribute('href', 'https://signoz.io/docs');
		await expect(link).toHaveAttribute('target', '_blank');
		await expect(markdown.codeBlock()).toHaveText('const answer = 42;');
	});
});
