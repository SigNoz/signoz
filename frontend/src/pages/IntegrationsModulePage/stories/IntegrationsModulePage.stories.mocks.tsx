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
	REQUEST_SUBMISSIONS,
	type InstallationMix,
	type RequestSubmission,
} from './__story_mockdata__/integrations';

const LIST = 'Integrations · list';
const REQUEST = 'Integrations · request';

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
		requestSubmission: choiceControl<RequestSubmission>('Request submission', {
			group: REQUEST,
			description:
				'How the event behind the Request Integration form answers. `success` raises the "Integration Request Submitted" toast, `loading` never answers and leaves the button spinning, `error` raises the failure toast.',
			options: REQUEST_SUBMISSIONS,
			value: 'success',
		}),
	},
	handlers: (values, response) => [
		rest.get(
			'http://localhost/api/v1/integrations',
			response.json(() =>
				allIntegrationsResponse(values.integrations, values.installation),
			),
		),

		rest.post('http://localhost/api/v1/event', (_req, res, ctx) => {
			if (values.requestSubmission === 'loading') {
				return res(ctx.delay('infinite'));
			}

			return values.requestSubmission === 'error'
				? res(
						ctx.status(500),
						ctx.json({ status: 'error', error: 'Event rejected' }),
					)
				: res(
						ctx.status(200),
						ctx.json({ status: 'success', data: 'Event Processed Successfully' }),
					);
		}),
	],
});
