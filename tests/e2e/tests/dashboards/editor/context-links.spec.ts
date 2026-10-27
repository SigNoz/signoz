import {
	expect,
	PanelKind,
	PATH,
	QueryRange,
	ramp,
	Section,
	SINGLE_PANEL_ID,
	singlePanelDashboard,
	test,
} from '../../../drivers/panel-config';

// Scope: a link saved in the editor reaching `panel.spec.links` and the
// drilldown menu. The dialog itself is covered by ContextLinksSection.test.tsx.

test.describe('Dashboards — editor context links', () => {
	test('TC-01 a saved link persists and shows in the drilldown menu', async ({
		authedPage: page,
		dashboards,
		editor,
		config,
		panels,
		queryRange,
	}) => {
		// Mocked so the drilldown click lands on a known series.
		await queryRange.respond(
			QueryRange.timeSeries([
				{ labels: { 'service.name': 'adservice' }, points: ramp(12, 2, 8) },
			]),
		);
		const links = config.contextLinks;
		const id = await dashboards.seedAndEdit(
			singlePanelDashboard(),
			SINGLE_PANEL_ID,
		);

		await editor.section.expand(Section.contextLinks);
		await links.addButton().click();
		await links.label().fill('Runbook');
		await links.url().fill('https://example.com/runbook');
		await links.blurFields();
		await links.save().click();
		await expect(links.item(0)).toBeVisible();
		await editor.save();

		const saved = (await config.saved(id)).links;
		expect(saved).toHaveLength(1);
		// "Label" persists as `name` (Perses link model).
		expect(saved[0]).toMatchObject({
			name: 'Runbook',
			url: 'https://example.com/runbook',
		});

		await page.waitForURL(PATH.onDashboard(id));
		const target = panels.panel(SINGLE_PANEL_ID);
		await expect(target.renderer(PanelKind.TimeSeries)).toBeVisible();
		await target.chart.clickPoint();
		await expect(panels.drilldown.menu()).toBeVisible();
		await expect(panels.drilldown.contextLinks()).toHaveText(['Runbook']);
	});

	test('TC-02 the header quick-add opens the dialog from a collapsed section', async ({
		dashboards,
		editor,
		config,
	}) => {
		await dashboards.seedAndEdit(singlePanelDashboard(), SINGLE_PANEL_ID);

		// One click must expand AND add (pendingAction hop).
		await editor.section.collapse(Section.contextLinks);
		await config.contextLinks.headerAdd().click();

		await expect(editor.section.toggle(Section.contextLinks)).toHaveAttribute(
			'aria-expanded',
			'true',
		);
		await expect(config.contextLinks.dialog()).toBeVisible();
	});
});
