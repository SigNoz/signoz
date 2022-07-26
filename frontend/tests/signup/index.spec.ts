import { expect, Page, PlaywrightTestOptions, test } from '@playwright/test';
import ROUTES from 'constants/routes';

import { loginApi, waitForVersionApiSuccess } from '../fixtures/common';
import {
	confirmPasswordSelector,
	getStartedButtonSelector,
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

interface FillDetailsInSignUpFormProps {
	page: Page;
	email: string;
	name: string;
	companyName: string;
	password: string;
	confirmPassword: string;
}

const fillDetailsInSignUpForm = async ({
	page,
	email,
	name,
	companyName,
	password,
	confirmPassword,
}: FillDetailsInSignUpFormProps): Promise<void> => {
	const emailplaceholder = '[placeholder="name\\@yourcompany\\.com"]';
	const nameplaceholder = '[placeholder="Your Name"]';
	const companyPlaceholder = '[placeholder="Your Company"]';
	const currentPasswordId = '#currentPassword';
	const confirmPasswordId = '#confirmPassword';

	// Fill [placeholder="name\@yourcompany\.com"]
	await page.locator(emailplaceholder).fill(email);

	// Fill [placeholder="Your Name"]
	await page.locator(nameplaceholder).fill(name);

	// Fill [placeholder="Your Company"]
	await page.locator(companyPlaceholder).fill(companyName);

	// Fill #currentPassword
	await page.locator(currentPasswordId).fill(password);

	// Fill #confirmPasswordId
	await page.locator(confirmPasswordId).fill(confirmPassword);
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
		expect(await page.screenshot()).toMatchSnapshot();
	});

	test('Invite link validation', async ({ baseURL, page }) => {
		await waitForSignUpPageSuccess(baseURL, page);
		const message =
			'This will create an admin account. If you are not an admin, please ask your admin for an invite link';

		const messageText = await page.locator(`text=${message}`).innerText();

		expect(messageText).toBe(message);
		expect(await page.screenshot()).toMatchSnapshot();
	});

	test('User Sign up with valid details', async ({ baseURL, page, context }) => {
		await waitForSignUpPageSuccess(baseURL, page);

		const gettingStartedButton = page.locator(getStartedButtonSelector);

		expect(await gettingStartedButton.isDisabled()).toBe(true);

		await fillDetailsInSignUpForm({
			companyName: validCompanyName,
			confirmPassword: validPassword,
			email: validemail,
			name: validName,
			page,
			password: validPassword,
		});

		// password validation message is not present
		const locator = await page.locator(confirmPasswordSelector).isVisible();
		expect(locator).toBe(false);

		const buttonText = await gettingStartedButton.evaluate((e) => e.innerHTML);

		expect(buttonText).toMatch(/Get Started/i);

		// Getting Started button is not disabled
		expect(await gettingStartedButton.isDisabled()).toBe(false);

		await loginApi(page);

		await gettingStartedButton.click();

		await expect(page).toHaveURL(`${baseURL}${ROUTES.APPLICATION}`);

		await context.storageState({
			path: 'tests/auth.json',
		});
		expect(await page.screenshot()).toMatchSnapshot();
	});

	test('Empty name with valid details', async ({ baseURL, page }) => {
		await waitForSignUpPageSuccess(baseURL, page);

		await fillDetailsInSignUpForm({
			companyName: validCompanyName,
			confirmPassword: validPassword,
			email: validemail,
			name: '',
			page,
			password: validPassword,
		});

		const gettingStartedButton = page.locator(getStartedButtonSelector);

		expect(await gettingStartedButton.isDisabled()).toBe(true);
		expect(await page.screenshot()).toMatchSnapshot();
	});

	test('Empty Company name with valid details', async ({ baseURL, page }) => {
		await waitForSignUpPageSuccess(baseURL, page);

		await fillDetailsInSignUpForm({
			companyName: '',
			confirmPassword: validPassword,
			email: validemail,
			name: validName,
			page,
			password: validPassword,
		});

		const gettingStartedButton = page.locator(getStartedButtonSelector);

		expect(await gettingStartedButton.isDisabled()).toBe(true);
		expect(await page.screenshot()).toMatchSnapshot();
	});

	test('Empty Email with valid details', async ({ baseURL, page }) => {
		await waitForSignUpPageSuccess(baseURL, page);

		await fillDetailsInSignUpForm({
			companyName: validCompanyName,
			confirmPassword: validPassword,
			email: '',
			name: validName,
			page,
			password: validPassword,
		});

		const gettingStartedButton = page.locator(getStartedButtonSelector);

		expect(await gettingStartedButton.isDisabled()).toBe(true);
		expect(await page.screenshot()).toMatchSnapshot();
	});

	test('Empty Password and confirm password with valid details', async ({
		baseURL,
		page,
	}) => {
		await waitForSignUpPageSuccess(baseURL, page);

		await fillDetailsInSignUpForm({
			companyName: validCompanyName,
			confirmPassword: '',
			email: validemail,
			name: validName,
			page,
			password: '',
		});

		const gettingStartedButton = page.locator(getStartedButtonSelector);

		expect(await gettingStartedButton.isDisabled()).toBe(true);

		// password validation message is not present
		const locator = await page.locator(confirmPasswordSelector).isVisible();
		expect(locator).toBe(false);
		expect(await page.screenshot()).toMatchSnapshot();
	});

	test('Miss Match Password and confirm password with valid details', async ({
		baseURL,
		page,
	}) => {
		await waitForSignUpPageSuccess(baseURL, page);

		await fillDetailsInSignUpForm({
			companyName: validCompanyName,
			confirmPassword: validPassword,
			email: validemail,
			name: validName,
			page,
			password: '',
		});

		// password validation message is not present
		const locator = await page.locator(confirmPasswordSelector).isVisible();
		expect(locator).toBe(true);
		expect(await page.screenshot()).toMatchSnapshot();
	});
});
