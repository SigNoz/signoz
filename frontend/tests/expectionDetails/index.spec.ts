import { expect, Page, test } from '@playwright/test';
import ROUTES from 'constants/routes';

import allErrorList from '../fixtures/api/allErrors/200.json';
import errorDetailSuccess from '../fixtures/api/errorDetails/200.json';
import errorDetailNotFound from '../fixtures/api/errorDetails/404.json';
import nextPreviousSuccess from '../fixtures/api/getNextPrev/200.json';
import { loginApi } from '../fixtures/common';
import { JsonApplicationType } from '../fixtures/constant';

let page: Page;
const timestamp = '1657794588955274000';

test.describe('Expections Details', async () => {
	test.beforeEach(async ({ baseURL, browser }) => {
		const context = await browser.newContext({ storageState: 'tests/auth.json' });
		const newPage = await context.newPage();

		await loginApi(newPage);

		await newPage.goto(`${baseURL}${ROUTES.APPLICATION}`);

		page = newPage;
	});

	test('Should have not found when api return 404', async () => {
		await Promise.all([
			page.route('**/errorFromGroupID**', (route) =>
				route.fulfill({
					status: 404,
					contentType: JsonApplicationType,
					body: JSON.stringify(errorDetailNotFound),
				}),
			),
			page.route('**/nextPrevErrorIDs**', (route) =>
				route.fulfill({
					status: 404,
					contentType: JsonApplicationType,
					body: JSON.stringify([]),
				}),
			),
		]);

		await page.goto(
			`${ROUTES.ERROR_DETAIL}?groupId=${allErrorList[0].groupID}&timestamp=${timestamp}`,
			{
				waitUntil: 'networkidle',
			},
		);

		const NoDataLocator = page.locator('text=Not Found');
		const isVisible = await NoDataLocator.isVisible();
		const text = await NoDataLocator.textContent();

		expect(isVisible).toBe(true);
		expect(text).toBe('Not Found');
		expect(await page.screenshot()).toMatchSnapshot();
	});

	test('Render Success Data when 200 from details page', async () => {
		await Promise.all([
			page.route('**/errorFromGroupID**', (route) =>
				route.fulfill({
					status: 200,
					contentType: JsonApplicationType,
					body: JSON.stringify(errorDetailSuccess),
				}),
			),
			page.route('**/nextPrevErrorIDs**', (route) =>
				route.fulfill({
					status: 200,
					contentType: JsonApplicationType,
					body: JSON.stringify(nextPreviousSuccess),
				}),
			),
		]);

		await page.goto(
			`${ROUTES.ERROR_DETAIL}?groupId=${allErrorList[0].groupID}&timestamp=${timestamp}`,
			{
				waitUntil: 'networkidle',
			},
		);

		const traceDetailButton = page.locator('text=See the error in trace graph');
		const olderButton = page.locator('text=Older');
		const newerButton = page.locator(`text=Newer`);

		expect(await traceDetailButton.isVisible()).toBe(true);
		expect(await olderButton.isVisible()).toBe(true);
		expect(await newerButton.isVisible()).toBe(true);

		expect(await traceDetailButton.textContent()).toBe(
			'See the error in trace graph',
		);
		expect(await olderButton.textContent()).toBe('Older');
		expect(await newerButton.textContent()).toBe('Newer');

		expect(await page.screenshot()).toMatchSnapshot();
	});
});
