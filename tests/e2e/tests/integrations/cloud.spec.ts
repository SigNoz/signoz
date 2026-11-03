import { expect, test } from '../../drivers/integrations';

// The one-click cloud pages against the real cloud-integrations API. The account
// and service contract (create, check-in, update, dashboard provisioning) is
// covered headless by tests/integration/tests/cloudintegrations/. Accounts are
// org-global: every assertion names an account this worker created, and
// "Integrate Now" is never asserted.

const SMOKE = [
	{ provider: 'aws', service: 'ec2' },
	{ provider: 'gcp', service: 'computeengine' },
	{ provider: 'azure', service: 'aks' },
] as const;

/** The AWS agent polls every 10 s, so one missed poll still lands. */
const AWS_POLL_BUDGET = 25_000;

test.describe('Cloud integrations', () => {
	for (const { provider, service } of SMOKE) {
		test(`TC-01 the ${provider} page renders its services`, async ({
			cloud,
			integrations,
			noise,
		}) => {
			const page = cloud(provider);
			await page.goto();

			await expect(page.service(service)).toBeVisible();
			await expect(page.detailsTab('Overview')).toBeVisible();

			expect(noise.errors).toEqual([]);
			expect(integrations.unexpectedFailures(noise)).toEqual([]);
		});
	}

	test('TC-02 a checked-in AWS account is selectable and lists its services by state', async ({
		authedPage,
		awsAccount,
		cloud,
	}) => {
		const aws = cloud('aws');
		await aws.goto(awsAccount.id);

		await expect(aws.accountSelector()).toContainText(
			awsAccount.providerAccountId,
		);
		await expect(aws.notEnabledService('rds')).toBeVisible();

		await aws.service('rds').click();
		await expect(authedPage).toHaveURL(/[?&]service=rds(&|$)/);
		await expect(aws.metricsSwitch()).toBeEnabled();
	});

	test('TC-03 enabling metrics for a service saves, moves it to Enabled, and exposes its dashboards', async ({
		authedPage,
		awsAccount,
		cloud,
	}) => {
		const aws = cloud('aws');
		try {
			await aws.goto(awsAccount.id);
			await aws.service('rds').click();
			await expect(aws.metricsSwitch()).toBeEnabled();

			await aws.metricsSwitch().click();
			const saved = await aws.saveService();
			expect(saved.ok()).toBe(true);
			expect(saved.request().postDataJSON()).toMatchObject({
				config: { aws: { metrics: { enabled: true } } },
			});

			await expect(aws.saveButton()).toHaveCount(0);
			await expect(aws.discardButton()).toHaveCount(0);
			await expect(aws.enabledService('rds')).toBeVisible();

			// Provisioned dashboards arrive with the service refetch.
			const card = aws.provisionedDashboardCards().first();
			await expect(card).toBeVisible();
			await card.click();
			await expect(authedPage).toHaveURL(/\/dashboard\/[^/?]+/);
			await expect(aws.dashboardTitle()).toBeVisible();
		} finally {
			await aws.setService(awsAccount.id, 'rds', { metrics: false, logs: false });
		}
	});

	test('TC-04 adding an AWS account reaches the waiting state and completes on agent check-in', async ({
		cloud,
		integrations,
	}) => {
		const aws = cloud('aws');
		const providerAccountId = `e2e-aws-ui-${Date.now()}`;
		let accountId = '';
		try {
			await aws.goto();
			await aws.addAccount();
			await aws.aws.pickDeploymentRegion('US East (N. Virginia)');
			await aws.aws.toggleRegion('us-east-1');
			await aws.aws.fillMissingCredentials();

			const launched = await aws.aws.launch();
			accountId = launched.accountId;
			expect(launched.body.config?.aws?.regions).toEqual(['us-east-1']);
			expect(launched.connectionUrl).toContain(
				'console.aws.amazon.com/cloudformation',
			);
			expect(launched.connectionUrl).toContain(
				`param_SigNozAccountId=${accountId}`,
			);
			await expect(aws.waitingCallout()).toBeVisible();

			await aws.checkIn(accountId, providerAccountId);
			await expect(
				integrations.toast('AWS account connected successfully'),
			).toBeVisible({ timeout: AWS_POLL_BUDGET });

			await aws.goto(accountId);
			await expect(aws.accountSelector()).toContainText(providerAccountId);
		} finally {
			await aws.removeAccount(accountId);
		}
	});

	test('TC-05 editing regions and disconnecting an AWS account', async ({
		cloud,
		integrations,
	}) => {
		const aws = cloud('aws');
		const providerAccountId = `e2e-aws-edit-${Date.now()}`;
		const id = await aws.seedAccount(providerAccountId, [
			'us-east-1',
			'us-west-2',
		]);
		try {
			await aws.goto(id);
			await expect(aws.accountSelector()).toContainText(providerAccountId);

			await aws.editAccount();
			const updated = await aws.aws.updateRegions(['us-east-1', 'eu-west-1']);
			expect(updated.ok()).toBe(true);
			expect(
				[
					...(updated.request().postDataJSON().config.aws.regions as string[]),
				].sort(),
			).toEqual(['eu-west-1', 'us-east-1']);
			await expect(
				integrations.toast('Account settings updated successfully'),
			).toBeVisible();

			await aws.editAccount();
			await expect(aws.aws.region('eu-west-1')).toHaveAttribute(
				'aria-checked',
				'true',
			);

			const deleted = await aws.disconnect();
			expect(deleted.status()).toBe(204);
			await expect(aws.accountSelector()).not.toContainText(providerAccountId);
			expect((await aws.listAccounts()).map((a) => a.id)).not.toContain(id);
		} finally {
			await aws.removeAccount(id);
		}
	});

	test('TC-06 GCP connect completes in the UI against the real backend', async ({
		cloud,
		integrations,
	}) => {
		const gcp = cloud('gcp');
		const name = `e2e-gcp-${Date.now()}`;
		let id = '';
		try {
			await gcp.goto();
			await gcp.addAccount();
			await gcp.gcp.fill({
				name,
				projectId: 'e2e-deploy-project',
				region: 'Council Bluffs (us-central1)',
				projectIds: ['e2e-monitored-project'],
			});

			const { created, checkedIn } = await gcp.gcp.connect();
			expect(created.status()).toBe(201);
			id = ((await created.json()) as { data: { id: string } }).data.id;
			expect(checkedIn.status()).toBe(200);

			await expect(
				integrations.toast('GCP account connected successfully'),
			).toBeVisible();
			await expect(gcp.gcp.connectButton()).toHaveCount(0);

			await gcp.goto(id);
			await expect(gcp.accountSelector()).toContainText(name);
		} finally {
			await gcp.removeAccount(id);
		}
	});
});
