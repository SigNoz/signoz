/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

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
	llmSystemDashboardResponse,
} from './__story_mockdata__/llmOverview';

const PANELS = 'AI overview · panels';

/** The system dashboard definition, its panels and its variables. */
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
		rest.get(
			'http://localhost/api/v2/dashboards/system/ai-o11y-overview',
			response.json(() => llmSystemDashboardResponse()),
		),
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
	],
	config: () => ({ route: ROUTES.AI_OBSERVABILITY_OVERVIEW }),
});
