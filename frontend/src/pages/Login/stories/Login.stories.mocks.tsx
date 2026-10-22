/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import ROUTES from 'constants/routes';
import { rest } from 'msw';

import {
	choiceControl,
	countControl,
	toggleControl,
} from '@/storybook/controls/controls';
import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';

import {
	AUTHN_MECHANISMS,
	CALLBACK_ERROR_PARAMS,
	ORG_MAX,
	sessionsContextResponse,
	type AuthNMechanism,
} from './__story_mockdata__/login';

const WORKSPACE = 'Login · workspace';

export const loginMocks = defineStoryMocks({
	controls: {
		orgs: countControl('Organizations', {
			group: WORKSPACE,
			description:
				'Workspaces the email belongs to. More than one adds the organization select above the password.',
			value: 1,
			max: ORG_MAX,
		}),
		authN: choiceControl<AuthNMechanism>('Sign-in method', {
			group: WORKSPACE,
			description:
				'What the organization supports: a password field, or the button that hands off to its identity provider.',
			options: AUTHN_MECHANISMS,
			value: 'password',
		}),
		orgWarning: toggleControl('Organization warning', {
			group: WORKSPACE,
			description:
				'A warning the backend returns with the workspace, shown where a failed sign-in would be.',
			value: false,
		}),
		callbackError: toggleControl('Callback error', {
			group: WORKSPACE,
			description:
				'Land on the page the way the identity provider redirects back when the assertion fails.',
			value: false,
		}),
	},
	handlers: (values, response) => [
		rest.get(
			'http://localhost/api/v2/sessions/context',
			response.json(() =>
				sessionsContextResponse(values.orgs, values.authN, values.orgWarning),
			),
		),
	],
	config: (values) => ({
		route: values.callbackError
			? `${ROUTES.LOGIN}?${CALLBACK_ERROR_PARAMS}`
			: ROUTES.LOGIN,
		// The login page is what a signed-out browser lands on, so the shell has no
		// side nav, top nav or banners to draw.
		appContext: { isLoggedIn: false },
	}),
});
