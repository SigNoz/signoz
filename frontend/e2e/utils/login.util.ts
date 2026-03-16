import { Page } from '@playwright/test';

// Read credentials from environment variables
const username = process.env.LOGIN_USERNAME;
const password = process.env.LOGIN_PASSWORD;
const baseURL = process.env.BASE_URL;

/**
 * Ensures the user is logged in. If not, performs the login steps.
 * Follows the MCP process step-by-step.
 */
export async function ensureLoggedIn(page: Page): Promise<void> {
	// if already in home page, return
	if (await page.url().includes('/home')) {
		return;
	}

	if (!username || !password) {
		throw new Error(
			'E2E_EMAIL and E2E_PASSWORD environment variables must be set.',
		);
	}

	await page.goto(`${baseURL}/login`);
	await page.getByTestId('email').click();
	await page.getByTestId('email').fill(username);
	await page.getByTestId('initiate_login').click();
	await page.getByTestId('password').click();
	await page.getByTestId('password').fill(password);
	await page.getByRole('button', { name: 'Login' }).click();

	await page
		.getByText('Hello there, Welcome to your')
		.waitFor({ state: 'visible' });
}
