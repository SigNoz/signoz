import {
	expect,
	Section,
	SINGLE_PANEL_ID,
	singlePanelDashboard,
	test,
} from '../../../../drivers/panel-config';

// Scope: the Context Links dialog and that a saved link reaches
// `panel.spec.links` — where it surfaces as a `drilldown-context-link`
// (covered in panels/57-drilldown).

const ONE_LINK = singlePanelDashboard({
	links: [{ name: 'Original', url: 'https://example.com/one' }],
});

test.describe('Dashboards V2 — editor context links', () => {
	test('TC-01 the section is offered and opens an empty dialog', async ({
		dashboards,
		editor,
		config,
	}) => {
		const links = config.contextLinks;
		await dashboards.seedAndEdit(singlePanelDashboard(), SINGLE_PANEL_ID);

		await editor.section.expand(Section.contextLinks);
		await links.addButton().click();

		await expect(links.dialog()).toBeVisible();
		await expect(links.label()).toHaveValue('');
		await expect(links.url()).toHaveValue('');
	});

	test('TC-02 Save stays disabled until the link is valid', async ({
		dashboards,
		editor,
		config,
	}) => {
		const links = config.contextLinks;
		await dashboards.seedAndEdit(singlePanelDashboard(), SINGLE_PANEL_ID);

		await editor.section.expand(Section.contextLinks);
		await links.addButton().click();

		// A link with no URL would be a dead menu entry.
		await expect(links.save()).toBeDisabled();
		await links.label().fill('Runbook');
		await expect(links.save()).toBeDisabled();

		await links.url().fill('https://example.com/runbook');
		await expect(links.save()).toBeEnabled();
	});

	test('TC-03 a saved link persists into panel.spec.links', async ({
		dashboards,
		editor,
		config,
	}) => {
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
	});

	test('TC-04 Cancel discards the dialog without adding a link', async ({
		dashboards,
		editor,
		config,
	}) => {
		const links = config.contextLinks;
		await dashboards.seedAndEdit(singlePanelDashboard(), SINGLE_PANEL_ID);

		await editor.section.expand(Section.contextLinks);
		await links.addButton().click();
		await links.label().fill('Throwaway');
		await links.url().fill('https://example.com');
		await links.blurFields();
		await links.cancel().click();

		await expect(links.dialog()).toHaveCount(0);
		await expect(links.item(0)).toHaveCount(0);
	});

	test('TC-05 an existing link can be edited', async ({
		dashboards,
		editor,
		config,
	}) => {
		const links = config.contextLinks;
		const id = await dashboards.seedAndEdit(ONE_LINK, SINGLE_PANEL_ID);

		await editor.section.expand(Section.contextLinks);
		await links.edit(0).click();
		await links.label().fill('Renamed');
		await links.blurFields();
		await links.save().click();
		await editor.save();

		expect((await config.saved(id)).links[0]).toMatchObject({
			name: 'Renamed',
		});
	});

	test('TC-06 a link can be removed', async ({ dashboards, editor, config }) => {
		const id = await dashboards.seedAndEdit(ONE_LINK, SINGLE_PANEL_ID);

		await editor.section.expand(Section.contextLinks);
		await config.contextLinks.remove(0).click();
		await editor.save();

		expect((await config.saved(id)).links).toHaveLength(0);
	});

	test('TC-07 URL parameters can be added to a link', async ({
		dashboards,
		editor,
		config,
	}) => {
		const links = config.contextLinks;
		const id = await dashboards.seedAndEdit(
			singlePanelDashboard(),
			SINGLE_PANEL_ID,
		);

		await editor.section.expand(Section.contextLinks);
		await links.addButton().click();
		await links.label().fill('With params');
		await links.url().fill('https://example.com/search');

		await links.blurFields();
		await links.addParam().click();
		await links.paramKey(0).fill('service');
		await links.paramValue(0).fill('adservice');
		await links.blurFields();
		await links.save().click();
		await editor.save();

		const saved = (await config.saved(id)).links;
		expect(saved).toHaveLength(1);
		// Params fold into the persisted URL.
		expect(new URL(saved[0].url).searchParams.get('service')).toBe('adservice');
	});

	test('TC-08 the header quick-add opens the dialog from a collapsed section', async ({
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
