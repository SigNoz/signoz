import { expect, test } from '../../fixtures/auth';
import {
	activeLogIdFromUrl,
	clickRowFirstCell,
	gotoLogsExplorer,
	highlightedLogsTableRows,
	LINKED_ROW_CLASS,
	logDetailsDrawer,
	logsTableRow,
	logsTableRows,
	openFirstContextLogInNewTab,
	openContextView,
	openLogDetailsFromRow,
	setLogsFormat,
	unhighlightedLogsTableRows,
} from '../../helpers/logs-explorer';

test.describe('Logs Explorer — linked row in Column format', () => {
	test('TC-01 the linked row in a newly opened tab is highlighted and toggles the details drawer on click', async ({
		authedPage: page,
	}) => {
		await gotoLogsExplorer(page);
		await setLogsFormat(page, 'Column');

		const rows = logsTableRows(page);
		await expect(rows.first()).toBeVisible();
		await expect(highlightedLogsTableRows(page)).toHaveCount(0);

		await openLogDetailsFromRow(rows.first());
		await openContextView(page);

		const linkedTab = await openFirstContextLogInNewTab(page);
		await expect(linkedTab).toHaveURL(/activeLogId=/);

		const linkedLogId = activeLogIdFromUrl(linkedTab);
		const linkedRow = logsTableRow(linkedTab, linkedLogId);
		await expect(linkedRow).toBeVisible();
		await expect(linkedRow).toHaveClass(new RegExp(LINKED_ROW_CLASS));

		await expect(highlightedLogsTableRows(linkedTab)).toHaveCount(1);
		await expect(unhighlightedLogsTableRows(linkedTab).first()).toBeVisible();

		// Nothing is open on arrival, so the click below is the *first* click — the
		// only one the old code got wrong.
		await expect(logDetailsDrawer(linkedTab)).toBeHidden();
		await openLogDetailsFromRow(linkedRow);

		// And it toggles: clicking the open row closes it again.
		await clickRowFirstCell(linkedRow);
		await expect(logDetailsDrawer(linkedTab)).toBeHidden();
	});
});
