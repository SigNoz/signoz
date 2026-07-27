import { expect, test } from '../../fixtures/auth';
import {
	gotoLogsExplorer,
	logDetailsDrawer,
	logsTableRows,
	openContextLogInNewTab,
	openContextView,
	openLogDetailsFromRow,
	setLogsFormat,
} from '../../helpers/logs-explorer';

test.describe('Logs Explorer — linked row in Column format', () => {
	test('TC-01 the linked row in a newly opened tab toggles the details drawer on click', async ({
		authedPage: page,
	}) => {
		await gotoLogsExplorer(page);
		await setLogsFormat(page, 'Column');

		const rows = logsTableRows(page);
		await expect(rows.first()).toBeVisible();

		await openLogDetailsFromRow(rows.first());
		await openContextView(page);

		const linkedTab = await openContextLogInNewTab(page);

		await expect(linkedTab).toHaveURL(/activeLogId=/);
		const linkedRow = logsTableRows(linkedTab).first();
		await expect(linkedRow).toBeVisible();

		await expect(logDetailsDrawer(linkedTab)).toBeHidden();
		await openLogDetailsFromRow(linkedRow);

		await linkedRow.locator('td').first().click();
		await expect(logDetailsDrawer(linkedTab)).toBeHidden();
	});
});
