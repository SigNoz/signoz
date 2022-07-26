import { expect, Page, test } from '@playwright/test';
import ROUTES from 'constants/routes';

import successAllErrors from '../fixtures/api/allErrors/200.json';
import { loginApi } from '../fixtures/common';
import { JsonApplicationType } from '../fixtures/constant';

const noDataTableData = async (page: Page): Promise<void> => {
	const text = page.locator('text=No Data');

	expect(text).toBeVisible();
	expect(text).toHaveText('No Data');

	const textType = [
		'Exception Type',
		'Error Message',
		'Last Seen',
		'First Seen',
		'Application',
	];

	textType.forEach(async (text) => {
		const textLocator = page.locator(`text=${text}`);

		const textContent = await textLocator.textContent();

		expect(textContent).toBe(text);
		expect(textLocator).not.toBeNull();

		expect(textLocator).toBeVisible();
		await expect(textLocator).toHaveText(`${text}`);
	});
};

let page: Page;

test.describe('Expections page', async () => {
	test.beforeEach(async ({ baseURL, browser }) => {
		const context = await browser.newContext({ storageState: 'tests/auth.json' });
		const newPage = await context.newPage();

		await loginApi(newPage);

		await newPage.goto(`${baseURL}${ROUTES.APPLICATION}`);

		page = newPage;
	});

	test('Should have a valid route', async () => {
		await page.goto(ROUTES.ALL_ERROR);

		await expect(page).toHaveURL(ROUTES.ALL_ERROR);
		expect(await page.screenshot()).toMatchSnapshot();
	});

	test('Should have a valid Breadcrumbs', async () => {
		await page.goto(ROUTES.ALL_ERROR, {
			waitUntil: 'networkidle',
		});

		const expectionsLocator = page.locator('a:has-text("Exceptions")');

		await expect(expectionsLocator).toBeVisible();
		await expect(expectionsLocator).toHaveText('Exceptions');
		await expect(expectionsLocator).toHaveAttribute('href', ROUTES.ALL_ERROR);
		expect(await page.screenshot()).toMatchSnapshot();
	});

	test('Should render the page with 404 status', async () => {
		await page.route('**listErrors', (route) =>
			route.fulfill({
				status: 404,
				contentType: JsonApplicationType,
				body: JSON.stringify([]),
			}),
		);

		await page.goto(ROUTES.ALL_ERROR, {
			waitUntil: 'networkidle',
		});

		await noDataTableData(page);
		expect(await page.screenshot()).toMatchSnapshot();
	});

	test('Should render the page with 500 status in antd notification with no data antd table', async () => {
		await page.route(`**/listErrors**`, (route) =>
			route.fulfill({
				status: 500,
				contentType: JsonApplicationType,
				body: JSON.stringify([]),
			}),
		);

		await page.goto(ROUTES.ALL_ERROR, {
			waitUntil: 'networkidle',
		});

		const text = 'Something went wrong';

		const el = page.locator(`text=${text}`);

		expect(el).toBeVisible();
		expect(el).toHaveText(`${text}`);
		expect(await el.getAttribute('disabled')).toBe(null);

		await noDataTableData(page);
		expect(await page.screenshot()).toMatchSnapshot();
	});

	test('Should render data in antd table', async () => {
		await Promise.all([
			page.route(`**/listErrors**`, (route) =>
				route.fulfill({
					status: 200,
					contentType: JsonApplicationType,
					body: JSON.stringify(successAllErrors),
				}),
			),

			page.route('**/countErrors**', (route) =>
				route.fulfill({
					status: 200,
					contentType: JsonApplicationType,
					body: JSON.stringify(200),
				}),
			),
		]);

		await page.goto(ROUTES.ALL_ERROR, {
			waitUntil: 'networkidle',
		});

		await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

		const expectionType = page.locator(
			`td:has-text("${successAllErrors[1].exceptionType}")`,
		);

		expect(expectionType).toBeVisible();

		const second = page.locator('li > a:has-text("2") >> nth=0');
		const isVisisble = await second.isVisible();

		expect(isVisisble).toBe(true);
		expect(await page.screenshot()).toMatchSnapshot();
	});
});
