/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import type { MessagingQueuesPayloadProps } from 'api/messagingQueues/getConsumerLagDetails';
import type { Time } from 'container/TopNav/DateTimeSelectionV2/types';
import type { AppState } from 'store/reducers';
import type { Column } from 'types/api/widgets/getQuery';

export const RELATIVE_TIME: Time = '30m';

const THIRTY_MINUTES_IN_MS = 30 * 60 * 1000;

const NANOSECONDS_IN_MS = 1_000_000;

/**
 * `globalTime` defaults its window from `window.location.pathname`, which in a
 * story is the preview's rather than the page's, so the time picker (reading the
 * route) and the queries (reading the store) would ask for different ranges and
 * a chart would draw a range narrower than its own axis.
 */
export const timeRangeState = (): Partial<AppState> => {
	const now = Date.now();

	return {
		globalTime: {
			minTime: (now - THIRTY_MINUTES_IN_MS) * NANOSECONDS_IN_MS,
			maxTime: now * NANOSECONDS_IN_MS,
			loading: false,
			selectedTime: RELATIVE_TIME,
			isAutoRefreshDisabled: false,
			selectedAutoRefreshInterval: '',
		},
	};
};

export const CONSUMER_GROUPS = [
	'orders-consumer',
	'payments-consumer',
	'shipping-consumer',
	'analytics-consumer',
];

export const TOPICS = [
	'order-events',
	'payment-events',
	'shipment-events',
	'audit-log',
];

export const PARTITIONS = ['0', '1', '2', '3'];

export const KAFKA_SERVICES = [
	'checkout-api',
	'payments-worker',
	'shipping-worker',
	'notification-worker',
];

const CELERY_TASKS = [
	'billing.tasks.charge_customer',
	'emails.tasks.send_welcome',
	'reports.tasks.rebuild_daily',
	'media.tasks.transcode',
];

const CELERY_WORKERS = ['worker-a', 'worker-b', 'worker-c'];

/**
 * Values per attribute key. The kafka config selects and the celery filter rows
 * all read `/fields/values`, so one map answers for all of them; a key nobody
 * seeded answers empty rather than 501.
 */
const ATTRIBUTE_VALUES: Record<string, string[]> = {
	group: CONSUMER_GROUPS,
	topic: TOPICS,
	partition: PARTITIONS,
	'service.name': KAFKA_SERVICES,
	name: [
		'order-events send',
		'order-events process',
		'payment-events send',
		'payment-events process',
	],
	'messaging.system': ['kafka', 'celery', 'rabbitmq'],
	'messaging.destination.name': TOPICS,
	'messaging.destination': TOPICS,
	kind_string: ['Producer', 'Consumer', 'Client', 'Server'],
	'celery.task_name': CELERY_TASKS,
	worker: CELERY_WORKERS,
};

const matching = (values: string[], searchText: string): string[] =>
	searchText
		? values.filter((value) =>
				value.toLowerCase().includes(searchText.toLowerCase()),
			)
		: values;

export const attributeValues = (
	attributeKey: string,
	searchText: string,
): string[] => matching(ATTRIBUTE_VALUES[attributeKey] ?? [], searchText);

/**
 * The kafka detail tables all answer on this one shape: a single result whose
 * `table` carries the columns the page turns into headers and the rows it
 * renders. `isValueColumn` is what tells a metric column from a grouping one.
 */
export const kafkaTableResponse = (
	columnNames: string[],
	rows: Array<Record<string, string>>,
	valueColumns: string[] = [],
): { status: string; data: MessagingQueuesPayloadProps['payload'] } => {
	const columns: Column[] = columnNames.map((name) => ({
		name,
		queryName: name,
		isValueColumn: valueColumns.includes(name),
	}));

	return {
		status: 'success',
		data: {
			resultType: 'table',
			result: [{ table: { columns, rows: rows.map((data) => ({ data })) } }],
		},
	};
};

/**
 * A metric value derived from the row index rather than random, so a refetch
 * redraws the same table.
 */
export const seeded = (index: number, base: number, spread: number): number =>
	Number((base + (spread * ((index * 37) % 100)) / 100).toFixed(2));

/** Values a group-by key is given, so a legend reads like the real one. */
export const LABEL_VALUES: Record<string, string[]> = {
	group: CONSUMER_GROUPS,
	topic: TOPICS,
	partition: PARTITIONS,
	service_name: KAFKA_SERVICES,
	'service.name': KAFKA_SERVICES,
	'celery.task_name': CELERY_TASKS,
	'celery.state': ['SUCCESS', 'RETRY', 'FAILURE'],
	'celery.hostname': CELERY_WORKERS.map((worker) => `celery@${worker}`),
	worker: CELERY_WORKERS,
	'messaging.destination.name': TOPICS,
	'messaging.system': ['kafka', 'celery'],
	kind_string: ['Producer', 'Consumer'],
};
