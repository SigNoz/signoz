import { expect, test } from '../../fixtures/auth';
import {
	expectOrderBy,
	gotoExplorer,
	orderByFromUrl,
	setOrderBy,
	switchView,
	TRACES_EXPLORER_PATH,
} from '../../helpers/explorer-order-by';

test.describe('Traces Explorer — order by', () => {
	test('TC-01 keeps the order after opening a trace and going back', async ({
		authedPage: page,
	}) => {
		await gotoExplorer(page, TRACES_EXPLORER_PATH);
		await setOrderBy(page, 'duration_nano (desc)');

		await page.locator('.ant-table-row').first().click();
		await expect(page).toHaveURL(/\/trace\//);

		await page.goBack();

		await expectOrderBy(page, 'duration_nano (desc)');
		expect(orderByFromUrl(page)).toStrictEqual([
			{ columnName: 'duration_nano', order: 'desc' },
		]);
	});

	test('TC-02 writes the order to the URL and keeps it across a reload', async ({
		authedPage: page,
	}) => {
		await gotoExplorer(page, TRACES_EXPLORER_PATH);
		expect(orderByFromUrl(page)).toStrictEqual([]);

		await setOrderBy(page, 'duration_nano (asc)');
		expect(orderByFromUrl(page)).toStrictEqual([
			{ columnName: 'duration_nano', order: 'asc' },
		]);

		await page.reload();

		await expectOrderBy(page, 'duration_nano (asc)');
	});

	test('TC-03 clears the order when the Time Series tab hands over to List', async ({
		authedPage: page,
	}) => {
		await gotoExplorer(page, TRACES_EXPLORER_PATH);
		await setOrderBy(page, 'duration_nano (desc)');

		await switchView(page, 'timeseries');
		await switchView(page, 'list');

		await expectOrderBy(page, 'timestamp (desc)');
		expect(orderByFromUrl(page)).toStrictEqual([]);
	});
});
