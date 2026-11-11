import { expect, nameContains, test } from '../../drivers/alerts';

// The rail's own behaviour (dirty states, builtin views, link precedence) is
// asserted against mocks in
// `frontend/src/container/ListAlertRules/__tests__/ListAlertRules.views.test.tsx`.
// What stays here is what a real `/api/v2/rule_views` has to persist.

const viewName = (label: string): string =>
	`e2e-alert-view-${label}-w${test.info().workerIndex}-${Date.now()}`;

test.describe('Alert rules saved views', () => {
	test('TC-01 the current search saves as a view that reapplies from a bare link', async ({
		authedPage: page,
		alerts,
		alertList,
		ownedViews,
	}) => {
		const query = `${nameContains(alertList.namePrefix)} AND severity = 'warning'`;
		const name = viewName('save');

		await alerts.list.goto({ query });
		const id = await alerts.views.saveAs(name);
		ownedViews.register(id);

		await expect(page).toHaveURL(new RegExp(`[?&]view=${id}`));
		await expect(alerts.views.heading()).toHaveText(name);

		await alerts.list.goto({ view: id });
		await expect(alerts.views.heading()).toHaveText(name);
		await expect(alerts.list.rows()).toHaveCount(alertList.count / 3);
	});

	test('TC-02 selecting a saved view applies its filter', async ({
		authedPage: page,
		alerts,
		alertList,
		ownedViews,
	}) => {
		const query = `${nameContains(alertList.namePrefix)} AND severity = 'critical'`;
		const name = viewName('apply');
		const id = await ownedViews.create(name, { version: 'v1', query });

		await alerts.list.goto({ query: nameContains(alertList.namePrefix) });
		await alerts.views.item(id).click();

		await expect(page).toHaveURL(new RegExp(`[?&]view=${id}`));
		await expect(alerts.views.heading()).toHaveText(name);
		await expect(alerts.list.rows()).toHaveCount(alertList.count / 3);
	});

	test('TC-03 Save changes stores the edited filter on the view', async ({
		alerts,
		alertList,
		ownedViews,
	}) => {
		const scope = nameContains(alertList.namePrefix);
		const id = await ownedViews.create(viewName('update'), {
			version: 'v1',
			query: `${scope} AND severity = 'warning'`,
		});

		await alerts.list.goto({ view: id });
		const edited = `${scope} AND severity = 'critical'`;
		await alerts.list.runSearch(edited);
		await alerts.views.save();
		await expect(alerts.views.saveChanges()).toHaveCount(0);

		await alerts.list.goto({ view: id });
		await expect(alerts.list.search()).toHaveText(edited);
	});

	test('TC-04 rename and delete survive a reload', async ({
		authedPage: page,
		alerts,
		alertList,
		ownedViews,
	}) => {
		const name = viewName('rename');
		const id = await ownedViews.create(name, {
			version: 'v1',
			query: nameContains(alertList.namePrefix),
		});

		await alerts.list.goto({ view: id });
		await alerts.views.rename(id, `${name}-renamed`);

		await page.reload();
		await expect(alerts.views.item(id)).toHaveText(`${name}-renamed`);

		await alerts.views.remove(id);

		await page.reload();
		await expect(alerts.views.item('all')).toBeVisible();
		await expect(alerts.views.item(id)).toHaveCount(0);
	});

	test('TC-05 a shared link keeps its own query over the view and marks it modified', async ({
		alerts,
		alertList,
		ownedViews,
	}) => {
		const scope = nameContains(alertList.namePrefix);
		const name = viewName('link');
		const id = await ownedViews.create(name, {
			version: 'v1',
			query: `${scope} AND severity = 'warning'`,
		});

		await alerts.list.goto({ view: id, query: scope });

		await expect(alerts.views.heading()).toHaveText(name);
		await expect(alerts.views.saveChanges()).toBeVisible();
		await expect(alerts.list.table.totalCount()).toContainText(
			`of ${alertList.count}`,
		);
	});
});
