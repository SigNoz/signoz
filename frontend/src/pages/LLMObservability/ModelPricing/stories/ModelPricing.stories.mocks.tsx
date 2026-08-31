/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import ROUTES from 'constants/routes';
import { rest } from 'msw';

import { countControl } from '@/storybook/controls/controls';
import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';

import {
	PRICING_RULE_MAX,
	pricingRulesResponse,
	UNPRICED_MODEL_MAX,
	unmappedModelsResponse,
} from './__story_mockdata__/modelPricing';

const RULES = 'Model pricing · rules';

export const modelPricingMocks = defineStoryMocks({
	controls: {
		rules: countControl('Pricing rules', {
			group: RULES,
			description:
				'Rows the model costs table has. Every fourth is a user override, which is what the source filter splits on.',
			value: 10,
			max: PRICING_RULE_MAX,
		}),
		unpricedModels: countControl('Unpriced models', {
			group: RULES,
			description:
				'Models seen in traces that no rule matches: the count on the tab badge, and the rows behind it.',
			value: 3,
			max: UNPRICED_MODEL_MAX,
		}),
	},
	handlers: (values, response) => [
		rest.get(
			'http://localhost/api/v1/llm_pricing_rules/unmapped_models',
			response.json(() => unmappedModelsResponse(values.unpricedModels)),
		),
		rest.get(
			'http://localhost/api/v1/llm_pricing_rules',
			response.json((req) => {
				const isOverride = req.url.searchParams.get('isOverride');

				return pricingRulesResponse(values.rules, {
					offset: Number(req.url.searchParams.get('offset') ?? 0),
					limit: Number(req.url.searchParams.get('limit') ?? 20),
					overridesOnly: isOverride === 'true',
				});
			}),
		),
	],
	config: () => ({ route: ROUTES.AI_OBSERVABILITY_CONFIGURATION }),
});
