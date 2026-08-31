/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import type { MessagingQueuesPayloadProps } from 'api/messagingQueues/getConsumerLagDetails';
import { QueryParams } from 'constants/query';
import ROUTES from 'constants/routes';
import type { DropRateAPIResponse } from 'pages/MessagingQueues/MQDetails/DropRateView/dropRateViewUtils';
import {
	MessagingQueueServiceDetailType,
	MessagingQueuesViewTypeOptions,
} from 'pages/MessagingQueues/MessagingQueuesUtils';

import {
	CONSUMER_GROUPS,
	KAFKA_SERVICES,
	kafkaTableResponse,
	PARTITIONS,
	RELATIVE_TIME,
	seeded,
	TOPICS,
} from '../../__story_mockdata__/messagingQueues';

export const KAFKA_VIEWS = [
	MessagingQueuesViewTypeOptions.ConsumerLag,
	MessagingQueuesViewTypeOptions.PartitionLatency,
	MessagingQueuesViewTypeOptions.ProducerLatency,
	MessagingQueuesViewTypeOptions.DropRate,
	MessagingQueuesViewTypeOptions.MetricPage,
] as const;

/** The row the details tables render for, as the page writes it on a click. */
const SELECTED_TIMELINE = {
	group: CONSUMER_GROUPS[0],
	topic: TOPICS[0],
	partition: PARTITIONS[0],
};

const SELECTED_PARTITION = {
	topic: TOPICS[0],
	partition: PARTITIONS[0],
};

const SELECTED_PRODUCER = {
	topic: TOPICS[0],
	service_name: KAFKA_SERVICES[0],
};

/**
 * `setConfigDetail` and `setSelectedTimelineQuery` both write their JSON through
 * `encodeURIComponent` before `URLSearchParams` encodes it again, and the page
 * decodes twice on the way back, so a route that seeds a selection has to carry
 * the same double encoding.
 */
const selectionParam = (value: unknown): string =>
	encodeURIComponent(JSON.stringify(value));

const FIVE_MINUTES_IN_MS = 5 * 60 * 1000;

const timelineSelection = (): string => {
	const now = Date.now();

	return selectionParam({
		...SELECTED_TIMELINE,
		start: now - FIVE_MINUTES_IN_MS,
		end: now,
	});
};

export const kafkaDetailRoute = (
	view: MessagingQueuesViewTypeOptions,
	selected: boolean,
): string => {
	const params = new URLSearchParams({
		[QueryParams.mqServiceView]: view,
		[QueryParams.relativeTime]: RELATIVE_TIME,
	});

	if (selected && view === MessagingQueuesViewTypeOptions.ConsumerLag) {
		params.set(QueryParams.selectedTimelineQuery, timelineSelection());
	}

	if (selected && view === MessagingQueuesViewTypeOptions.PartitionLatency) {
		params.set(QueryParams.configDetail, selectionParam(SELECTED_PARTITION));
	}

	if (selected && view === MessagingQueuesViewTypeOptions.ProducerLatency) {
		params.set(QueryParams.configDetail, selectionParam(SELECTED_PRODUCER));
	}

	return `${ROUTES.MESSAGING_QUEUES_KAFKA_DETAIL}?${params.toString()}`;
};

type KafkaTable = {
	status: string;
	data: MessagingQueuesPayloadProps['payload'];
};

const rowsOf = (
	count: number,
	build: (index: number) => Record<string, string>,
): Array<Record<string, string>> =>
	Array.from({ length: count }, (_u, i) => build(i));

const metric = (index: number, base: number, spread: number): string =>
	String(seeded(index, base, spread));

const serviceRows = (
	count: number,
	offset = 0,
): Array<Record<string, string>> =>
	rowsOf(count, (index) => ({
		service_name: KAFKA_SERVICES[(index + offset) % KAFKA_SERVICES.length],
		p99: metric(index, 120, 400),
		error_rate: metric(index, 0, 12),
		throughput: metric(index, 30, 250),
	}));

