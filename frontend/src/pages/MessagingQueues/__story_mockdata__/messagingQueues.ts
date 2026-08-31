/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import type { MessagingQueuesPayloadProps } from 'api/messagingQueues/getConsumerLagDetails';
import { PANEL_TYPES } from 'constants/queryBuilder';
import type { Time } from 'container/TopNav/DateTimeSelectionV2/types';
import type { AppState } from 'store/reducers';
import type { QueryRangePayload } from 'types/api/metrics/getQueryRange';
import type { IAttributeValuesResponse } from 'types/api/queryBuilder/getAttributesValues';
import type {
	IBuilderFormula,
	IBuilderQuery,
} from 'types/api/queryBuilder/queryBuilderData';
import type { Column } from 'types/api/widgets/getQuery';

import {
	type QueryRangeV3Body,
	queryRangeV3TimeSeriesResponse,
	v3Series,
	v3TimeSeriesValues,
} from '@/storybook/msw/__story_mockdata__/queryRange';

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
 * Values per autocomplete attribute key. The kafka config selects and both
 * celery filter rows read the same v3 endpoint, so one map answers for all of
 * them; a key nobody seeded answers empty rather than 501.
 */
const ATTRIBUTE_VALUES: Record<string, string[]> = {
	group: CONSUMER_GROUPS,
	topic: TOPICS,
	partition: PARTITIONS,
	serviceName: KAFKA_SERVICES,
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

export const attributeValuesResponse = (
	attributeKey: string,
	searchText: string,
): { status: string; data: IAttributeValuesResponse } => ({
	status: 'success',
	data: {
		stringAttributeValues: matching(
			ATTRIBUTE_VALUES[attributeKey] ?? [],
			searchText,
		),
		numberAttributeValues: null,
		boolAttributeValues: null,
	},
});

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
const LABEL_VALUES: Record<string, string[]> = {
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

const labelValue = (key: string, index: number): string => {
	const pool = LABEL_VALUES[key];

	return pool ? pool[index % pool.length] : `${key}-${index + 1}`;
};

const groupByKeys = (query: IBuilderQuery | IBuilderFormula): string[] =>
	'groupBy' in query
		? (query.groupBy ?? []).map((attribute) => attribute.key)
		: [];

/**
 * Every widget on these pages is a builder query the backend answers per
 * `queryName`, so the response is derived from the request rather than written
 * per widget: one series per group-by combination the query asked for, and a
 * plain series when it grouped by nothing.
 */
export const builderTimeSeriesResponse = (
	body: QueryRangePayload,
	seriesCount: number,
): QueryRangeV3Body => {
	const { start, end } = body;
	const queries = Object.values(body.compositeQuery.builderQueries ?? {});
	const isValue = body.compositeQuery.panelType === PANEL_TYPES.VALUE;

	return queryRangeV3TimeSeriesResponse(
		queries
			.filter((query) => !query.disabled)
			.map((query, queryIndex) => {
				const keys = groupByKeys(query);
				// A single number, or a query that grouped by nothing, is one series.
				const seriesCountForQuery =
					isValue || !keys.length ? Math.min(seriesCount, 1) : seriesCount;

				return {
					queryName: query.queryName,
					legend: query.legend,
					series: Array.from(
						{ length: seriesCountForQuery },
						(_unused, seriesIndex) =>
							v3Series(
								Object.fromEntries(
									keys.map((key) => [key, labelValue(key, seriesIndex)]),
								),
								v3TimeSeriesValues({
									start,
									end,
									points: isValue ? 1 : 30,
									base: 40 + queryIndex * 15 + seriesIndex * 8,
									amplitude: 12 + seriesIndex * 3,
									seed: queryIndex * 5 + seriesIndex,
								}),
							),
					),
				};
			}),
	);
};

/**
 * The table spelling of the same request: the group-by keys become the leading
 * columns and each query contributes one value column, which is what
 * `GridTableComponent` builds its headers from.
 */
export const builderTableResponse = (
	body: QueryRangePayload,
	rowCount: number,
): QueryRangeV3Body => {
	const queries = Object.values(body.compositeQuery.builderQueries ?? {}).filter(
		(query) => !query.disabled,
	);
	const keys = [...new Set(queries.flatMap(groupByKeys))];

	const columns: Column[] = [
		...keys.map((name) => ({ name, queryName: '', isValueColumn: false })),
		...queries.map((query) => ({
			name: query.queryName,
			queryName: query.queryName,
			isValueColumn: true,
		})),
	];

	const rows = Array.from({ length: rowCount }, (_unused, index) => ({
		data: {
			...Object.fromEntries(keys.map((key) => [key, labelValue(key, index)])),
			...Object.fromEntries(
				queries.map((query, queryIndex) => [
					query.queryName,
					seeded(index + queryIndex, 20 + queryIndex * 30, 60),
				]),
			),
		},
	}));

	return {
		status: 'success',
		data: {
			resultType: 'table',
			result: [
				{ queryName: 'A', series: null, list: null, table: { columns, rows } },
			],
		},
	};
};

/** What the graph-bearing tabs answer `query_range` with, panel type decides. */
export const queryRangeV3ForRequest = (
	body: QueryRangePayload,
	count: number,
): QueryRangeV3Body =>
	body.compositeQuery.panelType === PANEL_TYPES.TABLE
		? builderTableResponse(body, count)
		: builderTimeSeriesResponse(body, count);
