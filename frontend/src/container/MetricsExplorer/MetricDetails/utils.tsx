import { UpdateMetricMetadataMutationBody } from 'api/generated/services/metrics';
import {
	GetMetricMetadata200,
	MetricsexplorertypesMetricMetadataDTOTemporality,
	MetricsexplorertypesMetricMetadataDTOType,
	MetricsexplorertypesUpdateMetricMetadataRequestDTOTemporality,
	MetricsexplorertypesUpdateMetricMetadataRequestDTOType,
} from 'api/generated/services/sigNoz.schemas';
import { SpaceAggregation, TimeAggregation } from 'api/v5/v5';
import { initialQueriesMap } from 'constants/queryBuilder';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource, ReduceOperators } from 'types/common/queryBuilder';

import { MetricMetadata, MetricMetadataState } from './types';

export function formatTimestampToReadableDate(
	timestamp: number | string | undefined,
): string {
	if (!timestamp) {
		return '-';
	}
	const date = new Date(timestamp);
	const now = new Date();
	const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

	if (diffInSeconds < 60) {
		return 'Few seconds ago';
	}

	const diffInMinutes = Math.floor(diffInSeconds / 60);
	if (diffInMinutes < 60) {
		return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
	}

	const diffInHours = Math.floor(diffInMinutes / 60);
	if (diffInHours < 24) {
		return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
	}

	const diffInDays = Math.floor(diffInHours / 24);
	if (diffInDays === 1) {
		return `Yesterday at ${date
			.getHours()
			.toString()
			.padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
	}
	if (diffInDays < 7) {
		return `${diffInDays} days ago`;
	}

	return date.toLocaleDateString();
}

export function formatNumberToCompactFormat(num: number | undefined): string {
	if (!num) {
		return '-';
	}
	return new Intl.NumberFormat('en-US', {
		notation: 'compact',
		maximumFractionDigits: 1,
	}).format(num);
}

export function determineIsMonotonic(
	metricType: MetricsexplorertypesUpdateMetricMetadataRequestDTOType,
	temporality?: MetricsexplorertypesUpdateMetricMetadataRequestDTOTemporality,
): boolean {
	if (
		metricType ===
			MetricsexplorertypesUpdateMetricMetadataRequestDTOType.histogram ||
		metricType ===
			MetricsexplorertypesUpdateMetricMetadataRequestDTOType.exponentialhistogram
	) {
		return true;
	}
	if (
		metricType === MetricsexplorertypesUpdateMetricMetadataRequestDTOType.gauge ||
		metricType === MetricsexplorertypesUpdateMetricMetadataRequestDTOType.summary
	) {
		return false;
	}
	if (
		metricType === MetricsexplorertypesUpdateMetricMetadataRequestDTOType.sum
	) {
		return (
			temporality ===
			MetricsexplorertypesUpdateMetricMetadataRequestDTOTemporality.cumulative
		);
	}
	return false;
}

export function getMetricDetailsQuery(
	metricName: string,
	metricType: MetricsexplorertypesMetricMetadataDTOType | undefined,
	filter?: { key: string; value: string },
	groupBy?: string,
): Query {
	let timeAggregation;
	let spaceAggregation;
	let aggregateOperator;
	switch (metricType) {
		case MetricsexplorertypesMetricMetadataDTOType.sum:
			timeAggregation = 'rate';
			spaceAggregation = 'sum';
			aggregateOperator = 'rate';
			break;
		case MetricsexplorertypesMetricMetadataDTOType.gauge:
			timeAggregation = 'avg';
			spaceAggregation = 'avg';
			aggregateOperator = 'avg';
			break;
		case MetricsexplorertypesMetricMetadataDTOType.summary:
			timeAggregation = 'noop';
			spaceAggregation = 'sum';
			aggregateOperator = 'noop';
			break;
		case MetricsexplorertypesMetricMetadataDTOType.histogram:
		case MetricsexplorertypesMetricMetadataDTOType.exponentialhistogram:
			timeAggregation = 'noop';
			spaceAggregation = 'p90';
			aggregateOperator = 'noop';
			break;
		default:
			timeAggregation = 'noop';
			spaceAggregation = 'noop';
			aggregateOperator = 'noop';
			break;
	}

	return {
		...initialQueriesMap[DataSource.METRICS],
		builder: {
			queryData: [
				{
					...initialQueriesMap[DataSource.METRICS].builder.queryData[0],
					aggregateAttribute: {
						key: metricName,
						type: metricType ?? '',
						id: `${metricName}----${metricType}---string--`,
						dataType: DataTypes.String,
					},
					aggregations: [
						{
							metricName,
							timeAggregation: timeAggregation as TimeAggregation,
							spaceAggregation: spaceAggregation as SpaceAggregation,
							reduceTo: ReduceOperators.AVG,
							temporality: '',
						},
					],
					aggregateOperator,
					timeAggregation,
					spaceAggregation,
					filters: {
						op: 'AND',
						items: filter
							? [
									{
										op: '=',
										id: filter.key,
										value: filter.value,
										key: {
											key: filter.key,
											type: DataTypes.String,
										},
									},
							  ]
							: [],
					},
					groupBy: groupBy
						? [
								{
									key: groupBy,
									dataType: DataTypes.String,
									type: 'tag',
									id: `${groupBy}--string--tag--false`,
								},
						  ]
						: [],
				},
			],
			queryFormulas: [],
			queryTraceOperator: [],
		},
	};
}

export function transformMetricMetadata(
	apiData: GetMetricMetadata200 | undefined,
): MetricMetadata | null {
	if (!apiData || !apiData.data) {
		return null;
	}
	const { type, description, unit, temporality, isMonotonic } = apiData.data;

	return {
		type,
		description,
		unit,
		temporality,
		isMonotonic,
	};
}

export function transformUpdateMetricMetadataRequest(
	metricName: string,
	metricMetadata: MetricMetadataState,
): UpdateMetricMetadataMutationBody {
	return {
		metricName: metricName,
		type: metricMetadata.type,
		description: metricMetadata.description,
		unit: metricMetadata.unit,
		temporality:
			metricMetadata.temporality ??
			MetricsexplorertypesUpdateMetricMetadataRequestDTOTemporality.unspecified,
		isMonotonic: determineIsMonotonic(
			metricMetadata.type,
			metricMetadata.temporality,
		),
	};
}

export function transformMetricType(
	type: MetricsexplorertypesMetricMetadataDTOType,
): MetricsexplorertypesUpdateMetricMetadataRequestDTOType {
	switch (type) {
		case MetricsexplorertypesMetricMetadataDTOType.sum:
			return MetricsexplorertypesUpdateMetricMetadataRequestDTOType.sum;
		case MetricsexplorertypesMetricMetadataDTOType.gauge:
			return MetricsexplorertypesUpdateMetricMetadataRequestDTOType.gauge;
		case MetricsexplorertypesMetricMetadataDTOType.histogram:
			return MetricsexplorertypesUpdateMetricMetadataRequestDTOType.histogram;
		case MetricsexplorertypesMetricMetadataDTOType.summary:
			return MetricsexplorertypesUpdateMetricMetadataRequestDTOType.summary;
		case MetricsexplorertypesMetricMetadataDTOType.exponentialhistogram:
			return MetricsexplorertypesUpdateMetricMetadataRequestDTOType.exponentialhistogram;
	}
}

export function transformTemporality(
	temporality: MetricsexplorertypesMetricMetadataDTOTemporality,
): MetricsexplorertypesUpdateMetricMetadataRequestDTOTemporality {
	switch (temporality) {
		case MetricsexplorertypesMetricMetadataDTOTemporality.delta:
			return MetricsexplorertypesUpdateMetricMetadataRequestDTOTemporality.delta;
		case MetricsexplorertypesMetricMetadataDTOTemporality.cumulative:
			return MetricsexplorertypesUpdateMetricMetadataRequestDTOTemporality.cumulative;
		case MetricsexplorertypesMetricMetadataDTOTemporality.unspecified:
			return MetricsexplorertypesUpdateMetricMetadataRequestDTOTemporality.unspecified;
	}
}
