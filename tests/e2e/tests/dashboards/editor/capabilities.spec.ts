import {
	expect,
	metricsQuery,
	PanelKind,
	SINGLE_PANEL_ID,
	singlePanelDashboard,
	test,
} from '../../../drivers/panel-editor';

// Scope: how the editor explains a disabled kind.

test.describe('Dashboards — editor capabilities', () => {
	test('TC-01 a disabled option explains itself in a tooltip', async ({
		dashboards,
		editor,
		panels,
	}) => {
		await dashboards.seedAndEdit(
			singlePanelDashboard({ query: metricsQuery() }),
			SINGLE_PANEL_ID,
		);

		await editor.openTypeSwitcher();
		await expect(editor.typeOption(PanelKind.List)).toHaveAttribute(
			'aria-disabled',
			'true',
		);
		await editor.typeOption(PanelKind.List).hover();

		// The wording is the contract users read.
		await expect(
			panels.tooltip.text("List doesn't support metrics data"),
		).toBeVisible();
	});
});
