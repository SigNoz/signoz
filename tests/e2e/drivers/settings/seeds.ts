import type { Browser, TestType } from '@playwright/test';

import type { User } from '../auth';
import type { AuthtypesTransactionGroupDTO } from '../schemas';
import { onAdminPage, type Layer } from '../kit';
import { usersApi, type CreatedUser } from '../users';

import { grantAll, roleName, settingsDriver, type Settings } from './driver';

/**
 * Test-scoped seeds. Each test that asks for one gets its own copy, created on
 * an admin page and deleted after the test: every spec here mutates what it
 * seeds (roles, keys, deletion), so a worker-shared copy would make the tests
 * order-dependent.
 */

type Fixtures = Record<string, unknown>;

function perTest<Name extends string, T>(
	name: Name,
	open: (ctx: {
		browser: Browser;
		stamp: string;
		workerIndex: number;
	}) => Promise<T>,
	close: (ctx: { browser: Browser; value: T }) => Promise<void>,
): Layer<{ [K in Name]: T }> {
	const fixture = {
		[name]: async (
			{ browser }: { browser: Browser },
			use: (value: T) => Promise<void>,
			testInfo: { workerIndex: number },
		) => {
			const stamp = `w${testInfo.workerIndex}-${Date.now()}`;
			const value = await open({
				browser,
				stamp,
				workerIndex: testInfo.workerIndex,
			});
			await use(value);
			await close({ browser, value });
		},
	};
	return ((test: TestType<Fixtures, Fixtures>) =>
		test.extend(fixture as never)) as Layer<{ [K in Name]: T }>;
}

export interface ServiceAccountSeed {
	id: string;
	name: string;
}

/** A service account holding `signoz-viewer`. */
export const withServiceAccountSeed = perTest(
	'serviceAccount',
	({ browser, stamp }): Promise<ServiceAccountSeed> =>
		onAdminPage(browser, async (page) => {
			const name = `e2e-sa-${stamp}`;
			const id = await settingsDriver(page).serviceAccounts.createApi(
				name,
				'signoz-viewer',
			);
			return { id, name };
		}),
	({ browser, value }) =>
		onAdminPage(browser, (page) =>
			settingsDriver(page).serviceAccounts.removeApi(value.id),
		),
);

export interface CustomRoleSeed {
	id: string;
	name: string;
	description: string;
}

/** A custom role granting dashboard read and list. */
export const withCustomRoleSeed = perTest(
	'customRole',
	({ browser, workerIndex }): Promise<CustomRoleSeed> =>
		onAdminPage(browser, async (page) => {
			const name = roleName('seed', workerIndex);
			const description = 'e2e seeded role';
			const id = await settingsDriver(page).roles.createApi({
				name,
				description,
				transactionGroups: [
					grantAll('read', 'dashboard'),
					grantAll('list', 'dashboard'),
				],
			});
			return { id, name, description };
		}),
	({ browser, value }) =>
		onAdminPage(browser, (page) =>
			settingsDriver(page).roles.removeApi(value.id),
		),
);

export interface PendingMemberSeed {
	id: string;
	email: string;
}

/** An invited, never-activated `signoz-viewer`. */
export const withPendingMember = perTest(
	'pendingMember',
	({ browser, stamp }): Promise<PendingMemberSeed> =>
		onAdminPage(browser, async (page) => {
			const email = `e2e-pending-${stamp}@signoz.test`;
			const id = await usersApi(page).create({ email, role: 'signoz-viewer' });
			return { id, email };
		}),
	({ browser, value }) =>
		onAdminPage(browser, (page) => usersApi(page).remove(value.id)),
);

/** An active `signoz-editor`, for flows that delete a member. */
export const withActiveEditor = perTest(
	'activeEditor',
	({ browser, stamp }): Promise<CreatedUser> =>
		onAdminPage(browser, (page) =>
			usersApi(page).createActive('signoz-editor', `editor-${stamp}`),
		),
	({ browser, value }) =>
		onAdminPage(browser, (page) => usersApi(page).remove(value.id)),
);

export interface GrantedUser {
	user: User;
	role: string;
	remove(): Promise<void>;
}

/**
 * An active member whose only role is a fresh custom role holding
 * `transactionGroups`. Call `remove` in a `finally`.
 */
export async function createGrantedUser(
	settings: Settings,
	workerIndex: number,
	kind: string,
	transactionGroups: AuthtypesTransactionGroupDTO[],
): Promise<GrantedUser> {
	const name = roleName(kind, workerIndex);
	const roleId = await settings.roles.createApi({ name, transactionGroups });
	const label = `${kind}-w${workerIndex}-${Date.now()}`;
	let member: CreatedUser;
	try {
		member = await settings.users.createActive(name, label);
	} catch (error) {
		await settings.users.removeByEmail(`e2e-${label}@signoz.test`);
		await settings.roles.removeApi(roleId);
		throw error;
	}
	return {
		user: member.user,
		role: name,
		remove: async () => {
			await settings.users.remove(member.id);
			await settings.roles.removeApi(roleId);
		},
	};
}
