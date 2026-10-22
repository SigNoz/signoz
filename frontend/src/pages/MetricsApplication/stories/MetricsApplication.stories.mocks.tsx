/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { QueryParams } from 'constants/query';
import { rest } from 'msw';

import { choiceControl, countControl } from '@/storybook/controls/controls';
import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';
import {
	attributeKeysResponse,
	attributeValuesResponse,
} from '@/storybook/msw/__story_mockdata__/attributes';
import { queryRangeV3ForRequest } from '@/storybook/msw/__story_mockdata__/queryRange';

import {
	apDexSettingsResponse,
	METRICS_APPLICATION_TABS,
	METRICS_LABEL_VALUES,
	metricMetaResponse,
	SERVICE_NAME,
	TOP_OPERATION_MAX,
	topLevelOperationsResponse,
	topOperationsResponse,
	type MetricsApplicationTabKey,
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

export const metricsApplicationMocks = defineStoryMocks({
	controls: {
		tab: choiceControl<MetricsApplicationTabKey>('Tab', {
			group: VIEW,
			description: 'Which of the service tabs is open, which is the `tab` param.',
			options: METRICS_APPLICATION_TABS,
			value: 'OVER_METRICS',
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
		const queryRange = response.json(async (req) =>
			queryRangeV3ForRequest(await req.json(), {
				count: values.series,
				labelValues: METRICS_LABEL_VALUES,
			}),
		);

		return [
			rest.post('http://localhost/api/v3/query_range', queryRange),
			rest.post('http://localhost/api/v4/query_range', queryRange),
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
							? ['production', 'staging', 'canary']
							: [`${attributeKey.replace('resource_', '')}-01`],
					);
				}),
			),
		];
	},
	config: (values) => ({
		route: `/services/${SERVICE_NAME}?${QueryParams.tab}=${values.tab}`,
	}),
});
