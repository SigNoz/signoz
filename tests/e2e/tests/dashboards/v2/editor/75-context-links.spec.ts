import { expect, test } from '../../../../fixtures/dashboards';
import { getDashboardV2ViaApi } from '../../../../helpers/dashboards-v2';
import {
	Section,
	collapseSection,
	expandSection,
	savePanel,
	sectionToggle,
} from '../../../../helpers/panel-editor-v2';
import {
	SINGLE_PANEL_ID,
	singlePanelDashboard,
} from '../../../../testdata/v2/panels-dashboard';

// Scope: the Context Links dialog and that a saved link reaches
// `panel.spec.links` — where it surfaces as a `drilldown-context-link`
// (covered in panels/57-drilldown).

/**
 * Close the URL field's suggestion popover, which otherwise keeps the dialog
 * reflowing so buttons never settle. Escape would dismiss the whole dialog.
 */
async function blurDialogFields(
	page: Parameters<typeof getDashboardV2ViaApi>[0],
): Promise<void> {
	await page.getByTestId('context-link-label').focus();
}

async function savedLinks(
	page: Parameters<typeof getDashboardV2ViaApi>[0],
	dashboardId: string,
): Promise<{ name?: string; url?: string }[]> {
	const after = await getDashboardV2ViaApi(page, dashboardId);
	return after.spec.panels[SINGLE_PANEL_ID].spec.links ?? [];
}

test.describe('Dashboards V2 — editor context links', () => {
	test('TC-01 the section is offered and opens an empty dialog', async ({
		authedPage: page,
		dashboards,
	}) => {
		await dashboards.seedAndEdit(singlePanelDashboard(), SINGLE_PANEL_ID);

		await expandSection(page, Section.contextLinks);
		await page.getByTestId('panel-editor-v2-add-link').click();

		const dialog = page.getByTestId('context-link-dialog');
		await expect(dialog).toBeVisible();
		await expect(page.getByTestId('context-link-label')).toHaveValue('');
		await expect(page.getByTestId('context-link-url')).toHaveValue('');
	});

	test('TC-02 Save stays disabled until the link is valid', async ({
		authedPage: page,
		dashboards,
	}) => {
		await dashboards.seedAndEdit(singlePanelDashboard(), SINGLE_PANEL_ID);

		await expandSection(page, Section.contextLinks);
		await page.getByTestId('panel-editor-v2-add-link').click();

		// A link with no URL would be a dead menu entry.
		await expect(page.getByTestId('context-link-save')).toBeDisabled();
		await page.getByTestId('context-link-label').fill('Runbook');
		await expect(page.getByTestId('context-link-save')).toBeDisabled();

		await page
			.getByTestId('context-link-url')
			.fill('https://example.com/runbook');
		await expect(page.getByTestId('context-link-save')).toBeEnabled();
	});

	test('TC-03 a saved link persists into panel.spec.links', async ({
		authedPage: page,
		dashboards,
	}) => {
		const id = await dashboards.seedAndEdit(
			singlePanelDashboard(),
			SINGLE_PANEL_ID,
		);

		await expandSection(page, Section.contextLinks);
		await page.getByTestId('panel-editor-v2-add-link').click();
		await page.getByTestId('context-link-label').fill('Runbook');
		await page
			.getByTestId('context-link-url')
			.fill('https://example.com/runbook');
		await blurDialogFields(page);
		await page.getByTestId('context-link-save').click();

		await expect(page.getByTestId('context-link-item-0')).toBeVisible();
		await savePanel(page);

		const links = await savedLinks(page, id);
		expect(links).toHaveLength(1);
		// "Label" persists as `name` (Perses link model).
		expect(links[0]).toMatchObject({
			name: 'Runbook',
			url: 'https://example.com/runbook',
		});
	});

	test('TC-04 Cancel discards the dialog without adding a link', async ({
		authedPage: page,
		dashboards,
	}) => {
		await dashboards.seedAndEdit(singlePanelDashboard(), SINGLE_PANEL_ID);

		await expandSection(page, Section.contextLinks);
		await page.getByTestId('panel-editor-v2-add-link').click();
		await page.getByTestId('context-link-label').fill('Throwaway');
		await page.getByTestId('context-link-url').fill('https://example.com');
		await blurDialogFields(page);
		await page.getByTestId('context-link-cancel').click();

		await expect(page.getByTestId('context-link-dialog')).toHaveCount(0);
		await expect(page.getByTestId('context-link-item-0')).toHaveCount(0);
	});

	test('TC-05 an existing link can be edited', async ({
		authedPage: page,
		dashboards,
	}) => {
		const id = await dashboards.seedAndEdit(
			singlePanelDashboard({
				links: [{ name: 'Original', url: 'https://example.com/one' }],
			}),
			SINGLE_PANEL_ID,
		);

		await expandSection(page, Section.contextLinks);
		await page.getByTestId('context-link-edit-0').click();
		await page.getByTestId('context-link-label').fill('Renamed');
		await blurDialogFields(page);
		await page.getByTestId('context-link-save').click();
		await savePanel(page);

		const links = await savedLinks(page, id);
		expect(links[0]).toMatchObject({ name: 'Renamed' });
	});

	test('TC-06 a link can be removed', async ({
		authedPage: page,
		dashboards,
	}) => {
		const id = await dashboards.seedAndEdit(
			singlePanelDashboard({
				links: [{ name: 'Original', url: 'https://example.com/one' }],
			}),
			SINGLE_PANEL_ID,
		);

		await expandSection(page, Section.contextLinks);
		await page.getByTestId('context-link-remove-0').click();
		await savePanel(page);

		expect(await savedLinks(page, id)).toHaveLength(0);
	});

	test('TC-07 URL parameters can be added to a link', async ({
		authedPage: page,
		dashboards,
	}) => {
		const id = await dashboards.seedAndEdit(
			singlePanelDashboard(),
			SINGLE_PANEL_ID,
		);

		await expandSection(page, Section.contextLinks);
		await page.getByTestId('panel-editor-v2-add-link').click();
		await page.getByTestId('context-link-label').fill('With params');
		await page.getByTestId('context-link-url').fill('https://example.com/search');

		await blurDialogFields(page);
		await page.getByTestId('context-link-add-param').click();
		await page.getByTestId('context-link-param-key-0').fill('service');
		await page.getByTestId('context-link-param-value-0').fill('adservice');
		await blurDialogFields(page);
		await page.getByTestId('context-link-save').click();
		await savePanel(page);

		const links = await savedLinks(page, id);
		expect(links).toHaveLength(1);
		// Params fold into the persisted URL.
		expect(JSON.stringify(links[0])).toContain('service');
	});

	test('TC-08 the header quick-add opens the dialog from a collapsed section', async ({
		authedPage: page,
		dashboards,
	}) => {
		await dashboards.seedAndEdit(singlePanelDashboard(), SINGLE_PANEL_ID);

		// One click must expand AND add (pendingAction hop).
		await collapseSection(page, Section.contextLinks);
		await page.getByTestId('panel-editor-v2-add-link-header').click();

		await expect(sectionToggle(page, Section.contextLinks)).toHaveAttribute(
			'aria-expanded',
			'true',
		);
		await expect(page.getByTestId('context-link-dialog')).toBeVisible();
	});
});
