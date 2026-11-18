import { expect, test } from '../../drivers/logs';

test.describe('Logs Explorer — linked row in Column format', () => {
	test('TC-01 the linked row in a newly opened tab is highlighted and toggles the details drawer on click', async ({
		logs,
	}) => {
		await logs.goto();
		await logs.setFormat('Column');

		const rows = logs.rows();
		await expect(rows.first()).toBeVisible();
		await expect(logs.highlightedRows()).toHaveCount(0);

		await logs.openDetailsFromRow(rows.first());
		await logs.openContextView();

		const linkedTab = await logs.openFirstContextLogInNewTab();
		await expect(linkedTab).toHaveURL(/activeLogId=/);

		const linkedRow = logs.row(logs.activeLogId(linkedTab), linkedTab);
		await expect(linkedRow).toBeVisible();
		await expect(linkedRow).toHaveClass(/logs-linked-row/);

		await expect(logs.highlightedRows(linkedTab)).toHaveCount(1);
		await expect(logs.unhighlightedRows(linkedTab).first()).toBeVisible();

		await expect(logs.detailsDrawer(linkedTab)).toBeHidden();
		await logs.openDetailsFromRow(linkedRow);

		await logs.clickRowFirstCell(linkedRow);
		await expect(logs.detailsDrawer(linkedTab)).toBeHidden();
	});
});
