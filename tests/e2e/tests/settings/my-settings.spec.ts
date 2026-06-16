import type { Page } from '@playwright/test';

import { expect, test } from '../../fixtures/auth';
import { authToken } from '../../helpers/dashboards';
import { personaSkipReason } from '../../helpers/settingsAccess';
import { SETTINGS_ROUTES } from '../../helpers/settings';

test.describe.configure({ mode: 'serial' });

// Runtime branching lives in these helpers, not test() bodies — playwright/no-conditional-in-test.

async function gotoMySettings(page: Page): Promise<void> {
	await page.goto(SETTINGS_ROUTES.MY_SETTINGS);
	await expect(page.getByTestId('theme-selector')).toBeVisible();
}

async function readThemeState(
	page: Page,
): Promise<{ theme: string; autoSwitch: string }> {
	// globalThis cast: the evaluate callback runs in the browser, but the e2e
	// tsconfig uses the ES2020 lib (no DOM), so `localStorage` isn't typed here.
	return page.evaluate(() => ({
		theme: (globalThis as any).localStorage.getItem('THEME') ?? 'dark',
		autoSwitch:
			(globalThis as any).localStorage.getItem('THEME_AUTO_SWITCH') ?? 'false',
	}));
}

async function restoreTheme(
	page: Page,
	theme: string,
	autoSwitch: string,
): Promise<void> {
	await page.evaluate(
		([t, a]) => {
			(globalThis as any).localStorage.setItem('THEME', t);
			(globalThis as any).localStorage.setItem('THEME_AUTO_SWITCH', a);
		},
		[theme, autoSwitch],
	);
}

async function restoreSideNavPinned(
	page: Page,
	originalChecked: string,
): Promise<void> {
	const token = await authToken(page);
	await page.request.put('/api/v1/user/preferences/sidenav_pinned', {
		data: { value: originalChecked === 'true' },
		headers: { Authorization: `Bearer ${token}` },
	});
}

function flipAriaChecked(current: string): string {
	if (current === 'true') {
		return 'false';
	}
	return 'true';
}

