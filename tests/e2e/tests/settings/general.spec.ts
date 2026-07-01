import type { Page } from '@playwright/test';

import { expect, test } from '../../fixtures/auth';
import {
	personaSkipReason,
	tierSkipReason,
} from '../../helpers/settingsAccess';
import { SETTINGS_ROUTES } from '../../helpers/settings';

// Workspace (/settings) has two views: cloud (retention inputs disabled, no Save,
// GeneralSettingsCloud support card) and self-hosted (interactive inputs, per-row Save).
// Retention inputs in compact mode have no data-testid — role/text/CSS fallback.

async function gotoWorkspace(page: Page): Promise<void> {
	await page.goto(SETTINGS_ROUTES.WORKSPACE);
	// Retention data is fetched server-side; allow margin for the API response.
	await expect(page.locator('.retention-controls-container')).toBeVisible({
		timeout: 15_000,
	});
}

function retentionRow(page: Page, signal: string) {
	return page.locator('.retention-row').filter({ hasText: signal });
}

function retentionInput(page: Page, signal: string) {
	return retentionRow(page, signal).locator('input[type="number"]').first();
}

function saveButton(page: Page, signal: string) {
	return retentionRow(page, signal).getByRole('button', { name: /^save$/i });
}

// Tier sets for the two Workspace content variants.
const CLOUD_TIERS = ['cloud'] as const;
const SELF_HOSTED_TIERS = [
	'enterprise',
	'community',
	'community-enterprise',
] as const;

test.describe('Settings — Workspace / General page', () => {
	test('TC-01 page renders retention controls and license-key row', async ({
		authedPage: page,
		persona,
		env,
	}) => {
		test.skip(
			!!personaSkipReason(persona, env, SETTINGS_ROUTES.WORKSPACE),
			personaSkipReason(persona, env, SETTINGS_ROUTES.WORKSPACE) ?? undefined,
		);

		await gotoWorkspace(page);

		// Scoped to avoid strict-mode conflict with the sidenav item.
		await expect(page.locator('.general-settings-title')).toContainText(
			'Workspace',
		);
		await expect(page.locator('.general-settings-subtitle')).toContainText(
			'Manage your workspace settings.',
		);

		await expect(page.getByText('Retention Controls')).toBeVisible();

		await expect(retentionRow(page, 'Metrics')).toBeVisible();
		await expect(retentionRow(page, 'Traces')).toBeVisible();
		await expect(retentionRow(page, 'Logs')).toBeVisible();

		await expect(retentionInput(page, 'Metrics')).toBeVisible();
		await expect(retentionInput(page, 'Traces')).toBeVisible();
		await expect(retentionInput(page, 'Logs')).toBeVisible();

		await expect(page.getByTestId('license-key-row-copy-btn')).toBeVisible();
	});

	// RISK MODE: read-only — only asserts disabled state, nothing is mutated.
	test('TC-02 cloud view — retention inputs are disabled and support card is visible', async ({
		authedPage: page,
		persona,
		env,
	}) => {
		test.skip(
			!!personaSkipReason(persona, env, SETTINGS_ROUTES.WORKSPACE),
			personaSkipReason(persona, env, SETTINGS_ROUTES.WORKSPACE) ?? undefined,
		);
		test.skip(
			!!tierSkipReason(persona, [...CLOUD_TIERS], 'cloud retention view'),
			tierSkipReason(persona, [...CLOUD_TIERS], 'cloud retention view') ??
				undefined,
		);

		await gotoWorkspace(page);

		await expect(retentionInput(page, 'Metrics')).toBeDisabled();
		await expect(retentionInput(page, 'Traces')).toBeDisabled();
		await expect(retentionInput(page, 'Logs')).toBeDisabled();

		await expect(saveButton(page, 'Metrics')).toHaveCount(0);
		await expect(saveButton(page, 'Traces')).toHaveCount(0);
		await expect(saveButton(page, 'Logs')).toHaveCount(0);

		await expect(
			page.getByText(/please.*email us.*or connect.*via chat support/i),
		).toBeVisible();
	});

	// RISK MODE: never clicks Save — only asserts enable-on-change / disable-on-clear; no PUT/POST.
	test('TC-03 self-hosted view — retention input enables/disables Save — no save triggered', async ({
		authedPage: page,
		persona,
		env,
	}) => {
		test.skip(
			!!personaSkipReason(persona, env, SETTINGS_ROUTES.WORKSPACE),
			personaSkipReason(persona, env, SETTINGS_ROUTES.WORKSPACE) ?? undefined,
		);
		test.skip(
			!!tierSkipReason(
				persona,
				[...SELF_HOSTED_TIERS],
				'self-hosted retention controls',
			),
			tierSkipReason(
				persona,
				[...SELF_HOSTED_TIERS],
				'self-hosted retention controls',
			) ?? undefined,
		);

		await gotoWorkspace(page);

		const metricsInput = retentionInput(page, 'Metrics');
		const metricsSaveBtn = saveButton(page, 'Metrics');

		const originalValue = await metricsInput.inputValue();

		try {
			await metricsInput.fill('9999');
			await expect(metricsSaveBtn).toBeEnabled();

			await metricsInput.fill('');
			await expect(metricsSaveBtn).toBeDisabled();
			await expect(
				page.getByText(/retention period for .+ is not set yet/i),
			).toBeVisible();
		} finally {
			// Restore so unsaved UI state does not leak to other workers sharing this stack.
			await metricsInput.fill(originalValue);
		}
	});
});
