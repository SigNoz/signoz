/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import {
	DashboardtypesSourceDTO,
	type DashboardtypesGettableSystemDashboardDTO,
	type GetSystemDashboard200,
} from 'api/generated/services/sigNoz.schemas';
import type {
	MetricRangePayloadV5,
	QueryEnvelope,
	QueryRangeRequestV5,
	TimeSeries,
} from 'types/api/v5/queryRange';

import {
	queryRangeV5ScalarTableResponse,
	queryRangeV5TimeSeriesResponse,
	timeSeriesPoints,
} from '@/storybook/msw/__story_mockdata__/queryRange';

import dbCallsDefinition from '../../../../../../pkg/modules/dashboard/impldashboard/fs/definitions/services-db-calls.json';
import externalCallsDefinition from '../../../../../../pkg/modules/dashboard/impldashboard/fs/definitions/services-external-calls.json';
import overviewDefinition from '../../../../../../pkg/modules/dashboard/impldashboard/fs/definitions/services-overview.json';

export const SERVICE_NAME = 'checkout-api';

export const SERVICE_NAMES = [SERVICE_NAME, 'cart', 'payments', 'frontend'];

export const ENVIRONMENTS = ['production', 'staging'];

export const SERVICE_DETAILS_TABS = [
	'OVER_METRICS',
	'DB_CALL_METRICS',
	'EXTERNAL_METRICS',
] as const;

export type ServiceDetailsTabKey = (typeof SERVICE_DETAILS_TABS)[number];

const DEFINITIONS = {
	'services-overview': overviewDefinition,
	'services-db-calls': dbCallsDefinition,
	'services-external-calls': externalCallsDefinition,
};

export type ServiceDashboardName = keyof typeof DEFINITIONS;

export const isServiceDashboardName = (
	name: string,
): name is ServiceDashboardName => name in DEFINITIONS;

/** A tab's system dashboard, as `GET /api/v2/dashboards/system/:name` serves it. */
export const serviceSystemDashboardResponse = (
	name: ServiceDashboardName,
): GetSystemDashboard200 => {
	const { definition } = DEFINITIONS[name];

	return {
		status: 'success',
		data: {
			orgId: 'storybook-org',
			locked: true,
			source: DashboardtypesSourceDTO.system,
			name: definition.name,
			schemaVersion: definition.schemaVersion,
			tags: [],
			spec: definition.spec as DashboardtypesGettableSystemDashboardDTO['spec'],
		},
	};
};

export const OPERATIONS = [
	'POST /checkout',
	'GET /cart',
	'POST /payments/authorize',
	'GET /orders/:id',
	'POST /orders',
];

const GROUP_VALUES: Record<string, string[]> = {
	name: OPERATIONS,
	'db.system': ['postgresql', 'redis'],
	address: ['payments.internal:443', 'api.stripe.com:443', 'inventory:8080'],
};

interface QuerySpecView {
	name?: string;
	disabled?: boolean;
	expression?: string;
	legend?: string;
	groupBy?: { name: string }[];
	aggregations?: { expression?: string; metricName?: string }[];
}

const specOf = (query: QueryEnvelope): QuerySpecView =>
	query.spec as unknown as QuerySpecView;

/** A plausible level for what a query or formula measures, in its panel's unit. */
const baseFor = (spec: QuerySpecView): number => {
	const aggregation = spec.aggregations?.[0];
	const metric = aggregation?.metricName ?? '';
	const expression = aggregation?.expression ?? spec.expression ?? '';
	if (expression.startsWith('p50')) {
		return 45e6;
	}
	if (expression.startsWith('p90')) {
		return 160e6;
	}
	if (expression.startsWith('p95')) {
		return 180e6;
	}
	if (expression.startsWith('p99')) {
		return 210e6;
	}
	if (expression === 'rate()') {
		return 42;
	}
	if (expression.startsWith('countIf')) {
		return 18;
	}
	if (expression === 'count()') {
		return 2400;
	}
	if (expression === '((B + C)/2)/A') {
		return 0.93;
	}
	if (expression === 'A*100/B') {
		return 2.4;
	}
	if (expression === 'A/B') {
		return 24;
	}
	return metric.includes('external') ? 6 : 15;
};

const visibleQueries = (body: QueryRangeRequestV5): QuerySpecView[] =>
	(body.compositeQuery?.queries ?? [])
		.map(specOf)
		.filter((spec) => !spec.disabled);

/** Groups of the formula's operands decide its series, as the querier does. */
const groupOf = (
	spec: QuerySpecView,
	all: QuerySpecView[],
): string | undefined =>
	spec.groupBy?.[0]?.name ??
	(spec.expression
		? all.find((query) => query.groupBy?.length)?.groupBy?.[0]?.name
		: undefined);

const seriesFor = (
	spec: QuerySpecView,
	group: string | undefined,
	window: { start: number; end: number },
	seed: number,
): TimeSeries[] => {
	const base = baseFor(spec);
	const values = group ? (GROUP_VALUES[group] ?? ['other']) : [undefined];

	return values.map((value, index) => ({
		labels: group && value ? [{ key: { name: group }, value }] : [],
		values: timeSeriesPoints({
			...window,
			base: base * (1 - index * 0.18),
			amplitude: base * 0.12,
			seed: seed + index * 5,
		}),
	}));
};

/**
 * Answers a service panel's `query_range`: one series per visible query or
 * formula, split by its group-by, or for a table one row per group with a
 * column per query.
 */
export const serviceQueryRangeResponse = (
	body: QueryRangeRequestV5,
	{ noData }: { noData: boolean },
): MetricRangePayloadV5 => {
	const all = (body.compositeQuery?.queries ?? []).map(specOf);
	const visible = visibleQueries(body);
	const window = { start: body.start, end: body.end };

	if (body.requestType === 'scalar') {
		const group = groupOf(visible[0] ?? {}, all) ?? 'name';
		const rows = noData
			? []
			: (GROUP_VALUES[group] ?? []).map((value, index) => [
					value,
					...visible.map((spec) => Math.round(baseFor(spec) * (1 - index * 0.15))),
				]);
		return queryRangeV5ScalarTableResponse({
			groupBy: [group],
			aggregations: visible.map((spec) => spec.name ?? 'A'),
			rows,
		});
	}

	return queryRangeV5TimeSeriesResponse(
		visible.map((spec, index) => ({
			queryName: spec.name ?? 'A',
			series: noData ? [] : seriesFor(spec, groupOf(spec, all), window, index),
		})),
	);
};

export const apdexSettingsResponse = (
	servicename: string,
	threshold: number,
): {
	status: string;
	data: { servicename: string; threshold: number; excludeStatusCode: string }[];
} => ({
	status: 'success',
	data: [{ servicename, threshold, excludeStatusCode: '' }],
});
