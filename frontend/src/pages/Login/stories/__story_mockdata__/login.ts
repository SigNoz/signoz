/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import type {
	OrgSessionContext,
	SessionsContext,
} from 'types/api/v2/sessions/context/get';

export const LOGIN_EMAIL = 'anna@signoz.io';

export const AUTHN_MECHANISMS = ['password', 'sso'] as const;

export type AuthNMechanism = (typeof AUTHN_MECHANISMS)[number];

const ORGS = [
	{ id: 'org-signoz', name: 'SigNoz' },
	{ id: 'org-acme', name: 'Acme Corp' },
	{ id: 'org-globex', name: 'Globex' },
];

export const ORG_MAX = ORGS.length;

const authNSupport = (
	mechanism: AuthNMechanism,
): OrgSessionContext['authNSupport'] =>
	mechanism === 'sso'
		? {
				password: [],
				callback: [
					{ provider: 'google', url: 'https://accounts.google.com/o/saml2/idp' },
				],
			}
		: { password: [{ provider: 'password' }], callback: [] };

/**
 * The org warning is what the backend attaches to a workspace the user can
 * still authenticate against but should not: the form renders it in the same
 * place as a failed sign-in.
 */
const orgWarning = {
	code: 'workspace_suspended',
	message:
		'This workspace is suspended. Contact your administrator to restore it.',
	url: 'https://signoz.io/docs/',
	errors: [],
};

export const sessionsContextResponse = (
	orgs: number,
	mechanism: AuthNMechanism,
	withWarning: boolean,
): { status: string; data: SessionsContext } => ({
	status: 'success',
	data: {
		exists: true,
		orgs: ORGS.slice(0, orgs).map((org) => ({
			...org,
			authNSupport: authNSupport(mechanism),
			...(withWarning ? { warning: orgWarning } : {}),
		})),
	},
});

/** What the callback provider redirects back with when the assertion fails. */
export const CALLBACK_ERROR_PARAMS = new URLSearchParams({
	callbackauthnerr: 'true',
	code: 'invalid_assertion',
	message: 'The identity provider rejected the assertion.',
	url: 'https://signoz.io/docs/userguide/sso-authentication/',
	errors: JSON.stringify([{ message: 'Signature could not be verified.' }]),
}).toString();
