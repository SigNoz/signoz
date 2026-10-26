import {
	expect,
	GOLDEN,
	metricsQuery,
	PanelKind,
	promqlQuery,
	SINGLE_PANEL_ID,
	singlePanelDashboard,
	test,
	textPanelWithQueryDashboard,
} from '../../../drivers/panel-editor';

// Scope: how the editor explains a disabled kind, and the backend enforcing the
// same panelKind × queryType matrix.

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

	test('TC-02 the backend rejects a combination the editor disables', async ({
		dashboards,
	}) => {
		// Enforced server-side too, so an invalid pairing can never be persisted.
		// Pins the layers together: if capabilities.ts and allowedQueryKinds
		// drift, either the switcher contract or this fails.
		await expect(
			dashboards.seed(
				singlePanelDashboard({
					kind: PanelKind.PieChart,
					query: promqlQuery(`sum(rate(${GOLDEN.metrics.calls}[5m]))`),
				}),
			),
			// Quotes in the message are JSON-escaped, so match around them.
		).rejects.toThrow(/PromQLQuery.*not supported by panel kind.*PieChartPanel/);
	});

	test('TC-03 the backend rejects a Text panel that carries a query', async ({
		dashboards,
	}) => {
		await expect(dashboards.seed(textPanelWithQueryDashboard())).rejects.toThrow(
			/renders without a query and must have queries: \[\]/,
		);
	});
});
