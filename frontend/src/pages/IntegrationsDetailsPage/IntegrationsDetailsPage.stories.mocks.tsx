/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { rest } from 'msw';
import type { InstallIntegrationKeyProps } from 'types/api/integrations/types';

import { choiceControl } from '@/storybook/controls/controls';
import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';
import {
	type IntegrationId,
	INTEGRATION_IDS,
} from '@/pages/IntegrationsModulePage/__story_mockdata__/integrations';

import {
	CONNECTION_STATES,
	type ConnectionState,
	installedResponse,
	integrationResponse,
	integrationStatusResponse,
	setInstallState,
	uninstalledResponse,
} from './__story_mockdata__/integrationDetail';

const INTEGRATION = 'Integration details · integration';
const CONNECTION = 'Integration details · connection';

export const integrationDetailMocks = defineStoryMocks({
	controls: {
		integration: choiceControl<IntegrationId>('Integration', {
			group: INTEGRATION,
			description:
				'Which integration the page is opened on. It is the last segment of the pathname, so it decides the title, the categories, the configuration steps and which of the two Data Collected tables has rows.',
			options: INTEGRATION_IDS,
			value: 'redis',
		}),
		connection: choiceControl<ConnectionState>('Connection', {
			group: CONNECTION,
			description:
				'`connected` has both signals arriving; `listening` is installed with nothing received yet; `stale` last received eleven days ago; `not-installed` has no installation, which is the only state without the removal bar.',
			options: CONNECTION_STATES,
			value: 'connected',
		}),
	},
	handlers: (_values, response) => [
		rest.post(
			'http://localhost/api/v1/integrations/install',
			response.json(async (req) => {
				const body = (await req.json()) as InstallIntegrationKeyProps;

				setInstallState('listening');

				return installedResponse(body.integration_id);
			}),
		),

		rest.post(
			'http://localhost/api/v1/integrations/uninstall',
			response.json(() => {
				setInstallState('not-installed');

				return uninstalledResponse();
			}),
		),

		rest.get(
			'http://localhost/api/v1/integrations/:integrationId/connection_status',
			response.json((req) =>
				integrationStatusResponse(String(req.params.integrationId)),
			),
		),

		rest.get(
			'http://localhost/api/v1/integrations/:integrationId',
			response.json((req) =>
				integrationResponse(String(req.params.integrationId)),
			),
		),
	],
	config: (values) => ({
		route: `/integrations/${values.integration}`,
	}),
	effect: (values) => {
		setInstallState(values.connection);
	},
});
