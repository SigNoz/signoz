import { Temporality } from 'api/metricsExplorer/getMetricDetails';
import { MetricType } from 'api/metricsExplorer/getMetricsList';
import { SpaceAggregation, TimeAggregation } from 'api/v5/v5';
import { initialQueriesMap } from 'constants/queryBuilder';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource, ReduceOperators } from 'types/common/queryBuilder';

import {
	MetricAlert,
	MetricAttribute,
	MetricDashboard,
	MetricHighlight,
	MetricMetadata,
	MetricMetadataState,
} from './types';
import {
	GetMetricAlerts200,
	GetMetricAttributes200,
	GetMetricDashboards200,
	GetMetricHighlights200,
	GetMetricMetadata200,
} from 'api/generated/services/sigNoz.schemas';
import { UpdateMetricMetadataMutationBody } from 'api/generated/services/metrics';

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
	metricType: MetricType,
	temporality?: Temporality,
): boolean {
	if (
		metricType === MetricType.HISTOGRAM ||
		metricType === MetricType.EXPONENTIAL_HISTOGRAM
	) {
		return true;
	}
	if (metricType === MetricType.GAUGE || metricType === MetricType.SUMMARY) {
		return false;
	}
	if (metricType === MetricType.SUM) {
		return temporality === Temporality.CUMULATIVE;
	}
	return false;
}

export function getMetricDetailsQuery(
	metricName: string,
	metricType: MetricType | undefined,
	filter?: { key: string; value: string },
	groupBy?: string,
): Query {
	let timeAggregation;
	let spaceAggregation;
	let aggregateOperator;
	switch (metricType) {
		case MetricType.SUM:
			timeAggregation = 'rate';
			spaceAggregation = 'sum';
			aggregateOperator = 'rate';
			break;
		case MetricType.GAUGE:
			timeAggregation = 'avg';
			spaceAggregation = 'avg';
			aggregateOperator = 'avg';
			break;
		case MetricType.SUMMARY:
			timeAggregation = 'noop';
			spaceAggregation = 'sum';
			aggregateOperator = 'noop';
			break;
		case MetricType.HISTOGRAM:
		case MetricType.EXPONENTIAL_HISTOGRAM:
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

export function transformMetricHighlights(
	apiData: GetMetricHighlights200 | undefined,
): MetricHighlight | null {
	if (!apiData || !apiData.data) {
		return null;
	}

	const {
		dataPoints,
		lastReceived,
		totalTimeSeries,
		activeTimeSeries,
	} = apiData.data;

	return {
		dataPoints: dataPoints ?? 0,
		lastReceived: lastReceived ?? 0,
		totalTimeSeries: totalTimeSeries ?? 0,
		activeTimeSeries: activeTimeSeries ?? 0,
	};
}

export function transformMetricAlerts(
	apiData: GetMetricAlerts200 | undefined,
): MetricAlert[] {
	if (!apiData || !apiData.data || !apiData.data.alerts) {
		return [];
	}
	return apiData.data.alerts.map((alert) => ({
		alertName: alert.alertName ?? '',
		alertId: alert.alertId ?? '',
	}));
}

export function transformMetricDashboards(
	apiData: GetMetricDashboards200 | undefined,
): MetricDashboard[] {
	if (!apiData || !apiData.data || !apiData.data.dashboards) {
		return [];
	}
	const dashboards = apiData.data.dashboards.map((dashboard) => ({
		dashboardName: dashboard.dashboardName ?? '',
		dashboardId: dashboard.dashboardId ?? '',
		widgetId: dashboard.widgetId ?? '',
		widgetName: dashboard.widgetName ?? '',
	}));
	// Remove duplicate dashboards
	return dashboards.filter(
		(dashboard, index, self) =>
			index === self.findIndex((t) => t.dashboardId === dashboard.dashboardId),
	);
}

export function transformTemporality(
	temporality: string | undefined,
): Temporality {
	switch (temporality) {
		case 'delta':
			return Temporality.DELTA;
		case 'cumulative':
			return Temporality.CUMULATIVE;
		default:
			return Temporality.DELTA;
	}
}

export function transformMetricType(type: string | undefined): MetricType {
	switch (type) {
		case 'sum':
			return MetricType.SUM;
		case 'gauge':
			return MetricType.GAUGE;
		case 'summary':
			return MetricType.SUMMARY;
		case 'histogram':
			return MetricType.HISTOGRAM;
		case 'exponential_histogram':
			return MetricType.EXPONENTIAL_HISTOGRAM;
		default:
			return MetricType.SUM;
	}
}

export function transformMetricMetadata(
	apiData: GetMetricMetadata200 | undefined,
): MetricMetadata | null {
	if (!apiData || !apiData.data) {
		return null;
	}
	const { type, description, unit, temporality, isMonotonic } = apiData.data;

	return {
		metricType: transformMetricType(type),
		description: description ?? '',
		unit: unit ?? '',
		temporality: transformTemporality(temporality),
		isMonotonic: isMonotonic ?? false,
	};
}

export function transformUpdateMetricMetadataRequest(
	metricMetadata: MetricMetadataState,
): UpdateMetricMetadataMutationBody {
	return {
		type: metricMetadata.metricType,
		description: metricMetadata.description,
		unit: metricMetadata.unit || '',
		temporality: metricMetadata.temporality || '',
		isMonotonic: determineIsMonotonic(
			metricMetadata.metricType,
			metricMetadata.temporality,
		),
	};
}

export function transformMetricAttributes(
	apiData: GetMetricAttributes200 | undefined,
): { attributes: MetricAttribute[]; totalKeys: number } {
	if (!apiData || !apiData.data) {
		return { attributes: [], totalKeys: 0 };
	}
	const { attributes, totalKeys } = apiData.data;
	return {
		attributes:
			attributes?.map((attribute) => ({
				key: attribute.key ?? '',
				values: attribute.values ?? [],
				valueCount: attribute.valueCount ?? 0,
			})) ?? [],
		totalKeys: totalKeys ?? 0,
	};
}
