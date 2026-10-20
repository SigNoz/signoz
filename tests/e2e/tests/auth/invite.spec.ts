import { E2E_PASSWORD, expect, test } from '../../drivers/auth-flows';

// The admin half runs on the kit's admin page through `settings`; the invitee
// half runs on a guest context through `authFlows`.

test.describe('auth — invite', () => {
	test('TC-01 an invited viewer sets a password, signs in, sees the viewer UI and cannot reuse the link', async ({
		settings,
		authFlows,
	}, testInfo) => {
		const email = `e2e-invite-w${testInfo.workerIndex}-${Date.now()}@signoz.test`;
		try {
			await settings.members.goto();
			await settings.members.openInvite();
			await settings.members.invite([{ email, role: 'signoz-viewer' }]);

			await settings.members.search(email);
			await expect(settings.members.row(email)).toContainText('INVITED');

			await settings.members.openMember(email);
			const link = await settings.members.generateLink();
			expect(link).toMatch(/\/password-reset\?token=/);

			await authFlows.goto(link);
			await authFlows.setNewPassword(E2E_PASSWORD);

			await authFlows.login({ email, password: E2E_PASSWORD });
			await authFlows.openUserMenu();
			await expect(authFlows.loggedInAs()).toContainText(email);

			await authFlows.goto('/dashboard');
			await expect(authFlows.newDashboardButton()).toHaveAttribute(
				'data-denied-permissions',
				/.+/,
			);

			await settings.members.goto();
			await settings.members.search(email);
			await expect(settings.members.row(email)).toContainText('ACTIVE');

			// The link is single use. A signed-in visitor is bounced off
			// /password-reset, so sign the invitee out first.
			await authFlows.signOut();
			await authFlows.goto(link);
			await expect(authFlows.tokenError()).toBeVisible();
		} finally {
			await settings.users.removeByEmail(email);
		}
	});
});