test.describe('My Settings — Account page', () => {
	test('TC-01 page renders with all expected controls', async ({
		authedPage: page,
		persona,
		env,
	}) => {
		test.skip(
			!!personaSkipReason(persona, env, SETTINGS_ROUTES.MY_SETTINGS),
			personaSkipReason(persona, env, SETTINGS_ROUTES.MY_SETTINGS) ?? undefined,
		);

		await gotoMySettings(page);

		await expect(
			page.getByRole('button', { name: /update name/i }),
		).toBeVisible();
		await expect(
			page.getByRole('button', { name: /reset password/i }).first(),
		).toBeVisible();

		await expect(page.getByTestId('theme-selector')).toBeVisible();
		await expect(page.getByTestId('timezone-adaptation-switch')).toBeVisible();
		await expect(page.getByTestId('side-nav-pinned-switch')).toBeVisible();

		// License copy button renders because bootstrap issues an enterprise license on cloud.
		await expect(page.getByTestId('license-key-copy-btn')).toBeVisible();
	});

	test('TC-02 theme toggle cycles dark → light → auto and applies', async ({
		authedPage: page,
		persona,
		env,
	}) => {
		test.skip(
			!!personaSkipReason(persona, env, SETTINGS_ROUTES.MY_SETTINGS),
			personaSkipReason(persona, env, SETTINGS_ROUTES.MY_SETTINGS) ?? undefined,
		);

		await gotoMySettings(page);

		const originalTheme = await readThemeState(page);

		try {
			// Radix ToggleGroup renders items as role="radio" within a radiogroup.
			const selector = page.getByTestId('theme-selector');
			const darkRadio = selector.getByRole('radio', { name: /dark/i });
			const lightRadio = selector.getByRole('radio', { name: /light/i });
			const systemRadio = selector.getByRole('radio', { name: /system/i });

			await lightRadio.click();
			await expect(lightRadio).toBeChecked();

			await systemRadio.click();
			await expect(systemRadio).toBeChecked();

			await darkRadio.click();
			await expect(darkRadio).toBeChecked();
		} finally {
			await restoreTheme(page, originalTheme.theme, originalTheme.autoSwitch);
		}
	});

	test('TC-03 sidebar pin toggle flips checked state', async ({
		authedPage: page,
		persona,
		env,
	}) => {
		test.skip(
			!!personaSkipReason(persona, env, SETTINGS_ROUTES.MY_SETTINGS),
			personaSkipReason(persona, env, SETTINGS_ROUTES.MY_SETTINGS) ?? undefined,
		);

		await gotoMySettings(page);

		const switchEl = page.getByTestId('side-nav-pinned-switch');
		const originalChecked =
			(await switchEl.getAttribute('aria-checked')) ?? 'false';
		const expectedAfterToggle = flipAriaChecked(originalChecked);

		try {
			await switchEl.click();
			// Pin state persists server-side; allow margin for the update under
			// parallel-worker CPU contention (default 5s expect timeout flakes).
			await expect(switchEl).toHaveAttribute('aria-checked', expectedAfterToggle, {
				timeout: 15_000,
			});
		} finally {
			await restoreSideNavPinned(page, originalChecked);
		}
	});

	test('TC-04 timezone adaptation toggle flips checked state', async ({
		authedPage: page,
		persona,
		env,
	}) => {
		test.skip(
			!!personaSkipReason(persona, env, SETTINGS_ROUTES.MY_SETTINGS),
			personaSkipReason(persona, env, SETTINGS_ROUTES.MY_SETTINGS) ?? undefined,
		);

		await gotoMySettings(page);

		const switchEl = page.getByTestId('timezone-adaptation-switch');
		const originalChecked =
			(await switchEl.getAttribute('aria-checked')) ?? 'true';
		const expectedAfterToggle = flipAriaChecked(originalChecked);

		try {
			await switchEl.click();
			await expect(switchEl).toHaveAttribute('aria-checked', expectedAfterToggle, {
				timeout: 15_000,
			});
		} finally {
			// isAdaptationEnabled is not persisted — toggle back to restore session state.
			await switchEl.click();
		}
	});

	// note: PUT /api/v2/users/me returns root_user_operation_unsupported for the
	// bootstrap admin user. Only the modal open/input/submit-button UI is tested
	// here; the "name reflects in card after save" assertion cannot be verified
	// against this stack.
	test('TC-05 update name modal — opens, pre-fills, submit button active', async ({
		authedPage: page,
		persona,
		env,
	}) => {
		test.skip(
			!!personaSkipReason(persona, env, SETTINGS_ROUTES.MY_SETTINGS),
			personaSkipReason(persona, env, SETTINGS_ROUTES.MY_SETTINGS) ?? undefined,
		);

		await gotoMySettings(page);

		const currentName = await page.locator('.user-name').first().innerText();

		await page.getByRole('button', { name: /update name/i }).click();

		const nameInput = page.getByPlaceholder('e.g. John Doe');
		await expect(nameInput).toBeVisible();

		await expect(nameInput).toHaveValue(currentName);

		const submitBtn = page.getByTestId('update-name-btn');
		await expect(submitBtn).toBeVisible();
		await expect(submitBtn).toBeEnabled();

		// Close via × button — Ant Modal's Escape handler can race with input focus in headless mode.
		await page
			.locator('.update-name-modal')
			.getByRole('button', { name: 'Close' })
			.click();
		await expect(nameInput).not.toBeVisible();
	});

	test('TC-06 reset-password modal — validation only, never submits', async ({
		authedPage: page,
		persona,
		env,
	}) => {
		test.skip(
			!!personaSkipReason(persona, env, SETTINGS_ROUTES.MY_SETTINGS),
			personaSkipReason(persona, env, SETTINGS_ROUTES.MY_SETTINGS) ?? undefined,
		);

		await gotoMySettings(page);

		// The button that OPENS the modal has no testid; reset-password-btn is the SUBMIT button inside.
		await page
			.getByRole('button', { name: /reset password/i })
			.first()
			.click();

		const currentPasswordInput = page.getByTestId('current-password-textbox');
		const newPasswordInput = page.getByTestId('new-password-textbox');
		const submitBtn = page.getByTestId('reset-password-btn');

		await expect(currentPasswordInput).toBeVisible();
		await expect(newPasswordInput).toBeVisible();

		await expect(submitBtn).toBeDisabled();

		await currentPasswordInput.fill('somepassword');
		await expect(submitBtn).toBeDisabled();

		// Same value → passwords match → validation error + disabled
		await newPasswordInput.fill('somepassword');
		await expect(page.getByText(/new password must be different/i)).toBeVisible();
		await expect(submitBtn).toBeDisabled();

		// Stop at enabled — clicking would rotate the admin password and break every other worker.
		await newPasswordInput.fill('differentpassword!1');
		await expect(submitBtn).toBeEnabled();

		await page
			.locator('.reset-password-modal')
			.getByRole('button', { name: 'Close' })
			.click();
		await expect(currentPasswordInput).not.toBeVisible();
	});
});
