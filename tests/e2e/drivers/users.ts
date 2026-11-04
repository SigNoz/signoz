import type { Page } from '@playwright/test';

import type {
	AuthtypesPostableUserDTO,
	AuthtypesRoleDTO,
	AuthtypesUserWithRolesDTO,
	TypesResetPasswordTokenDTO,
	TypesUserDTO,
} from './schemas';
import { apiDriver, type Envelope } from './api';
import type { User } from './auth';

/**
 * Users and roles over HTTP: the only place user API calls live.
 *
 * There is no invite endpoint that yields a password, so an active user is
 * created in three steps, mirroring `create_active_user` in
 * `tests/fixtures/auth.py`: create a pending user, mint a reset token, and
 * redeem it with a password. Deleting a user revokes their sessions.
 */

export type ManagedRole = 'signoz-admin' | 'signoz-editor' | 'signoz-viewer';

/** Password for every user the suite creates. Meets the backend policy. */
export const E2E_PASSWORD = 'password123Z$';

export interface CreatedUser {
	id: string;
	user: User;
}

export interface UsersApi {
	roleId(name: string): Promise<string>;
	roles(): Promise<AuthtypesRoleDTO[]>;
	/** A pending (invited) user. Returns its id. */
	create(input: {
		email: string;
		displayName?: string;
		role: string;
	}): Promise<string>;
	resetToken(id: string): Promise<string>;
	activate(id: string, password?: string): Promise<void>;
	/** Pending user plus activation, named `e2e-<label>@signoz.test`. */
	createActive(role: string, label: string): Promise<CreatedUser>;
	remove(id: string): Promise<void>;
	/** Best-effort teardown for a user the UI created, whose id the test never saw. */
	removeByEmail(email: string): Promise<void>;
	byEmail(email: string): Promise<AuthtypesUserWithRolesDTO | undefined>;
	me(): Promise<AuthtypesUserWithRolesDTO>;
	/** Write a preference for the user this page is authenticated as. */
	setPreference(name: string, value: unknown): Promise<void>;
}

export function usersApi(page: Page): UsersApi {
	const api = apiDriver(page);

	const users: UsersApi = {
		roles: async () =>
			(await api.get<Envelope<AuthtypesRoleDTO[]>>('/api/v1/roles')).data,

		roleId: async (name) => {
			const role = (await users.roles()).find((entry) => entry.name === name);
			if (!role) {
				throw new Error(`role ${name} not found in GET /api/v1/roles`);
			}
			return role.id;
		},

		create: async ({ email, displayName = '', role }) => {
			const body: AuthtypesPostableUserDTO = {
				email,
				displayName,
				userRoles: [{ id: await users.roleId(role) }],
			};
			return api.create('/api/v2/users', body);
		},

		resetToken: async (id) => {
			const body = await api.put<Envelope<TypesResetPasswordTokenDTO>>(
				`/api/v2/users/${id}/reset_password_tokens`,
				{},
			);
			if (!body.data.token) {
				throw new Error(`reset token for user ${id} came back empty`);
			}
			return body.data.token;
		},

		activate: async (id, password = E2E_PASSWORD) => {
			const token = await users.resetToken(id);
			await api.post('/api/v2/factor_password/reset', { password, token });
		},

		createActive: async (role, label) => {
			const email = `e2e-${label}@signoz.test`;
			const id = await users.create({ email, displayName: `e2e ${label}`, role });
			await users.activate(id);
			return { id, user: { email, password: E2E_PASSWORD } };
		},

		remove: (id) => api.tryDel(`/api/v2/users/${id}`),

		removeByEmail: async (email) => {
			const match = await users.byEmail(email);
			if (match) {
				await users.remove(match.id);
			}
		},

		byEmail: async (email) => {
			const list = await api.get<Envelope<TypesUserDTO[]>>('/api/v2/users');
			const match = list.data.find((entry) => entry.email === email);
			if (!match) {
				return undefined;
			}
			return (
				await api.get<Envelope<AuthtypesUserWithRolesDTO>>(
					`/api/v2/users/${match.id}`,
				)
			).data;
		},

		me: async () =>
			(await api.get<Envelope<AuthtypesUserWithRolesDTO>>('/api/v2/users/me'))
				.data,

		setPreference: async (name, value) => {
			await api.put(`/api/v1/user/preferences/${name}`, { value });
		},
	};

	return users;
}
