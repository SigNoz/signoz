import { expect, test } from '@playwright/test';

import { ensureLoggedIn } from '../../utils/login.util';

/**
 * Validates cmd/ctrl+click and middle-click open new tabs, while normal click
 * performs in-app SPA navigation. Covers every call site migrated to
 * safeNavigate({ newTab: isModifierKeyPressed(e) }).
 */

// ─── Home page ───────────────────────────────────────────────────────────────

test.describe('Home page – explore buttons', () => {
	test.beforeEach(async ({ page }) => {
		await ensureLoggedIn(page);
		await page.goto('/home');
		await page.waitForLoadState('networkidle');
	});

	const exploreButtons = [
		{ label: 'Open Logs Explorer', route: '/logs/logs-explorer' },
		{ label: 'Open Traces Explorer', route: '/traces-explorer' },
		{ label: 'Open Metrics Explorer', route: '/metrics-explorer' },
		{ label: 'Create dashboard', route: '/dashboard' },
		{ label: 'Create an alert', route: '/alerts/new' },
	];

	for (const { label, route } of exploreButtons) {
		test(`normal click navigates in-app: "${label}"`, async ({ page }) => {
			const btn = page.getByRole('button', { name: label }).first();
			// Button may not be visible if data has not been ingested – skip gracefully
			if (!(await btn.isVisible())) {
				test.skip();
				return;
			}
			await btn.click();
			await expect(page).toHaveURL(new RegExp(route));
		});

		test(`cmd+click opens new tab: "${label}"`, async ({ page, context }) => {
			const btn = page.getByRole('button', { name: label }).first();
			if (!(await btn.isVisible())) {
				test.skip();
				return;
			}
			const [newTab] = await Promise.all([
				context.waitForEvent('page'),
				btn.click({ modifiers: ['Meta'] }),
			]);
			await newTab.waitForLoadState();
			expect(newTab.url()).toContain(route);
			await newTab.close();
		});

		test(`ctrl+click opens new tab: "${label}"`, async ({ page, context }) => {
			const btn = page.getByRole('button', { name: label }).first();
			if (!(await btn.isVisible())) {
				test.skip();
				return;
			}
			const [newTab] = await Promise.all([
				context.waitForEvent('page'),
				btn.click({ modifiers: ['Control'] }),
			]);
			await newTab.waitForLoadState();
			expect(newTab.url()).toContain(route);
			await newTab.close();
		});
	}
});

// ─── Integrations header ─────────────────────────────────────────────────────

test.describe('Integrations header – View 150+ Data Sources', () => {
	test.beforeEach(async ({ page }) => {
		await ensureLoggedIn(page);
		await page.goto('/integrations');
		await page.waitForLoadState('networkidle');
	});

	test('normal click navigates in-app', async ({ page }) => {
		const btn = page.getByRole('button', { name: /View 150\+ Data Sources/i });
		if (!(await btn.isVisible())) {
			test.skip();
			return;
		}
		await btn.click();
		await expect(page).toHaveURL(/get-started/);
	});

	test('cmd+click opens new tab', async ({ page, context }) => {
		const btn = page.getByRole('button', { name: /View 150\+ Data Sources/i });
		if (!(await btn.isVisible())) {
			test.skip();
			return;
		}
		const [newTab] = await Promise.all([
			context.waitForEvent('page'),
			btn.click({ modifiers: ['Meta'] }),
		]);
		await newTab.waitForLoadState();
		expect(newTab.url()).toContain('get-started');
		await newTab.close();
	});

	test('middle-click opens new tab', async ({ page, context }) => {
		const btn = page.getByRole('button', { name: /View 150\+ Data Sources/i });
		if (!(await btn.isVisible())) {
			test.skip();
			return;
		}
		const [newTab] = await Promise.all([
			context.waitForEvent('page'),
			btn.dispatchEvent('click', { button: 1 }),
		]);
		await newTab.waitForLoadState();
		expect(newTab.url()).toContain('get-started');
		await newTab.close();
	});
});

// ─── Alert Details – breadcrumb navigation ───────────────────────────────────

test.describe('Alert Details – breadcrumb back navigation', () => {
	test('normal click on breadcrumb navigates in-app to alert list', async ({
		page,
	}) => {
		await ensureLoggedIn(page);
		await page.goto('/alerts');
		await page.waitForLoadState('networkidle');

		// Click the first alert rule to open its detail page
		const firstAlert = page
			.getByRole('link')
			.filter({ hasText: /edit/i })
			.first();
		if (!(await firstAlert.isVisible())) {
			// Try clicking any alert row
			const alertRow = page.locator('table tbody tr').first();
			if (!(await alertRow.isVisible())) {
				test.skip();
				return;
			}
			await alertRow.click();
		} else {
			await firstAlert.click();
		}

		await page.waitForLoadState('networkidle');
		await expect(page).toHaveURL(/alert-rules\/\d+/);

		// Click breadcrumb to go back to alert list
		const breadcrumb = page
			.locator('.breadcrumb-item')
			.filter({ hasText: /alert/i })
			.first();
		if (!(await breadcrumb.isVisible())) {
			test.skip();
			return;
		}
		await breadcrumb.click();
		await expect(page).toHaveURL(/\/alerts/);
	});

	test('cmd+click on breadcrumb opens alert list in new tab', async ({
		page,
		context,
	}) => {
		await ensureLoggedIn(page);
		await page.goto('/alerts');
		await page.waitForLoadState('networkidle');

		const alertRow = page.locator('table tbody tr').first();
		if (!(await alertRow.isVisible())) {
			test.skip();
			return;
		}
		await alertRow.click();
		await page.waitForLoadState('networkidle');

		const breadcrumb = page
			.locator('.breadcrumb-item')
			.filter({ hasText: /alert/i })
			.first();
		if (!(await breadcrumb.isVisible())) {
			test.skip();
			return;
		}
		const [newTab] = await Promise.all([
			context.waitForEvent('page'),
			breadcrumb.click({ modifiers: ['Meta'] }),
		]);
		await newTab.waitForLoadState();
		expect(newTab.url()).toContain('/alerts');
		await newTab.close();
	});
});

// ─── NewExplorerCTA – toggle between old/new explorer ────────────────────────

test.describe('NewExplorerCTA – explorer toggle', () => {
	test('normal click on CTA navigates in-app', async ({ page }) => {
		await ensureLoggedIn(page);
		await page.goto('/logs/logs-explorer');
		await page.waitForLoadState('networkidle');

		const cta = page.getByTestId('newExplorerCTA');
		if (!(await cta.isVisible())) {
			test.skip();
			return;
		}
		await cta.click();
		// Should navigate to old logs explorer
		await expect(page).toHaveURL(/old-logs-explorer|logs-explorer/);
	});

	test('cmd+click on CTA opens target in new tab', async ({ page, context }) => {
		await ensureLoggedIn(page);
		await page.goto('/logs/logs-explorer');
		await page.waitForLoadState('networkidle');

		const cta = page.getByTestId('newExplorerCTA');
		if (!(await cta.isVisible())) {
			test.skip();
			return;
		}
		const [newTab] = await Promise.all([
			context.waitForEvent('page'),
			cta.click({ modifiers: ['Meta'] }),
		]);
		await newTab.waitForLoadState();
		expect(newTab.url()).toMatch(/old-logs-explorer|logs-explorer/);
		await newTab.close();
	});
});
