import { expect, test } from '../../drivers/integrations';

// Owns `builtin-nginx`: no other spec installs it or asserts its badge. The two
// scenarios are one lifecycle, so they run in order on one worker.

test.describe.configure({ mode: 'serial' });

test.describe('Integration install', () => {
	// known: POST /api/v1/integrations/install returns 500 on sqlite, the config
	// column is written through InstalledIntegrationConfig.Value() as []byte and
	// Scan then fails with "invalid character '\\'"
	test.fixme('TC-01 connecting installs the integration and shows it listening', async ({
		integrations,
		ownedIntegration,
	}) => {
		await integrations.gotoDetail(ownedIntegration);
		await expect(integrations.connectButton()).toHaveText(/^Connect /);

		const installed = await integrations.connect();
		expect(installed.status(), await installed.text()).toBe(200);
		expect(installed.request().postDataJSON()).toMatchObject({
			integration_id: ownedIntegration,
		});

		await expect(integrations.connectionStatus()).toHaveText(
			'Listening for data...',
		);
		await expect(integrations.connectionStatus()).toHaveAttribute(
			'data-state',
			'testingConnection',
		);
		await expect(integrations.removeButton()).toBeVisible();
		await expect(integrations.connectButton()).toHaveText('Test Connection');

		await integrations.gotoList();
		await expect(integrations.rowStatus(ownedIntegration)).toHaveText(
			/^Installed$/i,
		);
	});

	// known: needs TC-01's install, see above
	test.fixme('TC-02 removing uninstalls it', async ({
		integrations,
		ownedIntegration,
	}) => {
		await integrations.gotoDetail(ownedIntegration);
		await expect(integrations.removeButton()).toBeVisible();

		const removed = await integrations.remove();
		expect(removed.status()).toBe(200);

		await expect(integrations.removeButton()).toHaveCount(0);
		await expect(integrations.connectButton()).toHaveText('Connect Nginx');

		await integrations.gotoList();
		await expect(integrations.rowStatus(ownedIntegration)).toHaveText(
			/^Not Installed$/i,
		);
	});
});
