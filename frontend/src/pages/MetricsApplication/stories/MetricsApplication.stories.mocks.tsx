/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { Querybuildertypesv5RequestTypeDTO } from 'api/generated/services/sigNoz.schemas';
import { FeatureKeys } from 'constants/features';
import { QueryParams } from 'constants/query';
import { rest } from 'msw';
import { createAppContextMock } from 'tests/fixtures/appContextMock';
import type { FeatureFlagProps } from 'types/api/features/getFeaturesFlags';
import { USER_ROLES } from 'types/roles';

import { choiceControl, countControl } from '@/storybook/controls/controls';
import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';
import {
	fieldKeysResponse,
	fieldValuesResponse,
} from '@/storybook/msw/__story_mockdata__/fields';
import { queryRangeV5ForRequest } from '@/storybook/msw/__story_mockdata__/queryRange';

import {
	apDexSettingsResponse,
	METRICS_APPLICATION_TABS,
	METRICS_LABEL_VALUES,
	metricMetaResponse,
	SERVICE_MODES,
	SERVICE_NAME,
	TOP_OPERATION_MAX,
	topLevelOperationsResponse,
	topOperationsResponse,
	type MetricsApplicationTabKey,
	type ServiceMode,
} from './__story_mockdata__/metricsApplication';

const VIEW = 'Service · view';
const DATA = 'Service · data';

const DEPLOYMENT_KEY = 'resource_deployment.environment';

const RESOURCE_ATTRIBUTE_KEYS = [
	DEPLOYMENT_KEY,
	'resource_k8s.cluster.name',
	'resource_k8s.namespace.name',
	'resource_host.name',
];

const APDEX_THRESHOLD = 0.5;

const { featureFlags: baseFeatureFlags } = createAppContextMock(
	USER_ROLES.ADMIN,
);

const featureFlagsFor = (mode: ServiceMode): FeatureFlagProps[] =>
	(baseFeatureFlags ?? []).map((flag) =>
		flag.name === FeatureKeys.USE_SPAN_METRICS
			? { ...flag, active: mode === 'span-metrics' }
			: flag,
	);

export const metricsApplicationMocks = defineStoryMocks({
	controls: {
		tab: choiceControl<MetricsApplicationTabKey>('Tab', {
			group: VIEW,
			description: 'Which of the service tabs is open, which is the `tab` param.',
			options: METRICS_APPLICATION_TABS,
			value: 'OVER_METRICS',
		}),
		mode: choiceControl<ServiceMode>('Source', {
			group: VIEW,
			description:
				'Where latency and the key operations table read from: traces, or the span metrics the `use_span_metrics` flag switches them to.',
			options: SERVICE_MODES,
			value: 'traces',
		}),
		operations: countControl('Key operations', {
			group: DATA,
			description: 'Rows in the key operations table below the graphs.',
			value: 8,
			max: TOP_OPERATION_MAX,
		}),
		series: countControl('Graph series', {
			group: DATA,
			description:
				'Lines a grouped graph draws: one per operation, database or upstream address it broke down by.',
			value: 3,
			max: 6,
		}),
	},
	handlers: (values, response) => {
		return [
			rest.post(
				'http://localhost/api/v5/query_range',
				response.json(async (req) => {
					const body = await req.json();

					// the only scalar request is the span-metrics key operations table
					return queryRangeV5ForRequest(body, {
						count:
							body.requestType === Querybuildertypesv5RequestTypeDTO.scalar
								? values.operations
								: values.series,
						labelValues: METRICS_LABEL_VALUES,
					});
				}),
			),
			rest.post(
				'http://localhost/api/v1/service/top_level_operations',
				response.json(() => topLevelOperationsResponse(SERVICE_NAME)),
			),
			rest.post(
				'http://localhost/api/v2/service/top_operations',
				response.json(() => topOperationsResponse(values.operations, false)),
			),
			rest.post(
				'http://localhost/api/v2/service/entry_point_operations',
				response.json(() => topOperationsResponse(values.operations, true)),
			),
			// The apdex settings and the histogram buckets are what the apdex widget
			// reads its threshold off, so they answer while the graphs hang or fail.
			rest.get('http://localhost/api/v1/settings/apdex', (req, res, ctx) =>
				res(
					ctx.json(
						apDexSettingsResponse(
							req.url.searchParams.get('services') ?? SERVICE_NAME,
							APDEX_THRESHOLD,
						),
					),
				),
			),
			rest.post('http://localhost/api/v1/settings/apdex', (_req, res, ctx) =>
				res(ctx.json({ data: 'ok' })),
			),
			rest.get(
				'http://localhost/api/v4/metric/metric_metadata',
				(_req, res, ctx) => res(ctx.json(metricMetaResponse())),
			),
			rest.get(
				'http://localhost/api/v1/fields/keys',
				response.json((req) => {
					const match = req.url.searchParams.get('searchText') ?? '';

					return fieldKeysResponse(
						match === DEPLOYMENT_KEY
							? [DEPLOYMENT_KEY]
							: RESOURCE_ATTRIBUTE_KEYS.filter((key) => key !== DEPLOYMENT_KEY),
					);
				}),
			),
			rest.get(
				'http://localhost/api/v1/fields/values',
				response.json((req) => {
					const name = req.url.searchParams.get('name') ?? '';

					return fieldValuesResponse(
						name === DEPLOYMENT_KEY
							? ['production', 'staging', 'canary']
							: [`${name.replace('resource_', '')}-01`],
					);
				}),
			),
		];
	},
	config: (values) => ({
		route: `/services/${SERVICE_NAME}?${QueryParams.tab}=${values.tab}`,
		appContext: { featureFlags: featureFlagsFor(values.mode) },
	}),
});
