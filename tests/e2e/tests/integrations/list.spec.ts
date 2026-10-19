import { expect, test } from '../../drivers/integrations';

// The built-in list and its detail page against the real integrations API.
// Client-side search, connection-state derivation and the modal labels are
// jest territory (see the plan's jest list); install state is org-global, so
// badges are asserted for presence only.

const BUILT_INS = ['builtin-redis', 'builtin-postgres', 'builtin-clickhouse'];
const ONE_CLICK = ['aws', 'gcp', 'azure'] as const;

test.describe('Integrations list', () => {
	test('TC-01 the list renders built-in and one-click integrations from the API', async ({
		integrations,
		noise,
	}) => {
		await integrations.gotoList();

		for (const id of BUILT_INS) {
			await expect(integrations.row(id)).toBeVisible();
			await expect(integrations.rowStatus(id)).toHaveText(
				/^(Installed|Not Installed)$/i,
			);
		}
		for (const id of ONE_CLICK) {
			await expect(integrations.oneClick(id)).toBeVisible();
		}

		await integrations.search('redis');
		await expect(integrations.row('builtin-redis')).toBeVisible();
		await expect(integrations.row('builtin-nginx')).toHaveCount(0);

		expect(noise.errors).toEqual([]);
		expect(noise.failedResponses).toEqual([]);
	});

	test('TC-02 a row opens its detail page, and the tabs render real content', async ({
		authedPage: page,
		integrations,
	}) => {
		await integrations.gotoList();
		await integrations.row('builtin-clickhouse').click();
		await expect(page).toHaveURL(/\/integrations\/builtin-clickhouse$/);
		await expect(integrations.connectButton()).toBeEnabled();

		await expect(integrations.tab('Overview')).toHaveAttribute(
			'aria-selected',
			'true',
		);
		await expect(integrations.categories().first()).toBeVisible();
		await expect(integrations.assets()).toContainText('Dashboards');

		await integrations.openTab('Configure');
		// Clickhouse ships several steps; the first is selected on mount.
		const target = integrations.configureSteps().nth(1);
		await expect(target).not.toHaveClass(/\bactive\b/);
		await target.click();
		await expect(target).toHaveClass(/\bactive\b/);

		await integrations.openTab('Data Collected');
		await expect(integrations.metricsRows().first()).toBeVisible();

		await integrations.backToList();
	});
});
