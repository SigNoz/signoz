import type { Page } from '@playwright/test';

import { expect, test } from '../../fixtures/auth';
import {
	personaSkipReason,
	tierSkipReason,
} from '../../helpers/settingsAccess';
import { SETTINGS_ROUTES } from '../../helpers/settings';

// Ingestion page, two variants gated by env.isGatewayEnabled / tier:
// MultiIngestionSettings (gateway ON) vs read-only IngestionSettings (cloud, gateway OFF).
// RISK MODE — READ-ONLY: never create/edit/delete keys or rate limits; create
// button and copy affordances asserted for presence only, never clicked.
// Each TC guards its variant via test.skip so bodies stay branch-free
// (playwright/no-conditional-in-test).

test.describe.configure({ mode: 'serial' });

async function gotoIngestion(page: Page): Promise<void> {
	await page.goto(SETTINGS_ROUTES.INGESTION);
	// Ingestion keys/settings are fetched server-side; allow margin for the API response.
	await expect(
		page
			.locator('.ingestion-key-container, .ingestion-settings-container')
			.first(),
	).toBeVisible({ timeout: 15_000 });
}

test.describe('Settings — Ingestion page', () => {
	test('TC-01 MultiIngestionSettings — page chrome, search, table, and create affordance render', async ({
		authedPage: page,
		persona,
		env,
	}) => {
		test.skip(
			!!personaSkipReason(persona, env, SETTINGS_ROUTES.INGESTION),
			personaSkipReason(persona, env, SETTINGS_ROUTES.INGESTION) ?? undefined,
		);
		test.skip(
			!!tierSkipReason(
				persona,
				['cloud', 'enterprise'],
				'MultiIngestionSettings (gateway)',
			) || !env.isGatewayEnabled,
			!env.isGatewayEnabled
				? 'PERSONA_SKIP: gateway feature flag is OFF — MultiIngestionSettings does not render'
				: (tierSkipReason(
						persona,
						['cloud', 'enterprise'],
						'MultiIngestionSettings (gateway)',
					) ?? undefined),
		);

		await gotoIngestion(page);

		const container = page.locator('.ingestion-key-container');
		await expect(container).toBeVisible();

		// Exact name match avoids the subtitle partial match.
		await expect(
			container.getByRole('heading', { name: 'Ingestion Keys' }),
		).toBeVisible();
		await expect(
			container.getByText(/Create and manage ingestion keys/i),
		).toBeVisible();

		await expect(
			container.getByPlaceholder('Search for ingestion key...'),
		).toBeVisible();

		await expect(
			container.getByRole('button', { name: /new ingestion key/i }),
		).toBeVisible();

		await expect(container.locator('.ingestion-keys-table')).toBeVisible();

		await expect(
			container.locator('.ingestion-key-url-label', { hasText: 'Ingestion URL' }),
		).toBeVisible();
	});

	test('TC-02 IngestionSettings (read-only) — table rows for URL, key, and region render', async ({
		authedPage: page,
		persona,
		env,
	}) => {
		test.skip(
			!!personaSkipReason(persona, env, SETTINGS_ROUTES.INGESTION),
			personaSkipReason(persona, env, SETTINGS_ROUTES.INGESTION) ?? undefined,
		);
		// This view only renders on cloud when gateway is disabled
		test.skip(
			env.isGatewayEnabled,
			'PERSONA_SKIP: gateway is ON — MultiIngestionSettings renders instead of read-only table',
		);
		test.skip(
			!!tierSkipReason(persona, ['cloud'], 'IngestionSettings read-only table'),
			tierSkipReason(persona, ['cloud'], 'IngestionSettings read-only table') ??
				undefined,
		);

		await gotoIngestion(page);

		const container = page.locator('.ingestion-settings-container');
		await expect(container).toBeVisible();

		await expect(
			container.getByText(/start sending your telemetry data/i),
		).toBeVisible();

		const table = container.locator('.ant-table');
		await expect(table).toBeVisible();
		await expect(table.getByText('Ingestion URL')).toBeVisible();
		await expect(table.getByText('Ingestion Key')).toBeVisible();
		await expect(table.getByText('Ingestion Region')).toBeVisible();
	});
});
