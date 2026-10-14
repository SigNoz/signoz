/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import ROUTES from 'constants/routes';
import { rest } from 'msw';

import { countControl } from '@/storybook/controls/controls';
import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';

import {
	usageResponse,
	usageServicesResponse,
} from './__story_mockdata__/usage';

const SPANS = 'Usage · spans';

export const usageMocks = defineStoryMocks({
	controls: {
		spansPerBucket: countControl('Spans per bucket, in thousands', {
			group: SPANS,
			description:
				'What each bar carries, which the total above the chart is the sum of. Zero is a workspace sending nothing.',
			value: 240,
			max: 2000,
		}),
	},
	handlers: (values, response) => [
		rest.get(
			'http://localhost/api/v1/usage',
			response.json((req) =>
				usageResponse(
					Number(req.url.searchParams.get('start') ?? 0),
					Number(req.url.searchParams.get('end') ?? 0),
					Number(req.url.searchParams.get('step') ?? 3600),
					values.spansPerBucket * 1000,
				),
			),
		),
		rest.post(
			'http://localhost/api/v2/services',
			response.json(() => usageServicesResponse()),
		),
	],
	config: () => ({ route: ROUTES.USAGE_EXPLORER }),
});
