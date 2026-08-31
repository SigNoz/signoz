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
	AUTHN_PROVIDERS,
	type AuthnProvider,
	authDomainsResponse,
	DOMAIN_MAX,
	myOrganizationResponse,
} from './__story_mockdata__/singleSignOn';

import { rolesListResponse } from '../__story_mockdata__/roles';

const DOMAINS = 'Single sign-on · domains';

export const singleSignOnMocks = defineStoryMocks({
	controls: {
		domains: countControl('Authenticated domains', {
			group: DOMAINS,
			value: 2,
			max: DOMAIN_MAX,
		}),
		provider: choiceControl<AuthnProvider>('Identity provider', {
			group: DOMAINS,
			description:
				'What each domain authenticates against. Google has no IdP-initiated URL, so that column reports N/A for it.',
			options: AUTHN_PROVIDERS,
			value: 'saml',
		}),
		enforced: toggleControl('Enforce SSO', {
			group: DOMAINS,
			description:
				'Whether members of the domain are made to sign in through the provider rather than with a password.',
			value: true,
		}),
	},
	handlers: (values, response) => [
		rest.get(
			'http://localhost/api/v2/auth_domains',
			response.json(() =>
				authDomainsResponse(values.domains, values.provider, values.enforced),
			),
		),

		rest.put(
			'http://localhost/api/v2/auth_domains/:id',
			response.json(() => ({ status: 'success', data: { id: 'auth-domain-0' } })),
		),

		rest.post(
			'http://localhost/api/v2/auth_domains',
			response.json(() => ({
				status: 'success',
				data: { id: 'auth-domain-new' },
			})),
		),

		rest.delete(
			'http://localhost/api/v2/auth_domains/:id',
			response.json(() => ({ status: 'success', data: null })),
		),

		// The provider form maps IdP groups onto SigNoz roles, so it reads the role
		// catalogue that the Roles tab owns.
		rest.get(
			'http://localhost/api/v1/roles',
			response.json(() => rolesListResponse(4)),
		),

		// The org name is the top half of the tab and the domain table the bottom;
		// a plain resolver keeps the name in place while the table loads or fails.
		rest.get('http://localhost/api/v2/orgs/me', (_req, res, ctx) =>
			res(ctx.status(200), ctx.json(myOrganizationResponse())),
		),

		rest.put('http://localhost/api/v2/orgs/me', (_req, res, ctx) =>
			res(ctx.status(200), ctx.json(myOrganizationResponse())),
		),
	],
	config: () => ({ route: ROUTES.ORG_SETTINGS }),
});
