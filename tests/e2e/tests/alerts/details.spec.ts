import {
	ALERT_HISTORY_PATH,
	ALERT_OVERVIEW_PATH,
	ALERTS_LIST_PATH,
	DEFAULT_RELATIVE_TIME,
	expect,
	test,
	V1_RULE_TEAM_LABEL,
} from '../../drivers/alerts';

test.describe('Alert details', () => {
	test('TC-01 the enable/disable toggle round-trips through the API', async ({
		authedPage: page,
		alerts,
		ownedRules,
	}) => {
		const ruleId = await ownedRules.logs({
			name: `e2e-ad-toggle-${Date.now()}`,
		});
		await alerts.details.goto(ruleId);

		const toggle = alerts.details.enableToggle();
		const patched = (): Promise<unknown> =>
			page.waitForResponse(
				(res) =>
					res.url().includes(`/api/v2/rules/${ruleId}`) &&
					res.request().method() === 'PATCH',
			);

		await Promise.all([patched(), toggle.click()]);
		await expect(alerts.shell.message('Alert has been disabled.')).toBeVisible();

		await Promise.all([patched(), toggle.click()]);
		await expect(alerts.shell.message('Alert has been enabled.')).toBeVisible();
	});

	test('TC-02 Duplicate creates a copy and lands on its overview', async ({
		authedPage: page,
		alerts,
		ownedRules,
	}) => {
		const name = `e2e-ad-duplicate-${Date.now()}`;
		const ruleId = await ownedRules.logs({ name });

		await alerts.details.goto(ruleId);
		await alerts.details.openActions();

		const [created] = await Promise.all([
			page.waitForResponse(
				(res) =>
					/\/api\/v\d\/rules$/.test(new URL(res.url()).pathname) &&
					res.request().method() === 'POST',
			),
			alerts.details.menuItem('Duplicate').click(),
		]);
		await ownedRules.register(created);

		await expect(page).toHaveURL(new RegExp(ALERT_OVERVIEW_PATH));
		await expect(page).toHaveURL(/[?&]ruleId=/);

		await alerts.shell.goto({ search: name });
		await expect(alerts.list.ruleName(`${name} - Copy`)).toBeVisible();
	});

	test('TC-03 Delete removes the rule and returns to the list', async ({
		authedPage: page,
		alerts,
		ownedRules,
	}) => {
		const name = `e2e-ad-delete-${Date.now()}`;
		const ruleId = await ownedRules.logs({ name });

		await alerts.details.goto(ruleId);
		await alerts.details.openActions();

		await Promise.all([
			page.waitForResponse(
				(res) =>
					res.url().includes(`/api/v2/rules/${ruleId}`) &&
					res.request().method() === 'DELETE',
			),
			alerts.details.menuItem('Delete').click(),
		]);

		await expect(page).toHaveURL(new RegExp(`${ALERTS_LIST_PATH}$`));
		await alerts.shell.goto({ search: name });
		await expect(alerts.list.ruleName(name, { exact: true })).toHaveCount(0);
	});

	test('TC-04 the breadcrumb and document title name the rule', async ({
		authedPage: page,
		alerts,
		alertHistory,
	}) => {
		await alerts.history.goto(alertHistory.ruleId);

		await expect
			.poll(() => page.title(), { timeout: 15_000 })
			.toContain('e2e-ah-rule-v2');

		const breadcrumb = alerts.shell.breadcrumb();
		await expect(breadcrumb).toContainText('Alert Rules');
		await expect(breadcrumb).toContainText(alertHistory.ruleId);

		await alerts.shell.crumb('Alert Rules').click();
		await expect(page).toHaveURL(new RegExp(`${ALERTS_LIST_PATH}$`));
	});

	test('TC-05 the copy-link button copies the current URL', async ({
		authedPage: page,
		alerts,
		alertHistory,
		browserName,
	}) => {
		test.skip(
			browserName !== 'chromium',
			'clipboard-read permission is Chromium-only in Playwright',
		);
		await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);

		await alerts.history.goto(alertHistory.ruleId);
		const expected = page.url();

		await alerts.details.copyLinkButton().click();
		await expect(alerts.shell.message('Copied')).toBeVisible();

		expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
			expected,
		);
	});

	test('TC-06 the v2 header renames inline and offers no Rename item', async ({
		alerts,
		alertHistory,
	}) => {
		await alerts.details.goto(alertHistory.ruleId);

		await expect(alerts.details.root()).toHaveAttribute(
			'data-schema-version',
			'v2alpha1',
		);
		const nameInput = alerts.details.nameInput();
		await expect(nameInput).toBeVisible();
		await expect(nameInput).not.toHaveValue('');
		await expect(nameInput).toBeEditable();

		await alerts.details.openActions();
		await expect(alerts.details.menuItem('Duplicate')).toBeVisible();
		await expect(alerts.details.menuItem('Delete')).toBeVisible();
		await expect(alerts.details.menuItem('Rename')).toHaveCount(0);
	});

	test('TC-07 the v1 header is static and keeps the Rename item', async ({
		alerts,
		alertHistory,
	}) => {
		await alerts.details.goto(alertHistory.ruleIdV1);

		await expect(alerts.details.root()).toHaveAttribute(
			'data-schema-version',
			'v1',
		);
		await expect(alerts.details.headerField('title')).toBeVisible();
		await expect(alerts.details.headerField('state')).toBeVisible();
		await expect(alerts.details.headerField('severity')).toContainText('Warning');
		await expect(alerts.details.headerField('labels')).toContainText(
			V1_RULE_TEAM_LABEL,
		);
		await expect(alerts.details.nameInput()).toHaveCount(0);

		await alerts.details.openActions();
		await expect(alerts.details.menuItem('Rename')).toBeVisible();
	});

	test('TC-08 a v1 rename through the modal persists', async ({
		alerts,
		ownedRules,
	}) => {
		const original = `e2e-ad-rename-v1-${Date.now()}`;
		const renamed = `${original}-renamed`;
		const ruleId = await ownedRules.logs({ name: original, schema: 'v1' });

		await alerts.details.goto(ruleId);
		await expect(alerts.details.headerField('title')).toContainText(original);

		await alerts.details.openActions();
		await alerts.details.menuItem('Rename').click();

		const modalInput = alerts.details.renameInput();
		await expect(modalInput).toBeVisible();
		await modalInput.fill(renamed);
		await alerts.details.renameConfirmButton().click();

		await expect(
			alerts.shell.message('Alert renamed successfully'),
		).toBeVisible();
		await expect(alerts.details.headerField('title')).toContainText(renamed);

		await alerts.shell.goto({ search: renamed });
		await expect(alerts.list.ruleName(renamed)).toBeVisible();
	});

	test('TC-09 a v2 rename persists only through the Overview footer', async ({
		authedPage: page,
		alerts,
		ownedRules,
	}) => {
		const original = `e2e-ad-rename-v2-${Date.now()}`;
		const renamed = `${original}-renamed`;
		const ruleId = await ownedRules.logs({ name: original });

		await alerts.details.goto(ruleId);

		const nameInput = alerts.details.nameInput();
		await expect(nameInput).toHaveValue(original);
		await nameInput.fill(renamed);

		await Promise.all([
			page.waitForResponse(
				(res) =>
					res.url().includes(`/api/v2/rules/${ruleId}`) &&
					['PUT', 'POST', 'PATCH'].includes(res.request().method()),
			),
			alerts.details.footerSaveButton().click(),
		]);

		await alerts.shell.goto({ search: renamed });
		await expect(alerts.list.ruleName(renamed)).toBeVisible();

		// The History tab renders the same name input with no save button, so an
		// edit made there is discarded rather than persisted.
		await alerts.history.goto(ruleId);
		await alerts.details.nameInput().fill(`${renamed}-unsaved`);
		await expect(alerts.details.footerSaveButton()).toHaveCount(0);

		await alerts.shell.goto({ search: renamed });
		await expect(alerts.list.ruleName(renamed)).toBeVisible();
		await expect(alerts.list.ruleName(`${renamed}-unsaved`)).toHaveCount(0);
	});

	test('TC-10 the tabs preserve ruleId and relativeTime', async ({
		authedPage: page,
		alerts,
		alertHistory,
	}) => {
		await alerts.details.goto(alertHistory.ruleId);

		await alerts.details.sectionTab('history').click();

		await expect(page).toHaveURL(new RegExp(ALERT_HISTORY_PATH));
		await expect(page).toHaveURL(new RegExp(`ruleId=${alertHistory.ruleId}`));
		await expect(page).toHaveURL(
			new RegExp(`relativeTime=${DEFAULT_RELATIVE_TIME}`),
		);
		await expect(alerts.details.historyBetaBadge()).toBeVisible();

		await alerts.details.sectionTab('overview').click();

		await expect(page).toHaveURL(new RegExp(ALERT_OVERVIEW_PATH));
		await expect(page).toHaveURL(new RegExp(`ruleId=${alertHistory.ruleId}`));
	});

	test('TC-11 switching back to History discards the other history params', async ({
		authedPage: page,
		alerts,
		alertHistory,
	}) => {
		await alerts.history.goto(alertHistory.ruleId, {
			page: '2',
			order: 'desc',
			timelineFilter: 'FIRED',
		});

		await alerts.details.sectionTab('overview').click();
		await expect(page).toHaveURL(new RegExp(ALERT_OVERVIEW_PATH));
		await expect(page).toHaveURL(/[?&]timelineFilter=FIRED/);

		await alerts.details.sectionTab('history').click();

		await expect(page).toHaveURL(new RegExp(ALERT_HISTORY_PATH));
		const search = new URL(page.url()).searchParams;
		expect([...search.keys()].sort()).toEqual(['relativeTime', 'ruleId']);
		expect(search.get('ruleId')).toBe(alertHistory.ruleId);
	});

	test('TC-12 the overview shows the saved threshold value', async ({
		alerts,
		ownedRules,
	}) => {
		const target = 245;
		const ruleId = await ownedRules.threshold(
			`e2e-threshold-persistence-${Date.now()}`,
			{ target },
		);

		await alerts.details.gotoOverview(ruleId);

		await expect(alerts.form.thresholdValue()).toHaveValue(String(target));
	});

	test('TC-13 an unknown or missing ruleId lands on AlertNotFound', async ({
		alerts,
	}) => {
		for (const open of [
			() => alerts.history.open('not-a-real-rule-id'),
			() => alerts.history.open('01920000-0000-7000-8000-000000000000'),
			() => alerts.details.open(),
			() => alerts.details.open('not-a-real-rule-id'),
		]) {
			// eslint-disable-next-line no-await-in-loop
			await open();
			// eslint-disable-next-line no-await-in-loop
			await expect(alerts.details.notFoundMessage()).toBeVisible();
		}
	});
});
