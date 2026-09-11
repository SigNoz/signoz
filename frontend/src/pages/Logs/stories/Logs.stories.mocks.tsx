/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import ROUTES from 'constants/routes';
import { rest } from 'msw';

import { countControl } from '@/storybook/controls/controls';
import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';

import {
	logFieldsResponse,
	logsAggregateResponse,
	logsResponse,
} from './__story_mockdata__/logs';

const LIST = 'Legacy logs · list';

export const oldLogsMocks = defineStoryMocks({
	controls: {
		logs: countControl('Log lines', {
			group: LIST,
			description:
				'Lines the list has. The page asks for 200 at a time, which is the whole page.',
			value: 60,
			max: 200,
		}),
	},
	handlers: (values, response) => [
		rest.get(
			'http://localhost/api/v1/logs/fields',
			response.json(() => logFieldsResponse()),
		),
		// Both list endpoints answer under their own key rather than at the top
		// level: `results` for the lines, `items` for the histogram.
		rest.get(
			'http://localhost/api/v1/logs/aggregate',
			response.json((req) => ({
				items: logsAggregateResponse(
					Number(req.url.searchParams.get('timestampStart') ?? 0),
					Number(req.url.searchParams.get('timestampEnd') ?? 0),
					Number(req.url.searchParams.get('step') ?? 60),
					Math.max(Math.round(values.logs / 6), 1),
				),
			})),
		),
		rest.get(
			'http://localhost/api/v1/logs',
			response.json((req) => ({
				results: logsResponse(
					values.logs,
					Number(req.url.searchParams.get('limit') ?? 200),
				),
			})),
		),
	],
	config: () => ({ route: ROUTES.OLD_LOGS_EXPLORER }),
});
