import {
	createGrantedUser,
	expect,
	grantAll,
	test,
} from '../../drivers/settings';

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

	test('TC-04 a user without create:user cannot invite members', async ({
		settings,
		authFlows,
		guestSettings,
	}, testInfo) => {
		const member = await createGrantedUser(
			settings,
			testInfo.workerIndex,
			'list-users',
			[grantAll('list', 'user', 'user')],
		);
		try {
			await authFlows.login(member.user);
			await guestSettings.members.goto();

			await expect(guestSettings.members.inviteButton()).toHaveAttribute(
				'data-denied-permissions',
				/create/,
			);
		} finally {
			await member.remove();
		}
	});

	test('TC-05 a user without list:user cannot list members', async ({
		settings,
		authFlows,
		guestSettings,
	}, testInfo) => {
		const member = await createGrantedUser(
			settings,
			testInfo.workerIndex,
			'no-list',
			[grantAll('read', 'dashboard')],
		);
		try {
			await authFlows.login(member.user);
			await guestSettings.members.goto();

			await expect(guestSettings.members.deniedMessage()).toBeVisible();
			await expect(guestSettings.members.searchInput()).toHaveAttribute(
				'data-denied-permissions',
				/list/,
			);
		} finally {
			await member.remove();
		}
	});

	test('TC-06 an invite link is unavailable without factor-password:list', async ({
		settings,
		authFlows,
		guestSettings,
		pendingMember,
	}, testInfo) => {
		const member = await createGrantedUser(
			settings,
			testInfo.workerIndex,
			'no-pwd',
			[grantAll('list', 'user', 'user'), grantAll('read', 'user', 'user')],
		);
		try {
			await authFlows.login(member.user);
			await guestSettings.members.goto();
			await guestSettings.members.openMember(pendingMember.email);

			await expect(guestSettings.members.resetLinkButton()).toHaveAttribute(
				'data-denied-permissions',
				/factor-password/,
			);
			await expect(guestSettings.members.resetLinkButton()).toContainText(
				'Invite Link Unavailable',
			);
		} finally {
			await member.remove();
		}
	});

	test('TC-07 a member can add and remove a role on themselves', async ({
		settings,
		authFlows,
		guestSettings,
	}, testInfo) => {
		const member = await createGrantedUser(
			settings,
			testInfo.workerIndex,
			'self-edit',
			[
				grantAll('list', 'user', 'user'),
				grantAll('read', 'user', 'user'),
				grantAll('attach', 'user', 'user'),
				grantAll('detach', 'user', 'user'),
				grantAll('list', 'role', 'role'),
				grantAll('read', 'role', 'role'),
				grantAll('attach', 'role', 'role'),
				grantAll('detach', 'role', 'role'),
			],
		);
		try {
			await authFlows.login(member.user);
			await guestSettings.members.goto();
			await guestSettings.members.openMember(member.user.email);
			await guestSettings.members.addRole('signoz-viewer');
			await guestSettings.members.saveMember();

			await guestSettings.reload();
			await guestSettings.members.openMember(member.user.email);
			await expect(guestSettings.members.roleSelect()).toContainText(
				'signoz-viewer',
			);

			const added = await settings.users.byEmail(member.user.email);
			expect(
				(added?.userRoles ?? []).map((entry) => entry.role.name).sort(),
			).toEqual([member.role, 'signoz-viewer'].sort());

			await guestSettings.members.removeRole('signoz-viewer');
			await guestSettings.members.saveMember();

			await guestSettings.reload();
			await guestSettings.members.openMember(member.user.email);
			await expect(guestSettings.members.roleSelect()).not.toContainText(
				'signoz-viewer',
			);
			const removed = await settings.users.byEmail(member.user.email);
			expect((removed?.userRoles ?? []).map((entry) => entry.role.name)).toEqual([
				member.role,
			]);
		} finally {
			await member.remove();
		}
	});

	test('TC-08 a user without update:user cannot rename another member', async ({
		settings,
		authFlows,
		guestSettings,
		activeEditor,
	}, testInfo) => {
		const member = await createGrantedUser(
			settings,
			testInfo.workerIndex,
			'no-update',
			[grantAll('list', 'user', 'user'), grantAll('read', 'user', 'user')],
		);
		try {
			await authFlows.login(member.user);
			await guestSettings.members.goto();
			await guestSettings.members.openMember(activeEditor.user.email);

			await expect(guestSettings.members.nameInput()).toHaveAttribute(
				'data-denied-permissions',
				/update/,
			);
		} finally {
			await member.remove();
		}
	});
});
