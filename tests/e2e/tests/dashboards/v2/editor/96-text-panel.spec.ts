import {
	emptyDashboard,
	expect,
	PanelAction,
	PanelKind,
	PATH,
	Section,
	SINGLE_PANEL_ID,
	singlePanelDashboard,
	test,
	VARIABLE_NAMES,
} from '../../../../drivers/panel-editor';

// Scope: the Text kind end to end — creation from the picker, the Markdown
// editor in the query builder's slot, rendering on the grid, variable
// interpolation, the View modal, and what a query-less kind leaves out
// (downloads, alerts, data sections, context links).

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

function textDashboard(
	text: string,
	extra?: { withVariables?: boolean },
): ReturnType<typeof singlePanelDashboard> {
	return singlePanelDashboard({
		kind: PanelKind.Text,
		panelName: 'Notes',
		pluginSpec: { text },
		...extra,
	});
}

test.describe('Dashboards V2 — Text panel', () => {
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

	test('TC-03 an inserted variable interpolates in the preview and on the grid', async ({
		dashboards,
		editor,
		panels,
	}) => {
		const id = await dashboards.seedAndEdit(
			textDashboard('', { withVariables: true }),
			SINGLE_PANEL_ID,
		);

		await editor.text.setMarkdown('Service: ');
		await editor.text.insertVariable(VARIABLE_NAMES.custom);
		await expect(editor.text.input()).toHaveText(
			`Service: $${VARIABLE_NAMES.custom}`,
		);
		// The custom variable resolves to its first value.
		await expect(editor.preview.markdown.root()).toHaveText('Service: adservice');

		await editor.save();
		const saved = await dashboards.get(id);
		expect(saved.spec.panels[SINGLE_PANEL_ID].spec.plugin.spec.text).toBe(
			`Service: $${VARIABLE_NAMES.custom}`,
		);
		await expect(panels.panel(SINGLE_PANEL_ID).markdown.root()).toHaveText(
			'Service: adservice',
		);
	});

	test('TC-04 the View modal shows the editor and live body, and hands edits to the editor', async ({
		authedPage: page,
		dashboards,
		editor,
		panels,
	}) => {
		const id = await dashboards.seedAndOpen(textDashboard('# Original'));

		await panels.view.open(SINGLE_PANEL_ID);
		await expect(panels.view.markdown.heading('Original')).toBeVisible();
		await expect(panels.view.textEditor()).toBeVisible();
		// No time window to pick or refresh.
		await expect(panels.view.refresh()).toHaveCount(0);

		await editor.text.setMarkdown('# Edited in view');
		await expect(panels.view.markdown.heading('Edited in view')).toBeVisible();

		await panels.view.switchToEdit().click();
		await page.waitForURL(new RegExp(PATH.editor(id, SINGLE_PANEL_ID)));
		await expect(editor.preview.markdown.heading('Edited in view')).toBeVisible();
		await expect(editor.unsavedBadge()).toBeVisible();
	});

	test('TC-05 the actions menu has no downloads or alerts', async ({
		dashboards,
		panels,
	}) => {
		await dashboards.seedAndOpen(textDashboard('Body'));

		const actions = panels.panel(SINGLE_PANEL_ID).actions;
		await actions.open();
		for (const label of [PanelAction.view, PanelAction.edit, PanelAction.clone]) {
			await expect(actions.item(label)).toBeVisible();
		}
		await expect(actions.item(PanelAction.download)).toHaveCount(0);
		await expect(actions.item(PanelAction.createAlert)).toHaveCount(0);
	});

	test('TC-06 hiding the header removes the title strip but keeps the actions', async ({
		dashboards,
		editor,
		panels,
	}) => {
		const id = await dashboards.seedAndEdit(
			textDashboard('Body'),
			SINGLE_PANEL_ID,
		);

		await editor.text.hideHeader().click();
		await editor.save();

		const saved = await dashboards.get(id);
		expect(
			saved.spec.panels[SINGLE_PANEL_ID].spec.plugin.spec.headerOptions,
		).toEqual({ hide: true });

		const target = panels.panel(SINGLE_PANEL_ID);
		await expect(target.markdown.root()).toHaveText('Body');
		await expect(target.title()).toHaveCount(0);
		await expect(target.hiddenHeaderHandle()).toBeAttached();
		await target.actions.open();
		await expect(target.actions.item(PanelAction.view)).toBeVisible();
	});

	test('TC-07 text position persists to the presentation slice', async ({
		dashboards,
		editor,
	}) => {
		const id = await dashboards.seedAndEdit(
			textDashboard('Body'),
			SINGLE_PANEL_ID,
		);

		await editor.section.expand(Section.panelAppearance);
		await editor.text.alignment('center', 'center').click();
		await editor.save();

		const saved = await dashboards.get(id);
		expect(
			saved.spec.panels[SINGLE_PANEL_ID].spec.plugin.spec.presentation,
		).toMatchObject({ textAlign: 'center', verticalAlign: 'center' });
	});
});
