/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import ROUTES from 'constants/routes';
import { rest } from 'msw';

import { choiceControl, countControl } from '@/storybook/controls/controls';
import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';
import {
	attributeKeysResponse,
	attributeValuesResponse,
} from '@/storybook/msw/__story_mockdata__/attributes';

import {
	FUNNEL_ID,
	FUNNEL_STEP_MAX,
	funnelErrorTracesResponse,
	funnelOverviewResponse,
	funnelResponse,
	funnelSlowTracesResponse,
	funnelStepsOverviewResponse,
	funnelStepsResponse,
	funnelValidateResponse,
} from './__story_mockdata__/tracesFunnelDetails';

const FUNNEL = 'Funnel · shape';
const TRACES = 'Funnel · traces';

const DROP_OFF = ['none', 'mild', 'severe'] as const;

type DropOff = (typeof DROP_OFF)[number];

/** Share of the previous step's spans that reach the next one. */
const CONVERSION: Record<DropOff, number> = {
	none: 1,
	mild: 0.86,
	severe: 0.42,
};

const ENTERED = 24_000;

const STEP_FILTER_KEYS = [
	'service.name',
	'name',
	'http.status_code',
	'deployment.environment',
	'hasError',
];

const STEP_FILTER_VALUES: Record<string, string[]> = {
	'service.name': ['frontend', 'checkout', 'payment', 'shipping'],
	name: ['POST /api/checkout', 'payment.authorize', 'shipping.quote'],
	'http.status_code': ['200', '400', '500'],
	'deployment.environment': ['production', 'staging'],
	hasError: ['true', 'false'],
};

export const tracesFunnelDetailsMocks = defineStoryMocks({
	controls: {
		steps: countControl('Steps', {
			group: FUNNEL,
			description:
				'Stages the funnel is built from, which is what the configuration list and the graph draw.',
			value: 4,
			max: FUNNEL_STEP_MAX,
		}),
		dropOff: choiceControl<DropOff>('Drop-off', {
			group: FUNNEL,
			description:
				'How much of the traffic is lost between steps, which the conversion rate and the graph follow.',
			options: DROP_OFF,
			value: 'mild',
		}),
		traces: countControl('Trace rows', {
			group: TRACES,
			description:
				'Rows the slowest-traces and errored-traces tables under the graph carry.',
			value: 5,
			max: 10,
		}),
	},
	handlers: (values, response) => {
		const conversion = CONVERSION[values.dropOff];

		return [
			rest.get(
				`http://localhost/api/v1/trace-funnels/${FUNNEL_ID}`,
				response.json(() => funnelResponse(values.steps)),
			),
			rest.post(
				'http://localhost/api/v1/trace-funnels/analytics/validate',
				response.json(() => funnelValidateResponse(values.traces)),
			),
			rest.post(
				'http://localhost/api/v1/trace-funnels/analytics/steps',
				response.json(() => funnelStepsResponse(values.steps, ENTERED, conversion)),
			),
			rest.post(
				'http://localhost/api/v1/trace-funnels/analytics/steps/overview',
				response.json(() => funnelStepsOverviewResponse(conversion)),
			),
			rest.post(
				'http://localhost/api/v1/trace-funnels/analytics/overview',
				response.json(() =>
					funnelOverviewResponse(ENTERED, conversion, values.steps),
				),
			),
			rest.post(
				'http://localhost/api/v1/trace-funnels/analytics/slow-traces',
				response.json(() => funnelSlowTracesResponse(values.traces)),
			),
			rest.post(
				'http://localhost/api/v1/trace-funnels/analytics/error-traces',
				response.json(() => funnelErrorTracesResponse(values.traces)),
			),
			// The `Where` box on every step is the trace query builder, which reads
			// its suggestions as soon as the step renders.
			rest.get(
				'http://localhost/api/v3/autocomplete/attribute_keys',
				response.json(() => attributeKeysResponse(STEP_FILTER_KEYS)),
			),
			rest.get(
				'http://localhost/api/v3/autocomplete/attribute_values',
				response.json((req) =>
					attributeValuesResponse(
						STEP_FILTER_VALUES[req.url.searchParams.get('attributeKey') ?? ''] ?? [],
						req.url.searchParams.get('searchText') ?? '',
					),
				),
			),
		];
	},
	config: () => ({
		route: ROUTES.TRACES_FUNNELS_DETAIL.replace(':funnelId', FUNNEL_ID),
	}),
});
