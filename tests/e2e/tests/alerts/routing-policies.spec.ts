import { expect, test } from '../../drivers/alerts';

// Routing policies under Configuration. List rendering, search and the modal's
// validation are covered by jest in `container/RoutingPolicies/__tests__/`;
// here each write has to reach the real API.

test.describe('Routing policies', () => {
	test.describe.configure({ timeout: 60_000 });

	test('TC-01 a policy created, edited and deleted through the UI round-trips the API', async ({
		alerts,
		alertChannel,
	}) => {
		const name = `e2e-route-${Date.now()}`;
		const expression = 'service.name == "checkout"';
		const edited = 'service.name == "payment"';

		try {
			await alerts.routing.goto();
			await alerts.routing.newButton().click();
			await alerts.routing.fill({
				name,
				description: 'created by the e2e suite',
				expression,
				channel: alertChannel.name,
			});
			await alerts.routing.save();

			await expect(alerts.routing.row(name)).toBeVisible();
			await expect
				.poll(() => alerts.routing.byName(name))
				.toMatchObject({ name, expression, channels: [alertChannel.name] });

			await alerts.routing.edit(name);
			await alerts.routing.fill({ expression: edited });
			await alerts.routing.save();

			await expect
				.poll(async () => (await alerts.routing.byName(name))?.expression)
				.toBe(edited);

			await alerts.routing.remove(name);
			await expect.poll(() => alerts.routing.byName(name)).toBeUndefined();
		} finally {
			await alerts.routing.tryDelete(name);
		}
	});
});

test.describe('Routing policies as a viewer', () => {
	test.describe.configure({ timeout: 60_000 });

	test.use({ as: 'viewer' });

	test('TC-02 the create button is disabled with its reason', async ({
		alerts,
	}) => {
		await alerts.routing.goto();

		await expect(alerts.routing.newButton()).toBeDisabled();
		await expect(await alerts.routing.newButtonTooltip()).toHaveText(
			'You need edit permissions to create a routing policy',
		);
	});
});
