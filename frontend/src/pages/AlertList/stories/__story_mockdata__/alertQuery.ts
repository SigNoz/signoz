/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import {
	MetrictypesTemporalityDTO,
	MetrictypesTypeDTO,
	TelemetrytypesFieldContextDTO,
	TelemetrytypesFieldDataTypeDTO,
	type GetFieldsKeys200,
	type GetFieldsValues200,
	type GetMetricMetadata200,
	type ListMetrics200,
	type MetricsexplorertypesListMetricDTO,
	type TelemetrytypesTelemetryFieldKeyDTO,
} from 'api/generated/services/sigNoz.schemas';
import type {
	MetricRangePayloadV5,
	QueryRangeRequestV5,
} from 'types/api/v5/queryRange';

import {
	queryRangeV5EmptyResponse,
	queryRangeV5TimeSeriesResponse,
	timeSeriesPoints,
} from '@/storybook/msw/__story_mockdata__/queryRange';

const HOSTS = [
	'ip-10-0-1-14',
	'ip-10-0-2-31',
	'ip-10-0-3-77',
	'ip-10-0-4-08',
	'ip-10-0-5-52',
	'ip-10-0-6-19',
];

/**
 * The chart the alert form previews the condition against, plotted over the
 * window the form asked for and named after the query the request carried.
 */
export const alertPreviewSeries = async (
	count: number,
	req: { json: () => Promise<unknown> },
): Promise<MetricRangePayloadV5> => {
	const body = (await req.json()) as QueryRangeRequestV5;
	const queryName =
		(body.compositeQuery?.queries?.[0]?.spec as { name?: string } | undefined)
			?.name ?? 'A';

	if (count === 0) {
		return queryRangeV5EmptyResponse(queryName);
	}

	return queryRangeV5TimeSeriesResponse([
		{
			queryName,
			series: Array.from({ length: count }, (_unused, index) => ({
				labels: [
					{ key: { name: 'host.name' }, value: HOSTS[index % HOSTS.length] },
				],
				values: timeSeriesPoints({
					start: body.start,
					end: body.end,
					base: 55 + index * 6,
					amplitude: 12,
					seed: index * 3,
				}),
			})),
		},
	]);
};

const METRIC_SEEDS: MetricsexplorertypesListMetricDTO[] = [
	{
		metricName: 'system_cpu_utilization',
		description: 'Ratio of the CPU that is in use, per host.',
		unit: 'percent',
		type: MetrictypesTypeDTO.gauge,
		temporality: MetrictypesTemporalityDTO.unspecified,
		isMonotonic: false,
	},
	{
		metricName: 'system_memory_usage',
		description: 'Memory in use, per host.',
		unit: 'bytes',
		type: MetrictypesTypeDTO.gauge,
		temporality: MetrictypesTemporalityDTO.unspecified,
		isMonotonic: false,
	},
	{
		metricName: 'http_server_duration',
		description: 'Duration of inbound HTTP requests.',
		unit: 'ms',
		type: MetrictypesTypeDTO.histogram,
		temporality: MetrictypesTemporalityDTO.cumulative,
		isMonotonic: false,
	},
	{
		metricName: 'kafka_consumer_lag',
		description: 'Messages a consumer group is behind.',
		unit: '',
		type: MetrictypesTypeDTO.gauge,
		temporality: MetrictypesTemporalityDTO.unspecified,
		isMonotonic: false,
	},
	{
		metricName: 'postgresql_backends',
		description: 'Connections open against the database.',
		unit: '',
		type: MetrictypesTypeDTO.sum,
		temporality: MetrictypesTemporalityDTO.cumulative,
		isMonotonic: true,
	},
];

/** The metric picker in the query section, narrowed by whatever was typed. */
export const alertMetricsResponse = (searchText: string): ListMetrics200 => ({
	status: 'success',
	data: {
		metrics: METRIC_SEEDS.filter((metric) =>
			metric.metricName.includes(searchText.toLowerCase()),
		),
	},
});

/** The unit the chart's y-axis defaults to when a metric is selected. */
export const alertMetricMetadataResponse = (
	metricName: string,
): GetMetricMetadata200 => {
	const metric =
		METRIC_SEEDS.find((seed) => seed.metricName === metricName) ??
		METRIC_SEEDS[0];

	return {
		status: 'success',
		data: {
			description: metric.description,
			unit: metric.unit,
			type: metric.type,
			temporality: metric.temporality,
			isMonotonic: metric.isMonotonic,
		},
	};
};

const FIELD_SEEDS: TelemetrytypesTelemetryFieldKeyDTO[] = [
	{
		name: 'service.name',
		fieldContext: TelemetrytypesFieldContextDTO.resource,
		fieldDataType: TelemetrytypesFieldDataTypeDTO.string,
	},
	{
		name: 'deployment.environment',
		fieldContext: TelemetrytypesFieldContextDTO.resource,
		fieldDataType: TelemetrytypesFieldDataTypeDTO.string,
	},
	{
		name: 'host.name',
		fieldContext: TelemetrytypesFieldContextDTO.resource,
		fieldDataType: TelemetrytypesFieldDataTypeDTO.string,
	},
	{
		name: 'http.route',
		fieldContext: TelemetrytypesFieldContextDTO.attribute,
		fieldDataType: TelemetrytypesFieldDataTypeDTO.string,
	},
	{
		name: 'http.status_code',
		fieldContext: TelemetrytypesFieldContextDTO.attribute,
		fieldDataType: TelemetrytypesFieldDataTypeDTO.int64,
	},
	{
		name: 'severity_text',
		fieldContext: TelemetrytypesFieldContextDTO.log,
		fieldDataType: TelemetrytypesFieldDataTypeDTO.string,
	},
];

const FIELD_VALUES: Record<string, string[]> = {
	'service.name': ['checkout', 'payments', 'auth', 'search'],
	'deployment.environment': ['production', 'staging'],
	'host.name': ['ip-10-0-1-14', 'ip-10-0-2-31', 'ip-10-0-3-77'],
	'http.route': ['/checkout', '/payments/charge', '/v1/login'],
	severity_text: ['ERROR', 'WARN', 'INFO'],
};

const NUMBER_FIELD_VALUES: Record<string, number[]> = {
	'http.status_code': [200, 404, 500, 503],
};

const matching = <T>(values: T[], searchText: string): T[] =>
	values.filter((value) =>
		String(value).toLowerCase().includes(searchText.toLowerCase()),
	);

/** What the filter box in the alert's query section completes on. */
export const alertFieldKeysResponse = (
	searchText: string,
): GetFieldsKeys200 => ({
	status: 'success',
	data: {
		complete: true,
		keys: Object.fromEntries(
			FIELD_SEEDS.filter((field) =>
				field.name.includes(searchText.toLowerCase()),
			).map((field) => [field.name, [field]]),
		),
	},
});

export const alertFieldValuesResponse = (
	name: string,
	searchText: string,
): GetFieldsValues200 => ({
	status: 'success',
	data: {
		complete: true,
		values: {
			stringValues: matching(FIELD_VALUES[name] ?? [], searchText),
			numberValues: matching(NUMBER_FIELD_VALUES[name] ?? [], searchText),
			relatedValues: [],
		},
	},
});
