import {
	getConsumerLagDetails,
	MessagingQueueServicePayload,
	MessagingQueuesPayloadProps,
} from 'api/messagingQueues/getConsumerLagDetails';
import { getPartitionLatencyDetails } from 'api/messagingQueues/getPartitionLatencyDetails';
import { getTopicThroughputDetails } from 'api/messagingQueues/getTopicThroughputDetails';
import { OnboardingStatusResponse } from 'api/messagingQueues/onboarding/getOnboardingStatus';
import { QueryParams } from 'constants/query';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { GetWidgetQueryBuilderProps } from 'container/MetricsApplication/types';
import { History, Location } from 'history';
import { isEmpty } from 'lodash-es';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { TagFilterItem } from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';
import { DataSource } from 'types/common/queryBuilder';
import { v4 as uuid } from 'uuid';

export const KAFKA_SETUP_DOC_LINK =
	'https://signoz.io/docs/messaging-queues/kafka?utm_source=product&utm_medium=kafka-get-started';

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

export enum MessagingQueueServiceDetailType {
	ConsumerDetails = 'consumer-details',
	ProducerDetails = 'producer-details',
	NetworkLatency = 'network-latency',
	PartitionHostMetrics = 'partition-host-metric',
}

export const ConsumerLagDetailTitle: Record<
	MessagingQueueServiceDetailType,
	string
> = {
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
	const FIVE_MINUTES_IN_MILLISECONDS = 5 * 60 * 1000; // 300,000 milliseconds

	const pointInTime = Math.floor(timestamp * 1000);

	// Convert timestamp to milliseconds and floor it
	const start = Math.floor(pointInTime - FIVE_MINUTES_IN_MILLISECONDS);
	const end = Math.floor(pointInTime + FIVE_MINUTES_IN_MILLISECONDS);

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

export enum MessagingQueuesViewTypeOptions {
	ConsumerLag = 'consumerLag',
	PartitionLatency = 'partitionLatency',
	ProducerLatency = 'producerLatency',
	DropRate = 'dropRate',
	MetricPage = 'metricPage',
}

export const MessagingQueuesViewType = {
	consumerLag: {
		label: 'Consumer Lag view',
		value: MessagingQueuesViewTypeOptions.ConsumerLag,
	},
	partitionLatency: {
		label: 'Partition Latency view',
		value: MessagingQueuesViewTypeOptions.PartitionLatency,
	},
	producerLatency: {
		label: 'Producer Latency view',
		value: MessagingQueuesViewTypeOptions.ProducerLatency,
	},
	dropRate: {
		label: 'Drop Rate view',
		value: MessagingQueuesViewTypeOptions.DropRate,
	},
	metricPage: {
		label: 'Metric view',
		value: MessagingQueuesViewTypeOptions.MetricPage,
	},
};

export function setConfigDetail(
	urlQuery: URLSearchParams,
	location: Location<unknown>,
	history: History<unknown>,
	paramsToSet?: {
		[key: string]: string;
	},
): void {
	// remove "key" and its value from the paramsToSet object
	const { key, ...restParamsToSet } = paramsToSet || {};

	if (!isEmpty(restParamsToSet)) {
		const configDetail = {
			...restParamsToSet,
		};
		urlQuery.set(
			QueryParams.configDetail,
			encodeURIComponent(JSON.stringify(configDetail)),
		);
	} else {
		urlQuery.delete(QueryParams.configDetail);
	}
	const generatedUrl = `${location.pathname}?${urlQuery.toString()}`;
	history.replace(generatedUrl);
}

export enum ProducerLatencyOptions {
	Producers = 'Producers',
	Consumers = 'Consumers',
}

interface MetaDataAndAPI {
	tableApiPayload: MessagingQueueServicePayload;
	tableApi: (
		props: MessagingQueueServicePayload,
	) => Promise<
		SuccessResponse<MessagingQueuesPayloadProps['payload']> | ErrorResponse
	>;
}
interface MetaDataAndAPIPerView {
	detailType: MessagingQueueServiceDetailType;
	selectedTimelineQuery: SelectedTimelineQuery;
	configDetails?: {
		[key: string]: string;
	};
	minTime: number;
	maxTime: number;
}

export const getMetaDataAndAPIPerView = (
	metaDataProps: MetaDataAndAPIPerView,
): Record<string, MetaDataAndAPI> => {
	const {
		detailType,
		minTime,
		maxTime,
		selectedTimelineQuery,
		configDetails,
	} = metaDataProps;
	return {
		[MessagingQueuesViewType.consumerLag.value]: {
			tableApiPayload: {
				start: (selectedTimelineQuery?.start || 0) * 1e6,
				end: (selectedTimelineQuery?.end || 0) * 1e6,
				variables: {
					partition: selectedTimelineQuery?.partition,
					topic: selectedTimelineQuery?.topic,
					consumer_group: selectedTimelineQuery?.group,
				},
				detailType,
			},
			tableApi: getConsumerLagDetails,
		},
		[MessagingQueuesViewType.partitionLatency.value]: {
			tableApiPayload: {
				start: minTime,
				end: maxTime,
				variables: {
					partition: configDetails?.partition,
					topic: configDetails?.topic,
					consumer_group: configDetails?.group,
				},
				detailType,
			},
			tableApi: getPartitionLatencyDetails,
		},
		[MessagingQueuesViewType.producerLatency.value]: {
			tableApiPayload: {
				start: minTime,
				end: maxTime,
				variables: {
					partition: configDetails?.partition,
					topic: configDetails?.topic,
					service_name: configDetails?.service_name,
				},
				detailType,
			},
			tableApi: getTopicThroughputDetails,
		},
	};
};

interface OnboardingStatusAttributeData {
	overallStatus: string;
	allAvailableAttributes: string[];
	attributeDataWithError: { attributeName: string; errorMsg: string }[];
}

export const getAttributeDataFromOnboardingStatus = (
	onboardingStatus?: OnboardingStatusResponse | null,
): OnboardingStatusAttributeData => {
	const allAvailableAttributes: string[] = [];
	const attributeDataWithError: {
		attributeName: string;
		errorMsg: string;
	}[] = [];

	if (onboardingStatus?.data && !isEmpty(onboardingStatus?.data)) {
		onboardingStatus.data.forEach((status) => {
			if (status.attribute) {
				allAvailableAttributes.push(status.attribute);
				if (status.status === '0') {
					attributeDataWithError.push({
						attributeName: status.attribute,
						errorMsg: status.error_message || '',
					});
				}
			}
		});
	}

	return {
		overallStatus: attributeDataWithError.length ? 'error' : 'success',
		allAvailableAttributes,
		attributeDataWithError,
	};
};

export enum MessagingQueueHealthCheckService {
	Consumers = 'consumers',
	Producers = 'producers',
	Kafka = 'kafka',
}