/** The three tabs under the consumer lag graph, each on its own detail type. */
export const consumerLagDetails = (
	detailType: string,
	count: number,
): KafkaTable => {
	if (detailType === MessagingQueueServiceDetailType.NetworkLatency) {
		return kafkaTableResponse(
			[
				'consumer_service',
				'service_instance_id',
				'client_id',
				'p99',
				'throughput',
			],
			rowsOf(count, (index) => ({
				consumer_service: KAFKA_SERVICES[index % KAFKA_SERVICES.length],
				service_instance_id: `instance-${index % 4}`,
				client_id: `${CONSUMER_GROUPS[index % CONSUMER_GROUPS.length]}-${index % 3}`,
				p99: metric(index, 90, 320),
				throughput: metric(index, 20, 180),
			})),
			['p99', 'throughput'],
		);
	}

	const isConsumer =
		detailType === MessagingQueueServiceDetailType.ConsumerDetails;

	return kafkaTableResponse(
		isConsumer
			? ['service_name', 'p99', 'error_rate', 'throughput', 'avg_msg_size']
			: ['service_name', 'p99', 'error_rate', 'throughput'],
		serviceRows(count, isConsumer ? 1 : 0).map((row, index) =>
			isConsumer ? { ...row, avg_msg_size: metric(index, 400, 2400) } : row,
		),
		['p99', 'error_rate', 'throughput', 'avg_msg_size'],
	);
};

/** The partition latency overview, whose rows carry the topic and partition
 * the details tables below it need. */
export const partitionLatencyOverview = (count: number): KafkaTable =>
	kafkaTableResponse(
		['topic', 'partition', 'p99', 'error_rate', 'throughput'],
		rowsOf(count, (index) => ({
			topic: TOPICS[index % TOPICS.length],
			partition: PARTITIONS[index % PARTITIONS.length],
			p99: metric(index, 150, 380),
			error_rate: metric(index, 0, 9),
			throughput: metric(index, 40, 300),
		})),
		['p99', 'error_rate', 'throughput'],
	);

export const partitionLatencyDetails = (count: number): KafkaTable =>
	kafkaTableResponse(
		['service_name', 'p99', 'error_rate', 'throughput'],
		serviceRows(count),
		['p99', 'error_rate', 'throughput'],
	);

/**
 * The producer side of the topic throughput overview answers two tables: the
 * page merges `byte_rate` from the second onto the first, keyed by
 * `service_name--topic`, and renders it as a column the first table never had.
 */
export const topicThroughputOverview = (
	detailType: string,
	count: number,
): KafkaTable => {
	const rows = rowsOf(count, (index) => ({
		service_name: KAFKA_SERVICES[index % KAFKA_SERVICES.length],
		topic: TOPICS[index % TOPICS.length],
		p99: metric(index, 110, 360),
		error_rate: metric(index, 0, 7),
		throughput: metric(index, 25, 210),
		ingestion_rate: metric(index, 500, 4200),
	}));

	const overview = kafkaTableResponse(
		[
			'service_name',
			'topic',
			'p99',
			'error_rate',
			'throughput',
			'ingestion_rate',
		],
		rows,
		['p99', 'error_rate', 'throughput', 'ingestion_rate'],
	);

	if (detailType !== 'producer') {
		return overview;
	}

	const byteRate = kafkaTableResponse(
		['service_name', 'topic', 'byte_rate'],
		rows.map((row, index) => ({
			service_name: row.service_name,
			topic: row.topic,
			byte_rate: metric(index, 1200, 8600),
		})),
		['byte_rate'],
	);

	return {
		status: 'success',
		data: {
			resultType: 'table',
			result: [...overview.data.result, ...byteRate.data.result],
		},
	};
};

export const topicThroughputDetails = (count: number): KafkaTable =>
	kafkaTableResponse(
		['service_name', 'p99', 'error_rate', 'throughput'],
		serviceRows(count, 2),
		['p99', 'error_rate', 'throughput'],
	);

/** Trace ids the drop rate table lists four at a time behind a "+ n more". */
const traceIds = (index: number): string[] =>
	Array.from({ length: 7 }, (_u, position) => {
		const seed = (index + 1) * 977 + position * 31;

		return Array.from({ length: 4 }, (_v, chunk) =>
			((seed * (chunk + 7) * 0x1f123bb5) % 0xffffffff)
				.toString(16)
				.padStart(8, '0')
				.slice(-8),
		).join('');
	});

export const spanEvaluationResponse = (
	count: number,
	timestamp: number,
): DropRateAPIResponse['data'] => ({
	resultType: 'list',
	result: [
		{
			queryName: 'A',
			list: Array.from({ length: count }, (_u, index) => ({
				timestamp: new Date(timestamp).toISOString(),
				data: {
					producer_service: KAFKA_SERVICES[index % KAFKA_SERVICES.length],
					consumer_service: KAFKA_SERVICES[(index + 1) % KAFKA_SERVICES.length],
					breach_percentage: seeded(index, 0, 45),
					breached_spans: 40 + index * 13,
					total_spans: 4000 + index * 317,
					top_traceIDs: traceIds(index),
				},
			})),
		},
	],
});
