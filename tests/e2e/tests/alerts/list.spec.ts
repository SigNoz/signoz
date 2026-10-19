import { ALERT_LIST_PAGE_SIZE, expect, test } from '../../drivers/alerts';

// What stays here is what needs a real backend behind a real table: the seeded
// rules rendering, the server-side filter semantics, and the write paths that
// have to survive a reload. Column visibility, search debounce, client-side
// pagination, the row-action *requests* and the empty states are asserted
// against `ListAlertRules` in jest — see
// `frontend/src/container/ListAlertRules/__tests__/`.

test.describe('Alert rules list', () => {
	test('TC-01 seeded rules render with their columns, total and second page', async ({
		authedPage: page,
		alerts,
		alertList,
	}) => {
		await alerts.list.goto({ search: alertList.namePrefix });

		for (const header of ['Status', 'Alert Name', 'Severity', 'Labels']) {
			await expect(alerts.list.columnHeader(header)).toBeVisible();
		}
		await expect(alerts.list.rows()).toHaveCount(ALERT_LIST_PAGE_SIZE);
		await expect(alerts.list.table.totalCount()).toContainText(
			`of ${alertList.count}`,
		);

		await alerts.list.nextPageButton().click();

		await expect(page).toHaveURL(/[?&]page=2/);
		await expect(alerts.list.rows()).toHaveCount(
			alertList.count - ALERT_LIST_PAGE_SIZE,
		);
		await expect(alerts.list.table.totalCount()).toContainText(
			`${ALERT_LIST_PAGE_SIZE + 1} - ${alertList.count}`,
		);
	});

	test('TC-02 state and severity filters intersect, they do not union', async ({
		alerts,
		alertList,
	}) => {
		const perSeverity = alertList.count / 3;
		const scoped = { search: alertList.namePrefix };

		// One filter kind: a third of the batch.
		await alerts.list.goto({
			...scoped,
			alertRulesFilters: JSON.stringify(['severity:warning']),
		});
		await expect(alerts.list.rows()).toHaveCount(perSeverity);

		// Both kinds, both satisfied — seeded rules never fire, so they sit in
		// `inactive` and the intersection is unchanged.
		await alerts.list.goto({
			...scoped,
			alertRulesFilters: JSON.stringify(['severity:warning', 'state:inactive']),
		});
		await expect(alerts.list.rows()).toHaveCount(perSeverity);

		// Both kinds, only one satisfied. Under AND this is empty; under OR the
		// severity match alone would still surface all `perSeverity` rules.
		await alerts.list.goto(
			{
				...scoped,
				alertRulesFilters: JSON.stringify(['severity:warning', 'state:firing']),
			},
			{ expectRows: false },
		);
		await expect(alerts.list.rows()).toHaveCount(0);
	});

	test('TC-03 row actions persist: disable, clone, delete', async ({
		authedPage: page,
		alerts,
		ownedRules,
	}) => {
		const name = `e2e-alert-row-${Date.now()}`;
		const ruleId = await ownedRules.threshold(name);

		await alerts.list.goto({ search: name });
		await expect(alerts.list.stateCell(ruleId)).toHaveText('OK');

		const patched = (): Promise<unknown> =>
			page.waitForResponse(
				(res) =>
					res.url().includes(`/api/v2/rules/${ruleId}`) &&
					res.request().method() === 'PATCH',
			);

		await alerts.list.openFirstRowActions();
		await Promise.all([patched(), alerts.list.menuItem('Disable').click()]);
		await expect(alerts.list.stateCell(ruleId)).toHaveText('Disabled');

		// The state has to come back from the server, not from optimistic UI.
		await page.reload();
		await expect(alerts.list.stateCell(ruleId)).toHaveText('Disabled');

		await alerts.list.openFirstRowActions();
		await Promise.all([patched(), alerts.list.menuItem('Enable').click()]);
		await expect(alerts.list.stateCell(ruleId)).toHaveText('OK');

		await alerts.list.openFirstRowActions();
		const [cloned] = await Promise.all([
			page.waitForResponse(
				(res) =>
					/\/api\/v\d\/rules$/.test(new URL(res.url()).pathname) &&
					res.request().method() === 'POST',
			),
			alerts.list.menuItem('Clone').click(),
		]);
		await ownedRules.register(cloned);
		await expect(alerts.shell.message('Alert cloned successfully')).toBeVisible();

		await alerts.list.goto({ search: name });
		await expect(alerts.list.ruleName(`${name} - Copy`)).toBeVisible();

		await alerts.list.openRowActions(`${name} - Copy`);
		await Promise.all([
			page.waitForResponse(
				(res) =>
					/\/api\/v\d\/rules\//.test(new URL(res.url()).pathname) &&
					res.request().method() === 'DELETE',
			),
			alerts.list.menuItem('Delete').click(),
		]);
		await expect(
			alerts.shell.message('Alert deleted successfully'),
		).toBeVisible();
		await expect(alerts.list.ruleName(`${name} - Copy`)).toHaveCount(0);
	});

	test('TC-04 sorting and page size reach the URL and the request', async ({
		authedPage: page,
		alerts,
		alertList,
	}) => {
		await alerts.list.goto({ search: alertList.namePrefix });
		const firstAscending = await alerts.list.rows().first().textContent();

		await alerts.list.sortButton('Alert Name').click();
		await expect(page).toHaveURL(/[?&]orderBy=/);
		await alerts.list.sortButton('Alert Name').click();
		await expect(alerts.list.rows().first()).not.toHaveText(firstAscending ?? '');

		await alerts.list.goto({ search: alertList.namePrefix });
		await alerts.list.pageSizeSelect().click();
		await alerts.list.pageSizeOption(20).click();

		await expect(page).toHaveURL(/[?&]limit=20/);
		await expect(alerts.list.rows()).toHaveCount(alertList.count);
	});

	test('TC-05 Edit in New Tab opens the rule in a second tab', async ({
		authedPage: page,
		alerts,
		alertList,
	}) => {
		await alerts.list.goto({ search: alertList.namePrefix });

		await alerts.list.openFirstRowActions();
		await alerts.list.menuItem('Edit in New Tab').first().waitFor();

		const [newTab] = await Promise.all([
			page.context().waitForEvent('page'),
			alerts.list.menuItem('Edit in New Tab').first().click(),
		]);
		await newTab.waitForLoadState();
		expect(newTab.url()).toContain('/alerts/overview');
		await newTab.close();
	});
});
