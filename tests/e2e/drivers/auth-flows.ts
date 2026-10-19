import { expect, type Locator, type Page } from '@playwright/test';

import type { User } from './auth';
import { storageKey } from './base-path';
import { dashboardsDriver } from './dashboards';
import { guestDriver, kit, type Layer } from './kit';
import { withSettings } from './settings/driver';

/**
 * The logged-out flows: sign in, forgot password, set a password from a reset
 * or invite link, sign out. Bound to `guestPage`, a context with no session, so
 * signing in here never touches the worker's cached admin session.
 */

export interface AuthFlows {
	goto(pathOrUrl: string): Promise<void>;
	pathname(): string;
	url(): URL;
	reload(): Promise<void>;

	gotoLogin(query?: string): Promise<void>;
	expectOnLogin(): Promise<void>;
	enterEmail(email: string): Promise<void>;
	emailInput(): Locator;
	enterPassword(password: string): Promise<void>;
	submitPassword(): Promise<void>;
	/** Sign in and wait for the app to leave `/login`. */
	login(user: User): Promise<void>;
	authError(): Locator;

	forgotPasswordLink(): Locator;
	/** Submit the forgot-password form; resolves with the POST's status. */
	submitForgot(): Promise<number>;
	forgotSuccess(): Locator;
	backToLogin(): Promise<void>;

	/** Fill both password fields on a reset/invite link and submit. */
	setNewPassword(password: string): Promise<void>;
	tokenError(): Locator;

	/** The signed-in shell's user entry, which only renders once logged in. */
	settingsNavItem(): Locator;
	openUserMenu(): Promise<void>;
	loggedInAs(): Locator;
	signOut(): Promise<void>;
	storedToken(): Promise<string | null>;
	newDashboardButton(): Locator;
	/** Open the dashboards list, search it for `title` and return the row. */
	findDashboard(title: string): Promise<Locator>;
}

export function authFlowsDriver(page: Page): AuthFlows {
	const flows: AuthFlows = {
		goto: async (pathOrUrl) => {
			await page.goto(pathOrUrl);
		},
		pathname: () => new URL(page.url()).pathname,
		url: () => new URL(page.url()),
		reload: async () => {
			await page.reload();
		},

		gotoLogin: async (query) => {
			await page.goto(query ? `/login?${query}` : '/login');
			await expect(flows.emailInput()).toBeVisible();
		},

		expectOnLogin: async () => {
			await page.waitForURL((url) => url.pathname === '/login');
			await expect(flows.emailInput()).toBeVisible();
		},

		emailInput: () => page.getByTestId('email'),

		enterEmail: async (email) => {
			await flows.emailInput().fill(email);
			await page.getByTestId('initiate_login').click();
			await expect(page.getByTestId('password')).toBeVisible();
		},

		enterPassword: async (password) => {
			await page.getByTestId('password').fill(password);
		},

		submitPassword: async () => {
			await page.getByTestId('password_authn_submit').click();
		},

		login: async (user) => {
			await flows.gotoLogin();
			await flows.enterEmail(user.email);
			await flows.enterPassword(user.password);
			await flows.submitPassword();
			await page.waitForURL((url) => !url.pathname.startsWith('/login'));
			await expect(flows.settingsNavItem()).toBeVisible();
		},

		authError: () => page.getByTestId('auth-error'),

		forgotPasswordLink: () => page.getByText('Forgot password?', { exact: true }),

		submitForgot: async () => {
			const sent = page.waitForResponse(
				(response) =>
					response.request().method() === 'POST' &&
					new URL(response.url()).pathname === '/api/v2/factor_password/forgot',
			);
			await page.getByTestId('forgot-password-submit').click();
			return (await sent).status();
		},

		forgotSuccess: () => page.getByRole('heading', { name: 'Check your email' }),

		backToLogin: async () => {
			await page.getByTestId('back-to-login').click();
			await flows.expectOnLogin();
		},

		setNewPassword: async (password) => {
			await page.getByTestId('password').fill(password);
			await page.getByTestId('confirmPassword').fill(password);
			await page.getByTestId('reset-password-submit').click();
			await flows.expectOnLogin();
		},

		tokenError: () =>
			page.getByRole('heading', {
				name:
					/Reset Password token is expired|Invalid Reset Link|Reset Link Unavailable/,
			}),

		settingsNavItem: () => page.getByTestId('settings-nav-item'),

		openUserMenu: async () => {
			await flows.settingsNavItem().click();
			await expect(page.getByTestId('logout-nav-item')).toBeVisible();
		},

		loggedInAs: () => page.getByTestId('logged-in-as-nav-item'),

		signOut: async () => {
			await flows.openUserMenu();
			await page.getByTestId('logout-nav-item').click();
			await flows.expectOnLogin();
		},

		storedToken: () =>
			page.evaluate((key) => localStorage.getItem(key), storageKey('AUTH_TOKEN')),

		newDashboardButton: () => page.getByTestId('new-dashboard-cta'),

		findDashboard: async (title) => {
			const dashboards = dashboardsDriver(page);
			await dashboards.gotoList();
			await dashboards.searchFor(title);
			return dashboards.row(title);
		},
	};

	return flows;
}

export const withAuthFlows: Layer<{ authFlows: AuthFlows }> = guestDriver(
	'authFlows',
	({ page }) => authFlowsDriver(page),
);

/**
 * The auth `test`: the guest flows, plus the settings driver on the admin page
 * for the half of a flow an admin drives.
 */
export const test = withAuthFlows(withSettings(kit));
export { ADMIN, expect } from './kit';
export { E2E_PASSWORD } from './users';
