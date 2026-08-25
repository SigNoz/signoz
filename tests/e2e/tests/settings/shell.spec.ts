import type { Persona, SettingsEnv } from '../../helpers/persona';

import { expect, test } from '../../fixtures/auth';
import {
	registeredRoutes,
	visibleNavItems,
} from '../../helpers/settingsAccess';
import {
	NAV_TESTID,
	SETTINGS_ROUTES,
	gotoSettings,
} from '../../helpers/settings';

// Branching lives in module-level helpers, not test bodies — the repo's
// playwright/no-conditional-in-test rule forbids `if` inside `test()`.

function partitionNavTestids(
	persona: Persona,
	env: SettingsEnv,
): { visible: string[]; hidden: string[] } {
	const all = Object.values(NAV_TESTID);
	const expected = visibleNavItems(persona, env);
	return {
		visible: all.filter((testid) => expected.has(testid)),
		hidden: all.filter((testid) => !expected.has(testid)),
	};
}

// Visible nav items whose /settings route is not registered (mounted).
// INTEGRATIONS is excluded — it is a top-level page, not a RouteTab route.
function navRouteMismatches(persona: Persona, env: SettingsEnv): string[] {
	const visible = visibleNavItems(persona, env);
	const registered = registeredRoutes(persona, env);
	const routeByTestid = Object.fromEntries(
		Object.entries(NAV_TESTID).map(([route, testid]) => [testid, route]),
	);
	return [...visible]
		.map((testid) => routeByTestid[testid])
		.filter((route) => !!route && route !== SETTINGS_ROUTES.INTEGRATIONS)
		.filter((route) => !registered.has(route))
		.map((route) => `${route} is nav-visible but route not registered`);
}

test.describe('Settings — shell, gating matrix & integrity', () => {
	test('TC-01 settings shell chrome renders with no JS pageerror', async ({
		authedPage: page,
	}) => {
		const errors: Error[] = [];
		page.on('pageerror', (err) => errors.push(err));

		await gotoSettings(page);

		await expect(page.getByTestId('settings-page-title')).toBeVisible();
		await expect(page.getByTestId('settings-page-sidenav')).toBeVisible();
		expect(errors, errors.map((e) => e.message).join('\n')).toHaveLength(0);
	});

	test('TC-02 sidenav shows exactly the matrix-predicted items', async ({
		authedPage: page,
		persona,
		env,
	}) => {
		await gotoSettings(page);
		const sidenav = page.getByTestId('settings-page-sidenav');
		const { visible, hidden } = partitionNavTestids(persona, env);

		for (const testid of visible) {
			await expect(
				sidenav.getByTestId(testid),
				`${testid} should be visible`,
			).toBeVisible();
		}
		for (const testid of hidden) {
			await expect(
				sidenav.getByTestId(testid),
				`${testid} should be hidden`,
			).toHaveCount(0);
		}
	});

	test('TC-03 every registered route deep-links with no JS pageerror', async ({
		authedPage: page,
		persona,
		env,
	}) => {
		const routes = [...registeredRoutes(persona, env)];
		for (const route of routes) {
			const errors: Error[] = [];
			const onError = (err: Error): void => {
				errors.push(err);
			};
			page.on('pageerror', onError);
			await page.goto(route);
			await expect(page.getByTestId('settings-page-title')).toBeVisible();
			page.off('pageerror', onError);
			expect(
				errors,
				`pageerror on ${route}: ${errors.map((e) => e.message).join('\n')}`,
			).toHaveLength(0);
		}
	});

	test('TC-04 every visible nav item resolves to a registered route', async ({
		persona,
		env,
	}) => {
		const mismatches = navRouteMismatches(persona, env);
		expect(mismatches, mismatches.join('\n')).toHaveLength(0);
	});

	test('TC-05 clicking a nav item navigates and marks active', async ({
		authedPage: page,
		persona,
		env,
	}) => {
		test.skip(
			!visibleNavItems(persona, env).has('account'),
			'PERSONA_SKIP: account nav hidden',
		);
		await gotoSettings(page);
		const sidenav = page.getByTestId('settings-page-sidenav');
		await sidenav.getByTestId('account').click();
		await expect(page).toHaveURL(/\/settings\/my-settings/);
	});
});
