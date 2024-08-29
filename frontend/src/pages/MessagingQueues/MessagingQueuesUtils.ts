import { QueryParams } from 'constants/query';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { GetWidgetQueryBuilderProps } from 'container/MetricsApplication/types';
import { History, Location } from 'history';
import { isEmpty } from 'lodash-es';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { TagFilterItem } from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';
import { DataSource } from 'types/common/queryBuilder';
import { v4 as uuid } from 'uuid';

export const KAFKA_SETUP_DOC_LINK =
	'https://github.com/shivanshuraj1333/kafka-opentelemetry-instrumentation/tree/master';

export function convertToTitleCase(text: string): string {
	return text
		.split('_')
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
		.join(' ');
}

export type RowData = {
	key: string | number;
	[key: string]: string | number;
};

export enum ConsumerLagDetailType {
	ConsumerDetails = 'consumer-details',
	ProducerDetails = 'producer-details',
	NetworkLatency = 'network-latency',
	PartitionHostMetrics = 'partition-host-metric',
}

export const ConsumerLagDetailTitle: Record<ConsumerLagDetailType, string> = {
	'consumer-details': 'Consumer Groups Details',
	'producer-details': 'Producer Details',
	'network-latency': 'Network Latency',
	'partition-host-metric': 'Partition Host Metrics',
};

export function createWidgetFilterItem(
	key: string,
	value: string,
): TagFilterItem {
	const id = `${key}--string--tag--false`;

	return {
		id: uuid(),
		key: {
			key,
			dataType: DataTypes.String,
			type: 'tag',
			isColumn: false,
			isJSON: false,
			id,
		},
		op: '=',
		value,
	};
}

export function getFiltersFromConfigOptions(
	consumerGrp?: string,
	topic?: string,
	partition?: string,
): TagFilterItem[] {
	const configOptions = [
		{ key: 'group', values: consumerGrp?.split(',') },
		{ key: 'topic', values: topic?.split(',') },
		{ key: 'partition', values: partition?.split(',') },
	];
	return configOptions.reduce<TagFilterItem[]>(
		(accumulator, { key, values }) => {
			if (values && !isEmpty(values.filter((item) => item !== ''))) {
				accumulator.push(
					...values.map((value) => createWidgetFilterItem(key, value)),
				);
			}
			return accumulator;
		},
		[],
	);
}

export function getWidgetQuery({
	filterItems,
}: {
	filterItems: TagFilterItem[];
}): GetWidgetQueryBuilderProps {
	return {
		title: 'Consumer Lag',
		panelTypes: PANEL_TYPES.TIME_SERIES,
		fillSpans: false,
		yAxisUnit: 'none',
		query: {
			queryType: EQueryType.QUERY_BUILDER,
			promql: [],
			builder: {
				queryData: [
					{
						aggregateAttribute: {
							dataType: DataTypes.Float64,
							id: 'kafka_consumer_group_lag--float64--Gauge--true',
							isColumn: true,
							isJSON: false,
							key: 'kafka_consumer_group_lag',
							type: 'Gauge',
						},
						aggregateOperator: 'max',
						dataSource: DataSource.METRICS,
						disabled: false,
						expression: 'A',
						filters: {
							items: filterItems || [],
							op: 'AND',
						},
						functions: [],
						groupBy: [
							{
								dataType: DataTypes.String,
								id: 'group--string--tag--false',
								isColumn: false,
								isJSON: false,
								key: 'group',
								type: 'tag',
							},
							{
								dataType: DataTypes.String,
								id: 'topic--string--tag--false',
								isColumn: false,
								isJSON: false,
								key: 'topic',
								type: 'tag',
							},
							{
								dataType: DataTypes.String,
								id: 'partition--string--tag--false',
								isColumn: false,
								isJSON: false,
								key: 'partition',
								type: 'tag',
							},
						],
						having: [],
						legend: '{{group}}-{{topic}}-{{partition}}',
						limit: null,
						orderBy: [],
						queryName: 'A',
						reduceTo: 'avg',
						spaceAggregation: 'avg',
						stepInterval: 60,
						timeAggregation: 'max',
					},
				],
				queryFormulas: [],
			},
			clickhouse_sql: [],
			id: uuid(),
		},
	};
}

export const convertToNanoseconds = (timestamp: number): bigint =>
	BigInt((timestamp * 1e9).toFixed(0));

export const getStartAndEndTimesInMilliseconds = (
	timestamp: number,
): { start: number; end: number } => {
	const FIVE_MINUTES_IN_MILLISECONDS = 5 * 60 * 1000; // 5 minutes in milliseconds - check with Shivanshu once

	const start = Math.floor(timestamp);
	const end = Math.floor(start + FIVE_MINUTES_IN_MILLISECONDS);

	return { start, end };
};

export interface SelectedTimelineQuery {
	group?: string;
	partition?: string;
	topic?: string;
	start?: number;
	end?: number;
}

export function setSelectedTimelineQuery(
	urlQuery: URLSearchParams,
	timestamp: number,
	location: Location<unknown>,
	history: History<unknown>,
	data?: {
		[key: string]: string;
	},
): void {
	const selectedTimelineQuery: SelectedTimelineQuery = {
		group: data?.group,
		partition: data?.partition,
		topic: data?.topic,
		...getStartAndEndTimesInMilliseconds(timestamp),
	};
	urlQuery.set(
		QueryParams.selectedTimelineQuery,
		encodeURIComponent(JSON.stringify(selectedTimelineQuery)),
	);
	const generatedUrl = `${location.pathname}?${urlQuery.toString()}`;
	history.replace(generatedUrl);
}

export const MessagingQueuesViewType = {
	consumerLag: {
		label: 'Consumer Lag view',
		value: 'consumerLag',
	},
	partitionLatency: {
		label: 'Partition Latency view',
		value: 'partitionLatency',
	},
	producerLatency: {
		label: 'Producer Latency view',
		value: 'producerLatency',
	},
	consumerLatency: {
		label: 'Consumer latency view',
		value: 'consumerLatency',
	},
};
