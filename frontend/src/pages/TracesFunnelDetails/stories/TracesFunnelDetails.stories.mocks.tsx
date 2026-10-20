/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import {
	TelemetrytypesFieldContextDTO,
	TelemetrytypesSignalDTO,
} from 'api/generated/services/sigNoz.schemas';
import ROUTES from 'constants/routes';
import { rest } from 'msw';

import { choiceControl, countControl } from '@/storybook/controls/controls';
import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';
import {
	fieldKeysResponse,
	fieldValuesResponse,
} from '@/storybook/msw/__story_mockdata__/fields';

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

const STEP_RESOURCE_KEYS = ['service.name', 'deployment.environment'];

const STEP_ATTRIBUTE_KEYS = ['name', 'http.status_code', 'hasError'];

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
			// The `Where` box on every step reads its suggestions as soon as the step
			// renders, and the service and span name selects read `service.name` and
			// `name` from the same values endpoint.
			rest.get(
				'http://localhost/api/v1/fields/keys',
				response.json(() => {
					const signal = TelemetrytypesSignalDTO.traces;
					const resource = fieldKeysResponse(STEP_RESOURCE_KEYS, {
						signal,
						fieldContext: TelemetrytypesFieldContextDTO.resource,
					});
					const attribute = fieldKeysResponse(STEP_ATTRIBUTE_KEYS, {
						signal,
						fieldContext: TelemetrytypesFieldContextDTO.attribute,
					});

					return {
						...resource,
						data: {
							...resource.data,
							keys: { ...resource.data.keys, ...attribute.data.keys },
						},
					};
				}),
			),
			rest.get(
				'http://localhost/api/v1/fields/values',
				response.json((req) => {
					const searchText = (
						req.url.searchParams.get('searchText') ?? ''
					).toLowerCase();

					return fieldValuesResponse(
						(STEP_FILTER_VALUES[req.url.searchParams.get('name') ?? ''] ?? []).filter(
							(value) => value.toLowerCase().includes(searchText),
						),
					);
				}),
			),
		];
	},
	config: () => ({
		route: ROUTES.TRACES_FUNNELS_DETAIL.replace(':funnelId', FUNNEL_ID),
	}),
});
