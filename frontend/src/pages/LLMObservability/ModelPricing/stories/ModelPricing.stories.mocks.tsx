/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import ROUTES from 'constants/routes';
import { rest } from 'msw';

import { choiceControl, countControl } from '@/storybook/controls/controls';
import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';

import {
	PRICING_RULE_MAX,
	pricingRulesResponse,
	RULE_DELETES,
	RULE_SAVES,
	type RuleDelete,
	type RuleSave,
	UNPRICED_MODEL_MAX,
	unmappedModelsResponse,
} from './__story_mockdata__/modelPricing';

const RULES = 'Model pricing · rules';
const WRITES = 'Model pricing · writes';

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
		ruleSave: choiceControl<RuleSave>('Rule save', {
			group: WRITES,
			description:
				'How the PUT behind the cost drawer\'s Save and the unpriced tab\'s "Map model" answers. `success` raises the saved or "Mapped model" toast, `loading` never answers, `error` shows the failure in the drawer or raises the error toast.',
			options: RULE_SAVES,
			value: 'success',
		}),
		ruleDelete: choiceControl<RuleDelete>('Rule delete', {
			group: WRITES,
			description:
				"How the DELETE behind the row menu's Delete answers. `success` raises the deleted toast, `loading` never answers, `error` raises the error toast.",
			options: RULE_DELETES,
			value: 'success',
		}),
	},
	handlers: (values, response) => [
		rest.put('http://localhost/api/v1/llm_pricing_rules', (_req, res, ctx) => {
			if (values.ruleSave === 'loading') {
				return res(ctx.delay('infinite'));
			}

			return values.ruleSave === 'error'
				? res(
						ctx.status(500),
						ctx.json({
							status: 'error',
							error: { code: 'internal', message: 'Could not save the pricing rule' },
						}),
					)
				: res(ctx.status(204));
		}),
		rest.delete(
			'http://localhost/api/v1/llm_pricing_rules/:id',
			(_req, res, ctx) => {
				if (values.ruleDelete === 'loading') {
					return res(ctx.delay('infinite'));
				}

				return values.ruleDelete === 'error'
					? res(
							ctx.status(500),
							ctx.json({
								status: 'error',
								error: {
									code: 'internal',
									message: 'Could not delete the pricing rule',
								},
							}),
						)
					: res(ctx.status(204));
			},
		),
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
