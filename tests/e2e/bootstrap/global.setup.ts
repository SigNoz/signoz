import { expect, test as setup } from '@playwright/test';

const seederUrl = process.env.SIGNOZ_E2E_SEEDER_URL ?? '';

setup('refresh golden dataset', async ({ request }) => {
	expect(seederUrl, 'SIGNOZ_E2E_SEEDER_URL not set').not.toBe('');
	const response = await request.post(`${seederUrl}/seed/golden`, {
		timeout: 120_000,
	});
	expect(response.ok()).toBeTruthy();
	// eslint-disable-next-line no-console
	console.log(`[setup] refreshed golden dataset: ${await response.text()}`);
});
