import { expect, Page, PlaywrightTestOptions, test } from '@playwright/test';
import ROUTES from 'constants/routes';

import { waitForVersionApiSuccess } from '../fixtures/common';
import {
	validCompanyName,
	validemail,
	validName,
	validPassword,
} from '../fixtures/constant';

const waitForSignUpPageSuccess = async (
	baseURL: PlaywrightTestOptions['baseURL'],
	page: Page,
): Promise<void> => {
	const signupPage = `${baseURL}${ROUTES.SIGN_UP}`;

	await page.goto(signupPage);

	await waitForVersionApiSuccess(page);
};

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

	test('Invite link validation', async ({ baseURL, page }) => {
		await waitForSignUpPageSuccess(baseURL, page);
		const message =
			'This will create an admin account. If you are not an admin, please ask your admin for an invite link';

		const messageText = await page.locator(`text=${message}`).innerText();

		expect(messageText).toBe(message);
	});

	test('User Sign up with valid details', async ({ baseURL, page }) => {
		await waitForSignUpPageSuccess(baseURL, page);

		const emailplaceholder = '[placeholder="name\\@yourcompany\\.com"]';
		const nameplaceholder = '[placeholder="Your Name"]';
		const companyPlaceholder = '[placeholder="Your Company"]';
		const currentPasswordId = '#currentPassword';
		const confirmPasswordId = '#confirmPassword';
		const confirmPasswordErrorId = '#password-confirm-error';

		const gettingStartedButton = page.locator('button[data-attr="signup"]');

		expect(await gettingStartedButton.isDisabled()).toBe(true);

		// Fill [placeholder="name\@yourcompany\.com"]
		await page.locator(emailplaceholder).fill(validemail);

		// Fill [placeholder="Your Name"]
		await page.locator(nameplaceholder).fill(validName);

		// Fill [placeholder="Your Company"]
		await page.locator(companyPlaceholder).fill(validCompanyName);

		// Fill #currentPassword
		await page.locator(currentPasswordId).fill(validPassword);

		// Fill #confirmPasswordId
		await page.locator(confirmPasswordId).fill(validPassword);

		// password validation message is not present
		const locator = await page.locator(confirmPasswordErrorId).isVisible();
		expect(locator).toBe(false);

		const buttonText = await gettingStartedButton.evaluate((e) => e.innerHTML);

		expect(buttonText).toMatch(/Get Started/i);

		// Getting Started button is not disabled
		expect(await gettingStartedButton.isDisabled()).toBe(false);

		await page.route(`**/register`, ({ fulfill }) => {
			return fulfill({
				status: 201,
				contentType: `application/json`,
				body: JSON.stringify({}),
			});
		});

		await gettingStartedButton.click();
	});
});
