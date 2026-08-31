/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import type { ForgotPasswordRouteState } from 'container/ForgotPassword';
import type { OrgSessionContext } from 'types/api/v2/sessions/context/get';

export const FORGOT_PASSWORD_EMAIL = 'anna@signoz.io';

const ORGS: OrgSessionContext[] = [
	{ id: 'org-signoz', name: 'SigNoz' },
	{ id: 'org-acme', name: 'Acme Corp' },
	{ id: 'org-globex', name: 'Globex' },
].map((org) => ({
	...org,
	authNSupport: { password: [{ provider: 'password' }], callback: [] },
}));

export const ORG_MAX = ORGS.length;

/**
 * The page is reached by a push from the login form rather than by its URL, so
 * the email and the workspaces it resolved to arrive as `location.state`. With
 * none the page bounces straight back to login.
 */
export const forgotPasswordRouteState = (
	orgs: number,
): ForgotPasswordRouteState => ({
	email: FORGOT_PASSWORD_EMAIL,
	orgId: orgs === 1 ? ORGS[0].id : undefined,
	orgs: ORGS.slice(0, orgs),
});
