/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { rest } from 'msw';

import { choiceControl, countControl } from '@/storybook/controls/controls';
import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';

import {
	allIntegrationsResponse,
	INSTALLATION_MIXES,
	INTEGRATION_CATALOGUE_SIZE,
	type InstallationMix,
} from './__story_mockdata__/integrations';

const LIST = 'Integrations · list';

export const integrationsMocks = defineStoryMocks({
	controls: {
		integrations: countControl('Integrations', {
			group: LIST,
			description:
				'Rows the list endpoint answers with. The page renders all of them; at 0 the All Integrations section keeps its heading and has no table under it.',
			value: INTEGRATION_CATALOGUE_SIZE,
			max: INTEGRATION_CATALOGUE_SIZE,
		}),
		installation: choiceControl<InstallationMix>('Installation', {
			group: LIST,
			description:
				'Which rows come back installed, which is what the Status column reads.',
			options: INSTALLATION_MIXES,
			value: 'mixed',
		}),
	},
	handlers: (values, response) => [
		rest.get(
			'http://localhost/api/v1/integrations',
			response.json(() =>
				allIntegrationsResponse(values.integrations, values.installation),
			),
		),
	],
});
