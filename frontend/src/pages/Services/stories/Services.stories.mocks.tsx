/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { FeatureKeys } from 'constants/features';
import { rest } from 'msw';
import { createAppContextMock } from 'tests/fixtures/appContextMock';
import type { FeatureFlagProps } from 'types/api/features/getFeaturesFlags';
import { USER_ROLES } from 'types/roles';

import { choiceControl, countControl } from '@/storybook/controls/controls';
import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';
import {
	attributeKeysResponse,
	attributeValuesResponse,
} from '@/storybook/msw/__story_mockdata__/attributes';

import {
	DEPLOYMENT_ENVIRONMENTS,
	RESOURCE_ATTRIBUTE_KEYS,
	SERVICE_HEALTH_STATES,
	SERVICE_MAX,
	SERVICE_MODES,
	SERVICE_TRAFFIC_LEVELS,
	serviceMetricsResponse,
	servicesResponse,
	topLevelOperationsResponse,
	type ServiceHealth,
	type ServiceMode,
	type ServiceTraffic,
} from './__story_mockdata__/services';

const LIST = 'Services · list';
const HEALTH = 'Services · health';

const DEPLOYMENT_KEY = 'resource_deployment.environment';

const { featureFlags: baseFeatureFlags } = createAppContextMock(
	USER_ROLES.ADMIN,
);

const featureFlagsFor = (mode: ServiceMode): FeatureFlagProps[] =>
	(baseFeatureFlags ?? []).map((flag) =>
		flag.name === FeatureKeys.USE_SPAN_METRICS
			? { ...flag, active: mode === 'span-metrics' }
			: flag,
	);

/**
 * The span-metrics table derives one point per series, so every request answers
 * on the same timestamp and a refetch redraws the same numbers.
 */
const POINT_AT = 1_735_689_600_000;

export const servicesMocks = defineStoryMocks({
	controls: {
		mode: choiceControl<ServiceMode>('Source', {
			group: LIST,
			description:
				'Where the table reads from: the trace-derived service list, or the span metrics the `use_span_metrics` flag switches it to.',
			options: SERVICE_MODES,
			value: 'traces',
		}),
		services: countControl('Services', {
			group: LIST,
			description: 'Rows the table has, ten of which fit on a page.',
			value: 8,
			max: SERVICE_MAX,
		}),
		health: choiceControl<ServiceHealth>('Health', {
			group: HEALTH,
			description:
				'How the error rate and p99 columns are spread across the rows.',
			options: SERVICE_HEALTH_STATES,
			value: 'mixed',
		}),
		traffic: choiceControl<ServiceTraffic>('Traffic', {
			group: HEALTH,
			description:
				'`over-trial-limit` sends more than 100 rps through the services, which is the warning above the table. It needs Banner on `trial-expiry` to show: the app only warns a workspace still on its cloud trial.',
			options: SERVICE_TRAFFIC_LEVELS,
			value: 'steady',
		}),
	},
	handlers: (values, response) => [
		rest.post(
			'http://localhost/api/v2/services',
			response.json(() =>
				servicesResponse(values.services, values.health, values.traffic),
			),
		),
		rest.post(
			'http://localhost/api/v1/service/top_level_operations',
			response.json(() => topLevelOperationsResponse(values.services)),
		),
		rest.post(
			'http://localhost/api/v4/query_range',
			response.json(async (req) =>
				serviceMetricsResponse(
					(await req.json()) as Record<string, unknown>,
					values.services,
					values.health,
					values.traffic,
					POINT_AT,
				),
			),
		),
		rest.get(
			'http://localhost/api/v3/autocomplete/attribute_keys',
			response.json((req) => {
				const match = req.url.searchParams.get('searchText') ?? '';

				return attributeKeysResponse(
					match === DEPLOYMENT_KEY
						? [DEPLOYMENT_KEY]
						: RESOURCE_ATTRIBUTE_KEYS.filter((key) => key !== DEPLOYMENT_KEY),
				);
			}),
		),
		rest.get(
			'http://localhost/api/v3/autocomplete/attribute_values',
			response.json((req) => {
				const attributeKey = req.url.searchParams.get('attributeKey') ?? '';

				return attributeValuesResponse(
					attributeKey === DEPLOYMENT_KEY
						? DEPLOYMENT_ENVIRONMENTS
						: [`${attributeKey.replace('resource_', '')}-01`],
				);
			}),
		),
	],
	config: (values) => ({
		appContext: { featureFlags: featureFlagsFor(values.mode) },
	}),
});
