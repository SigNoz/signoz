import { expect, GET_STARTED_PATH, test } from '../../drivers/onboarding';

test.describe('get started wizard', () => {
	// The wizard renders every source logo on load, which is slow on a shared stack.
	test.describe.configure({ timeout: 60_000 });

	test('TC-05 a searched source walks to its docs and Continue opens its module', async ({
		onboarding,
	}) => {
		const { wizard } = onboarding;
		await onboarding.visit(GET_STARTED_PATH);

		await wizard.search('python');
		await expect(wizard.source('Syslogs')).toHaveCount(0);
		await wizard.source('Python').click();
		await wizard.option('VM').click();
		await wizard.configure().click();

		await expect(wizard.docsFrame()).toHaveAttribute(
			'src',
			/\/docs\/instrumentation\/opentelemetry-python\/\?.*source=onboarding.*environment=vm/,
		);
		await wizard.continue().click();
		await onboarding.expectPath('/services');
	});

	test('TC-08 a search with no match offers to raise a request', async ({
		onboarding,
	}) => {
		const { wizard } = onboarding;
		await onboarding.visit(GET_STARTED_PATH);

		await wizard.search('zzzz');
		await expect(wizard.noResults()).toHaveText('No results for zzzz :/');
	});

	test('TC-09 the invite modal sends an invite and closes', async ({
		onboarding,
	}) => {
		const { wizard } = onboarding;
		const email = `e2e-onboarding-modal-${Date.now()}@signoz.test`;
		await onboarding.visit(GET_STARTED_PATH);

		try {
			await wizard.inviteButton().click();
			await expect(wizard.inviteModal()).toBeVisible();
			await wizard.invite([{ email, role: 'signoz-viewer' }]);

			await expect(onboarding.toast('Invites sent successfully')).toBeVisible();
			await expect(wizard.inviteModal()).toBeHidden();
			expect(await onboarding.users.byEmail(email)).toBeDefined();
		} finally {
			await onboarding.users.remove(email);
		}
	});
});
