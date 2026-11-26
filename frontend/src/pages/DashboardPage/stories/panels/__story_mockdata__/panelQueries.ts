/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import {
	DashboardtypesComparisonOperatorDTO as ComparisonOperator,
	DashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesBuilderQuerySpecDTOKind as BuilderQueryKind,
	DashboardtypesThresholdFormatDTO as ThresholdFormat,
	MetrictypesSpaceAggregationDTO as SpaceAggregation,
	MetrictypesTimeAggregationDTO as TimeAggregation,
	Querybuildertypesv5BucketOptionsLinearDTOKind as LinearBuckets,
	Querybuildertypesv5OrderDirectionDTO as OrderDirection,
	Querybuildertypesv5QueryBuilderQueryGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5LogAggregationDTOSignal as LogSignal,
	Querybuildertypesv5QueryBuilderQueryGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5MetricAggregationDTOSignal as MetricSignal,
	Querybuildertypesv5QueryBuilderQueryGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5TraceAggregationDTOSignal as TraceSignal,
	Querybuildertypesv5RequestTypeDTO as RequestType,
	type DashboardtypesComparisonThresholdDTO,
	type DashboardtypesQueryDTO,
	type DashboardtypesTableThresholdDTO,
	type DashboardtypesThresholdWithLabelDTO,
	type Querybuildertypesv5QueryBuilderQueryGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5LogAggregationDTO as LogBuilderQuery,
	type Querybuildertypesv5QueryBuilderQueryGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5MetricAggregationDTO as MetricBuilderQuery,
	type Querybuildertypesv5QueryBuilderQueryGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5TraceAggregationDTO as TraceBuilderQuery,
} from 'api/generated/services/sigNoz.schemas';

import {
	CHART_THRESHOLD_VALUE,
	HEATMAP_FIELDS,
	NUMBER_THRESHOLD_VALUE,
	QUERY_NAME,
	TABLE_THRESHOLD_VALUE,
	TABLE_VALUE_COLUMN,
	THRESHOLD_COLOR,
} from './constants';
import type { HeatmapSource, TextSample } from './types';

export const labelThresholds = (
	on: boolean,
): DashboardtypesThresholdWithLabelDTO[] =>
	on
		? [{ value: CHART_THRESHOLD_VALUE, color: THRESHOLD_COLOR, label: 'SLO' }]
		: [];

export const comparisonThresholds = (
	on: boolean,
	value = NUMBER_THRESHOLD_VALUE,
): DashboardtypesComparisonThresholdDTO[] =>
	on
		? [
				{
					value,
					operator: ComparisonOperator.above,
					color: THRESHOLD_COLOR,
					format: ThresholdFormat.background,
				},
			]
		: [];

export const tableThresholds = (
	on: boolean,
): DashboardtypesTableThresholdDTO[] =>
	on
		? [
				{
					columnName: TABLE_VALUE_COLUMN,
					value: TABLE_THRESHOLD_VALUE,
					operator: ComparisonOperator.above,
					color: THRESHOLD_COLOR,
					format: ThresholdFormat.background,
				},
			]
		: [];

export const TEXT_BODIES: Record<TextSample, string> = {
	runbook: [
		'# Checkout runbook',
		'',
		'When **p99 latency** crosses the SLO:',
		'',
		'- Check the [payments dashboard](https://signoz.io/docs/)',
		'- Scale the `checkout` deployment',
		'- Page the on-call',
		'',
		'```sh',
		'kubectl scale deploy/checkout --replicas=6',
		'```',
	].join('\n'),
	note: 'Latency panels read from the **checkout** service only.',
	blank: '',
};

interface MetricQueryOptions {
	grouped: boolean;
	heatmap?: boolean;
	name?: string;
	metricName?: string;
	spaceAggregation?: SpaceAggregation;
}

export const metricQuery = (
	requestType: RequestType,
	{
		grouped,
		heatmap,
		name = QUERY_NAME,
		metricName = 'signoz_latency',
		spaceAggregation = SpaceAggregation.p99,
	}: MetricQueryOptions,
): DashboardtypesQueryDTO => {
	const spec: MetricBuilderQuery = {
		name,
		signal: MetricSignal.metrics,
		aggregations: [
			{
				metricName: heatmap ? `${metricName}_bucket` : metricName,
				spaceAggregation: heatmap ? undefined : spaceAggregation,
				timeAggregation: heatmap ? TimeAggregation.increase : TimeAggregation.avg,
			},
		],
		groupBy: grouped ? [{ name: 'service.name' }] : undefined,
		legend:
			grouped && requestType !== RequestType.scalar
				? '{{service.name}}'
				: undefined,
		bucketOptions: heatmap
			? { kind: LinearBuckets.linear, spec: { maxValue: 1000, numBuckets: 10 } }
			: undefined,
	};

	return {
		kind: requestType,
		spec: {
			name,
			plugin: { kind: BuilderQueryKind['signoz/BuilderQuery'], spec },
		},
	};
};

export const logQuery = (): DashboardtypesQueryDTO => {
	const spec: LogBuilderQuery = {
		name: QUERY_NAME,
		signal: LogSignal.logs,
		order: [{ key: { name: 'timestamp' }, direction: OrderDirection.desc }],
	};

	return {
		kind: RequestType.raw,
		spec: {
			name: QUERY_NAME,
			plugin: { kind: BuilderQueryKind['signoz/BuilderQuery'], spec },
		},
	};
};

/** `no field` is a traces heatmap whose field was cleared: it saves with no aggregation. */
export const eventHeatmapQuery = (
	source: Exclude<HeatmapSource, 'metrics'>,
): DashboardtypesQueryDTO => {
	const groupBy = [{ name: 'service.name' }];
	const legend = '{{service.name}}';
	const bucketOptions = {
		kind: LinearBuckets.linear,
		spec: { maxValue: 1000, numBuckets: 10 },
	};
	const spec: LogBuilderQuery | TraceBuilderQuery =
		source === 'logs'
			? {
					name: QUERY_NAME,
					signal: LogSignal.logs,
					aggregations: [{ expression: HEATMAP_FIELDS.logs }],
					groupBy,
					legend,
					bucketOptions,
				}
			: {
					name: QUERY_NAME,
					signal: TraceSignal.traces,
					aggregations:
						source === 'traces' ? [{ expression: HEATMAP_FIELDS.traces }] : [],
					groupBy,
					legend,
					bucketOptions,
				};

	return {
		kind: RequestType.heatmap,
		spec: {
			name: QUERY_NAME,
			plugin: { kind: BuilderQueryKind['signoz/BuilderQuery'], spec },
		},
	};
};
