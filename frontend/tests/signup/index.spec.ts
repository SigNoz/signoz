import { expect, test } from '@playwright/test';
import ROUTES from 'constants/routes';

import { waitForVersionApiSuccess } from '../fixtures/common';

test.describe('Sign Up Page', () => {
	test('When User successfull signup and logged in, he should be redirected to dashboard', async ({
		page,
		baseURL,
	}) => {
		const loginPage = `${baseURL}${ROUTES.LOGIN}`;

		await waitForVersionApiSuccess(page);

		await Promise.all([page.goto(loginPage), page.waitForRequest('**/version')]);

		const buttonSignupButton = page.locator('text=Create an account');

		await buttonSignupButton.click();

		expect(page).toHaveURL(`${baseURL}${ROUTES.SIGN_UP}`);
	});

	test('User Sign up with valid details', async ({ baseURL, page }) => {
		const signupPage = `${baseURL}${ROUTES.SIGN_UP}`;

		await page.goto(signupPage);

		await waitForVersionApiSuccess(page);
	});
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
