/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { StatusCodes } from 'http-status-codes';
import ROUTES from 'constants/routes';
import { rest } from 'msw';
import type { QueryRangeRequestV5 } from 'types/api/v5/queryRange';

import { countControl } from '@/storybook/controls/controls';
import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';

import {
	LLM_ENVIRONMENTS,
	LLM_MODELS,
	LLM_SERVICES,
	llmPanelResponse,
} from './__story_mockdata__/llmOverview';

const PANELS = 'AI overview · panels';

/**
 * The dashboard itself is bundled with the app rather than fetched, so the only
 * thing left to answer is the panels, the variables and the share state its
 * header reads.
 */
export const llmOverviewMocks = defineStoryMocks({
	controls: {
		series: countControl('Breakdown series', {
			group: PANELS,
			description:
				'Lines or rows a broken-down panel carries: one per model, error type or span name. Zero is a workspace with no LLM spans yet.',
			value: 4,
			max: 5,
		}),
	},
	handlers: (values, response) => [
		rest.post(
			'http://localhost/api/v5/query_range',
			response.json(async (req) =>
				llmPanelResponse((await req.json()) as QueryRangeRequestV5, values.series),
			),
		),
		rest.post(
			'http://localhost/api/v2/variables/query',
			response.json(async (req) => {
				const body = (await req.json()) as { name?: string };
				const byName: Record<string, string[]> = {
					model: LLM_MODELS,
					environment: LLM_ENVIRONMENTS,
					service_name: LLM_SERVICES,
				};

				return {
					status: 'success',
					data: { variableValues: byName[body.name ?? ''] ?? LLM_MODELS },
				};
			}),
		),
		// The header reads the share state on every load, so it answers even while
		// the panels are held in the loading or failed state.
		rest.get('http://localhost/api/v1/dashboards/:id/public', (_req, res, ctx) =>
			res(
				ctx.status(StatusCodes.NOT_FOUND),
				ctx.json({
					status: 'error',
					error: {
						code: 'public_dashboard_not_found',
						message: "the AI observability overview isn't public",
						url: '',
						errors: [],
					},
				}),
			),
		),
	],
	config: () => ({ route: ROUTES.AI_OBSERVABILITY_OVERVIEW }),
});
