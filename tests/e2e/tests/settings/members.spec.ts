import { expect, test } from '../../drivers/settings';

test.describe('settings — members', () => {
	test('TC-01 an invite of two rows creates two pending members', async ({
		settings,
	}, testInfo) => {
		const stamp = `e2e-inv2-w${testInfo.workerIndex}-${Date.now()}`;
		const rows = [
			{ email: `${stamp}-a@signoz.test`, role: 'signoz-viewer' },
			{ email: `${stamp}-b@signoz.test`, role: 'signoz-editor' },
		];
		try {
			await settings.members.goto();
			await settings.members.openInvite();
			await settings.members.invite(rows);

			await settings.members.search(stamp);
			await expect(settings.members.row(stamp)).toHaveCount(2);
			for (const { email } of rows) {
				await expect(settings.members.row(email)).toContainText('INVITED');
			}
		} finally {
			for (const { email } of rows) {
				await settings.users.removeByEmail(email);
			}
		}
	});

	test('TC-02 a role change on a pending member persists', async ({
		settings,
		pendingMember,
	}) => {
		await settings.members.goto();
		await settings.members.openMember(pendingMember.email);
		await settings.members.setRoles(['signoz-editor']);
		await settings.members.saveMember();

		await settings.reload();
		await settings.members.openMember(pendingMember.email);
		await expect(settings.members.roleSelect()).toContainText('signoz-editor');
		await expect(settings.members.roleSelect()).not.toContainText(
			'signoz-viewer',
		);

		const member = await settings.users.byEmail(pendingMember.email);
		expect((member?.userRoles ?? []).map((entry) => entry.role.name)).toEqual([
			'signoz-editor',
		]);
	});

	test('TC-03 deleting an active member moves them to Deleted', async ({
		settings,
		activeEditor,
	}) => {
		const { email } = activeEditor.user;
		await settings.members.goto();
		await settings.members.openMember(email);
		await settings.members.deleteMember();
		await expect(settings.toast('Member deleted successfully')).toBeVisible();

		await settings.members.filter('Deleted');
		await settings.members.search(email);
		await expect(settings.members.row(email)).toContainText('DELETED');
	});
});
