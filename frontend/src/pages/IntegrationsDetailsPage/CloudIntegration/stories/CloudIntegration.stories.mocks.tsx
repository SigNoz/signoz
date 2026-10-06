/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { rest } from 'msw';
import type { CloudintegrationtypesUpdatableServiceDTO } from 'api/generated/services/sigNoz.schemas';

import { choiceControl, countControl } from '@/storybook/controls/controls';
import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';
import type { MockResolver } from '@/storybook/msw/types';

import {
	ACCOUNT_CAP,
	accountResponse,
	accountsResponse,
	CLOUD_PROVIDERS,
	CLOUD_SERVICE_CAP,
	type CloudProvider,
	createdAccountResponse,
	BUILT_IN_INTEGRATION_NOT_FOUND,
	credentialsResponse,
	seedServiceSignals,
	serviceResponse,
	servicesMetadataResponse,
	setServiceSignals,
} from './__story_mockdata__/cloudIntegration';

/**
 * Answered whatever the Data control says, because it is not the page's data:
 * the request goes out and its failure is discarded either way.
 */
const builtInIntegrationNotFound: MockResolver = (_req, res, ctx) =>
	res(ctx.status(404), ctx.json(BUILT_IN_INTEGRATION_NOT_FOUND));

const PROVIDER = 'Cloud integration · provider';
const SERVICES = 'Cloud integration · services';

export const cloudIntegrationMocks = defineStoryMocks({
	controls: {
		provider: choiceControl<CloudProvider>('Provider', {
			group: PROVIDER,
			description:
				'The last segment of the pathname, so it decides which provider the page is for: its logo and copy, which setup flow Add New Account opens, and the account configuration the settings drawer edits.',
			options: CLOUD_PROVIDERS,
			value: 'aws',
		}),
		accounts: countControl('Connected accounts', {
			group: PROVIDER,
			description:
				'At 0 the hero offers Integrate Now and the service list is read-only: the page falls back to the provider catalogue and the collection switches are disabled.',
			value: 1,
			max: ACCOUNT_CAP,
		}),
		services: countControl('Services', {
			group: SERVICES,
			description:
				'Services the provider answers with. GCP ships six, so anything past that shows the same list.',
			value: 8,
			max: CLOUD_SERVICE_CAP,
		}),
		enabledServices: countControl('Enabled', {
			group: SERVICES,
			description:
				'How many of them have a signal switched on, taken from the top of the list. At 0 the sidebar says so and every service sits under Not Enabled.',
			value: 3,
			max: CLOUD_SERVICE_CAP,
		}),
	},
	handlers: (values, response) => [
		rest.get(
			'http://localhost/api/v1/integrations/:integrationId',
			builtInIntegrationNotFound,
		),

		rest.put(
			'http://localhost/api/v1/cloud_integrations/:cloudProvider/accounts/:id/services/:serviceId',
			response.json(async (req) => {
				const body = (await req.json()) as CloudintegrationtypesUpdatableServiceDTO;

				setServiceSignals(String(req.params.serviceId), body.config ?? {});

				return { status: 'success', data: null };
			}),
		),

		rest.get(
			'http://localhost/api/v1/cloud_integrations/:cloudProvider/accounts/:id/services/:serviceId',
			response.json((req) =>
				serviceResponse(values.provider, String(req.params.serviceId), true),
			),
		),

		rest.get(
			'http://localhost/api/v1/cloud_integrations/:cloudProvider/accounts/:id/services',
			response.json(() =>
				servicesMetadataResponse(values.provider, values.services, true),
			),
		),

		rest.get(
			'http://localhost/api/v1/cloud_integrations/:cloudProvider/services/:serviceId',
			response.json((req) =>
				serviceResponse(values.provider, String(req.params.serviceId), false),
			),
		),

		rest.get(
			'http://localhost/api/v1/cloud_integrations/:cloudProvider/services',
			response.json(() =>
				servicesMetadataResponse(values.provider, values.services, false),
			),
		),

		rest.get(
			'http://localhost/api/v1/cloud_integrations/:cloudProvider/credentials',
			response.json(() => credentialsResponse()),
		),

		rest.post(
			'http://localhost/api/v1/cloud_integrations/:cloudProvider/accounts',
			response.json(() => createdAccountResponse(values.provider)),
		),

		rest.put(
			'http://localhost/api/v1/cloud_integrations/:cloudProvider/accounts/:id',
			response.json((req) =>
				accountResponse(values.provider, String(req.params.id)),
			),
		),

		rest.get(
			'http://localhost/api/v1/cloud_integrations/:cloudProvider/accounts/:id',
			response.json((req) =>
				accountResponse(values.provider, String(req.params.id)),
			),
		),

		rest.get(
			'http://localhost/api/v1/cloud_integrations/:cloudProvider/accounts',
			response.json(() => accountsResponse(values.provider, values.accounts)),
		),
	],
	config: (values) => ({
		route: `/integrations/${values.provider}`,
	}),
	effect: (values) => {
		seedServiceSignals(values.provider, values.services, values.enabledServices);
	},
});
