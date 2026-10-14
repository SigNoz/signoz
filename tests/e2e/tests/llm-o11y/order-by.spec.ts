import { expect, test } from '../../fixtures/auth';
import {
	expectOrderBy,
	gotoExplorer,
	LLM_EXPLORER_PATH,
	orderByFromUrl,
	setOrderBy,
	switchView,
} from '../../helpers/explorer-order-by';

test.describe('LLM Observability Explorer — order by', () => {
	test('TC-01 does not carry a trace field into the list view', async ({
		authedPage: page,
	}) => {
		await gotoExplorer(page, LLM_EXPLORER_PATH);

		await switchView(page, 'trace');
		await expectOrderBy(page, 'last_activity_time (desc)');

		await switchView(page, 'list');

		await expectOrderBy(page, 'timestamp (desc)');
		expect(orderByFromUrl(page)).toStrictEqual([]);
	});

	test('TC-02 does not carry a span field into the trace view', async ({
		authedPage: page,
	}) => {
		await gotoExplorer(page, LLM_EXPLORER_PATH);
		await setOrderBy(page, 'timestamp (asc)');

		await switchView(page, 'trace');

		await expectOrderBy(page, 'last_activity_time (desc)');
		expect(orderByFromUrl(page)).toStrictEqual([]);
	});
});
