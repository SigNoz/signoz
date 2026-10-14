import { expect, test } from '../../fixtures/auth';
import {
	expectOrderBy,
	gotoExplorer,
	LOGS_EXPLORER_PATH,
	orderByFromUrl,
	withOrderByInUrl,
} from '../../helpers/explorer-order-by';
import { dismissQuickFiltersAnnouncement } from '../../helpers/quick-filters';

test.describe('Logs Explorer — order by', () => {
	test('TC-01 applies the order a deep link carries', async ({
		authedPage: page,
	}) => {
		await dismissQuickFiltersAnnouncement(page);
		await page.goto(
			withOrderByInUrl(
				LOGS_EXPLORER_PATH,
				{ columnName: 'timestamp', order: 'asc' },
				'logs',
			),
		);

		await expectOrderBy(page, 'timestamp (asc)');
		expect(orderByFromUrl(page)).toStrictEqual([
			{ columnName: 'timestamp', order: 'asc' },
		]);
	});

	test('TC-02 writes nothing to the URL until the order is changed', async ({
		authedPage: page,
	}) => {
		await gotoExplorer(page, LOGS_EXPLORER_PATH);

		await expectOrderBy(page, 'timestamp (desc)');
		expect(orderByFromUrl(page)).toStrictEqual([]);
	});
});
