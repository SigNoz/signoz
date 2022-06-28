import { expect, test } from '@playwright/test';
import { getVersion } from 'constants/api';
import ROUTES from 'constants/routes';

const version = 'v1.0.0';

test.beforeEach(async ({ baseURL, page }) => {
	const loginPage = `${baseURL}${ROUTES.LOGIN}`;

	await page.route(`**/${getVersion}`, (route) =>
		route.fulfill({
			contentType: 'application/json',
			status: 200,
			body: JSON.stringify({ version }),
		}),
	);

	await Promise.all([page.goto(loginPage), page.waitForRequest('**/version')]);
});

test('Login Page', async ({ page }) => {
	const signup = 'Monitor your applications. Find what is causing issues.';

	// Click text=Monitor your applications. Find what is causing issues.
	const el = page.locator(`text=${signup}`);

	expect(el).toBeVisible();
});

test('Sign Up should be present', async ({ page, baseURL }) => {
	const loginPage = `${baseURL}${ROUTES.LOGIN}`;

	// find button which has text=Create an account
	const button = page.locator('text=Create an account');

	expect(button).toBeVisible();
	expect(button).toHaveText('Create an account');
	expect(await button.getAttribute('disabled')).toBe(null);

	expect(await button.isEnabled()).toBe(true);
	await expect(page).toHaveURL(loginPage);
});

test('When User successfull signup and logged in, he should be redirected to dashboard', async ({
	page,
	baseURL,
}) => {
	const buttonSignupButton = page.locator('text=Create an account');

	await buttonSignupButton.click();

	expect(page).toHaveURL(`${baseURL}${ROUTES.SIGN_UP}`);
});

test('Version of the application when api returns 200', async ({ page }) => {
	// Click text=SigNoz ${version}
	const element = page.locator(`text=SigNoz ${version}`);
	element.isVisible();
	const text = await element.innerText();
	expect(text).toBe(`SigNoz ${version}`);
});

// test('When User successfully signup and loggged-in', ({ page, baseURL }) => {
// 	await page.locator('text=Create an account').click();
// 	await expect(page).toHaveURL('http://localhost:3301/signup');
// 	// Click [placeholder="name\@yourcompany\.com"]
// 	await page.locator('[placeholder="name\\@yourcompany\\.com"]').click();
// 	// Fill [placeholder="name\@yourcompany\.com"]
// 	await page
// 		.locator('[placeholder="name\\@yourcompany\\.com"]')
// 		.fill('sample@signoz.io');
// 	// Press Tab
// 	await page.locator('[placeholder="name\\@yourcompany\\.com"]').press('Tab');
// 	// Fill [placeholder="Your Name"]
// 	await page.locator('[placeholder="Your Name"]').fill('Palash');
// 	// Press a with modifiers
// 	await page.locator('[placeholder="Your Name"]').press('Meta+a');
// 	// Fill [placeholder="Your Name"]
// 	await page.locator('[placeholder="Your Name"]').fill('Admin User');
// 	// Press Tab
// 	await page.locator('[placeholder="Your Name"]').press('Tab');
// 	// Fill [placeholder="Your Company"]
// 	await page.locator('[placeholder="Your Company"]').fill('Signoz');
// 	// Press Tab
// 	await page.locator('[placeholder="Your Company"]').press('Tab');
// 	// Fill #currentPassword
// 	await page.locator('#currentPassword').fill('SampleSignoz@.@');
// 	// Press Tab
// 	await page.locator('#currentPassword').press('Tab');
// 	// Fill text=Confirm PasswordPasswords don’t match. Please try againPassword must a have mini >> input[type="password"]
// 	await page
// 		.locator(
// 			'text=Confirm PasswordPasswords don’t match. Please try againPassword must a have mini >> input[type="password"]',
// 		)
// 		.fill('SampleSignoz@.@');
// 	// Click svg >> nth=0
// 	await page.locator('svg').first().click();
// 	// Click path >> nth=1
// 	await page.locator('path').nth(1).click();
// 	// Click text=Confirm PasswordPassword must a have minimum of 8 characters with at least one l >> input[type="text"]
// 	await page
// 		.locator(
// 			'text=Confirm PasswordPassword must a have minimum of 8 characters with at least one l >> input[type="text"]',
// 		)
// 		.click();
// 	// Press ArrowLeft
// 	await page
// 		.locator(
// 			'text=Confirm PasswordPassword must a have minimum of 8 characters with at least one l >> input[type="text"]',
// 		)
// 		.press('ArrowLeft');
// 	// Press ArrowLeft
// 	await page
// 		.locator(
// 			'text=Confirm PasswordPassword must a have minimum of 8 characters with at least one l >> input[type="text"]',
// 		)
// 		.press('ArrowLeft');
// 	// Press ArrowLeft
// 	await page
// 		.locator(
// 			'text=Confirm PasswordPassword must a have minimum of 8 characters with at least one l >> input[type="text"]',
// 		)
// 		.press('ArrowLeft');
// 	// Fill text=Confirm PasswordPassword must a have minimum of 8 characters with at least one l >> input[type="text"]
// 	await page
// 		.locator(
// 			'text=Confirm PasswordPassword must a have minimum of 8 characters with at least one l >> input[type="text"]',
// 		)
// 		.fill('SampleSignoz98@.@');
// 	// Click #currentPassword
// 	await page.locator('#currentPassword').click();
// 	// Press ArrowLeft
// 	await page.locator('#currentPassword').press('ArrowLeft');
// 	// Press ArrowLeft
// 	await page.locator('#currentPassword').press('ArrowLeft');
// 	// Press ArrowLeft
// 	await page.locator('#currentPassword').press('ArrowLeft');
// 	// Fill #currentPassword
// 	await page.locator('#currentPassword').fill('SampleSignoz98@.@');
// 	// Click button:has-text("Get Started")
// 	await Promise.all([
// 		page.waitForNavigation(/*{ url: 'http://localhost:3301/application' }*/),
// 		page.locator('button:has-text("Get Started")').click(),
// 	]);
// });
