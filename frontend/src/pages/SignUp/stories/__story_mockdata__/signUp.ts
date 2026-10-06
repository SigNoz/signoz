/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import type { ErrorV2Resp } from 'types/api';
import type { SignupResponse } from 'types/api/v1/register/post';
import type { ROLES } from 'types/roles';

export const SIGNUP_EMAIL = 'anna@signoz.io';

export const SIGNUP_PASSWORD = 'correct-horse-battery';

export const REGISTRATIONS = ['accepted', 'rejected'] as const;

export type Registration = (typeof REGISTRATIONS)[number];

export const registerResponse = (): {
	status: string;
	data: SignupResponse;
} => ({
	status: 'success',
	data: {
		id: 'user-anna',
		orgId: 'org-signoz',
		email: SIGNUP_EMAIL,
		displayName: 'Anna',
		role: 'ADMIN' as ROLES,
		createdAt: 0,
	},
});

/** What the backend rejects a first account with once setup has already run. */
export const registerRejectedResponse = (): ErrorV2Resp => ({
	error: {
		code: 'already_exists',
		message: 'This workspace already has an admin. Ask them for an invite link.',
		url: 'https://signoz.io/docs/userguide/manage-users/',
		errors: [],
	},
});
