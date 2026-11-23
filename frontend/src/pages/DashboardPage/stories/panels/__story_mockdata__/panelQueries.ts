/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { DashboardtypesComparisonOperatorDTO as ComparisonOperator } from 'api/generated/services/sigNoz.schemas/dashboardtypesComparisonOperatorDTO';
import { DashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesBuilderQuerySpecDTOKind as BuilderQueryKind } from 'api/generated/services/sigNoz.schemas/dashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesBuilderQuerySpecDTOKind';
import { DashboardtypesThresholdFormatDTO as ThresholdFormat } from 'api/generated/services/sigNoz.schemas/dashboardtypesThresholdFormatDTO';
import { MetrictypesSpaceAggregationDTO as SpaceAggregation } from 'api/generated/services/sigNoz.schemas/metrictypesSpaceAggregationDTO';
import { MetrictypesTimeAggregationDTO as TimeAggregation } from 'api/generated/services/sigNoz.schemas/metrictypesTimeAggregationDTO';
import { Querybuildertypesv5BucketOptionsLinearDTOKind as LinearBuckets } from 'api/generated/services/sigNoz.schemas/querybuildertypesv5BucketOptionsLinearDTOKind';
import { Querybuildertypesv5OrderDirectionDTO as OrderDirection } from 'api/generated/services/sigNoz.schemas/querybuildertypesv5OrderDirectionDTO';
import { Querybuildertypesv5QueryBuilderQueryGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5LogAggregationDTOSignal as LogSignal } from 'api/generated/services/sigNoz.schemas/querybuildertypesv5QueryBuilderQueryGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5LogAggregationDTOSignal';
import { Querybuildertypesv5QueryBuilderQueryGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5MetricAggregationDTOSignal as MetricSignal } from 'api/generated/services/sigNoz.schemas/querybuildertypesv5QueryBuilderQueryGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5MetricAggregationDTOSignal';
import { Querybuildertypesv5RequestTypeDTO as RequestType } from 'api/generated/services/sigNoz.schemas/querybuildertypesv5RequestTypeDTO';
import type { DashboardtypesComparisonThresholdDTO } from 'api/generated/services/sigNoz.schemas/dashboardtypesComparisonThresholdDTO';
import type { DashboardtypesQueryDTO } from 'api/generated/services/sigNoz.schemas/dashboardtypesQueryDTO';
import type { DashboardtypesTableThresholdDTO } from 'api/generated/services/sigNoz.schemas/dashboardtypesTableThresholdDTO';
import type { DashboardtypesThresholdWithLabelDTO } from 'api/generated/services/sigNoz.schemas/dashboardtypesThresholdWithLabelDTO';
import type { Querybuildertypesv5QueryBuilderQueryGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5LogAggregationDTO as LogBuilderQuery } from 'api/generated/services/sigNoz.schemas/querybuildertypesv5QueryBuilderQueryGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5LogAggregationDTO';
import type { Querybuildertypesv5QueryBuilderQueryGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5MetricAggregationDTO as MetricBuilderQuery } from 'api/generated/services/sigNoz.schemas/querybuildertypesv5QueryBuilderQueryGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5MetricAggregationDTO';

import {
	CHART_THRESHOLD_VALUE,
	NUMBER_THRESHOLD_VALUE,
	QUERY_NAME,
	TABLE_THRESHOLD_VALUE,
	TABLE_VALUE_COLUMN,
	THRESHOLD_COLOR,
} from './constants';
import type { TextSample } from './types';

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
