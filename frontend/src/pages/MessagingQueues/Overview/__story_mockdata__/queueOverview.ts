/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { PANEL_TYPES } from 'constants/queryBuilder';
import type { QueryRangePayload } from 'types/api/metrics/getQueryRange';
import type { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';

import {
	type QueryRangeV3Body,
	queryRangeV3TimeSeriesResponse,
	v3Series,
} from '@/storybook/msw/__story_mockdata__/queryRange';

import {
	KAFKA_SERVICES,
	seeded,
	TOPICS,
} from '../../__story_mockdata__/messagingQueues';

export const MESSAGING_SYSTEMS = ['mixed', 'celery', 'kafka'] as const;

export type MessagingSystemFilter = (typeof MESSAGING_SYSTEMS)[number];

const CELERY_SERVICES = [
	'billing-worker',
	'email-worker',
	'reports-worker',
	'media-worker',
];

const CELERY_QUEUES = ['billing', 'emails', 'reports', 'media'];

const CELERY_TASKS = [
	'billing.charge_customer',
	'emails.send_welcome',
	'reports.rebuild_daily',
	'media.transcode',
];

/** A span's kind follows what it does, the way the instrumentation sets it. */
const KAFKA_OPERATIONS = [
	{ name: 'publish', kind: 'Producer' },
	{ name: 'process', kind: 'Consumer' },
	{ name: 'receive', kind: 'Consumer' },
];

const CELERY_OPERATIONS = [
	{ name: 'run', kind: 'Consumer' },
	{ name: 'apply_async', kind: 'Producer' },
];

interface QueueRow {
	service: string;
	span: string;
	system: string;
	destination: string;
	kind: string;
}

const cycle = <T>(pool: T[], index: number): T => pool[index % pool.length];

/**
 * A queue is a service, a span and a destination together, so the pools are
 * walked at different rates: on `index % length` alone every fifth row would
 * repeat the first.
 */
const kafkaRow = (index: number): QueueRow => {
	const topic = cycle(TOPICS, index);
	const operation = cycle(KAFKA_OPERATIONS, Math.floor(index / TOPICS.length));

	return {
		service: cycle(KAFKA_SERVICES, index + Math.floor(index / TOPICS.length)),
		span: `${topic} ${operation.name}`,
		system: 'kafka',
		destination: topic,
		kind: operation.kind,
	};
};

const celeryRow = (index: number): QueueRow => {
	const operation = cycle(
		CELERY_OPERATIONS,
		Math.floor(index / CELERY_QUEUES.length),
	);

	return {
		service: cycle(
			CELERY_SERVICES,
			index + Math.floor(index / CELERY_QUEUES.length),
		),
		span: `${operation.name}/${cycle(CELERY_TASKS, index)}`,
		system: 'celery',
		destination: cycle(CELERY_QUEUES, index),
		kind: operation.kind,
	};
};

const rowFor = (index: number, system: MessagingSystemFilter): QueueRow => {
	if (system === 'celery') {
		return celeryRow(index);
	}

	if (system === 'kafka') {
		return kafkaRow(index);
	}

	return index % 2 === 0 ? kafkaRow(index / 2) : celeryRow((index - 1) / 2);
};

/**
 * The error column is a progress bar the page colours at 60% and 90%, so a
 * failing workspace has to push some rows past both thresholds rather than
 * raise every row a little.
 */
const errorPercentage = (index: number, failing: boolean): number => {
	if (!failing) {
		return seeded(index, 0, 4);
	}

	return index % 3 === 0 ? seeded(index, 60, 40) : seeded(index, 5, 45);
};

/**
 * `QueueOverviewResponse` declares each entry's `data` as an array of column
 * objects, but `getTableData` indexes it as a single object and casts the key to
 * get past the compiler, so the builder follows what the page reads.
 */
export interface QueueOverviewEntry {
	timestamp: string;
	data: {
		service_name: string;
		span_name: string;
		messaging_system: string;
		destination: string;
		kind_string: string;
		error_percentage: number;
		p95_latency: number;
		throughput: number;
	};
}

export const queueOverviewResponse = (
	count: number,
	system: MessagingSystemFilter,
	failing: boolean,
	timestamp: number,
): QueueOverviewEntry[] =>
	Array.from({ length: count }, (_unused, index) => {
		const row = rowFor(index, system);

		return {
			timestamp: new Date(timestamp).toISOString(),
			data: {
				service_name: row.service,
				span_name: row.span,
				messaging_system: row.system,
				destination: row.destination,
				kind_string: row.kind,
				error_percentage: errorPercentage(index, failing),
				p95_latency: seeded(index, 80, 900),
				throughput: seeded(index, 5, 120),
			},
		};
	});

/**
 * The three tiles at the top of the detail panel are three `VALUE` requests that
 * differ only by what they aggregate, so they are told apart the way the
 * backend would: the error tile filters on `has_error`, the latency tile
 * aggregates `duration_nano`, and what is left is the request rate.
 */
export const overviewValueResponse = (
	body: QueryRangePayload,
	failing: boolean,
): QueryRangeV3Body | null => {
	if (body.compositeQuery.panelType !== PANEL_TYPES.VALUE) {
		return null;
	}

	const [query] = Object.values(
		body.compositeQuery.builderQueries ?? {},
	) as IBuilderQuery[];

	const isError = (query?.filters?.items ?? []).some(
		(item) => item.key?.key === 'has_error',
	);
	const isLatency = query?.aggregateAttribute?.key === 'duration_nano';

	const errorRate = failing ? 63.4 : 2.4;
	// The tile divides by 1e6 to label itself in ms.
	const latencyNs = 148 * 1e6;

	return queryRangeV3TimeSeriesResponse([
		{
			queryName: query?.queryName ?? 'A',
			series: [
				v3Series({}, [
					{
						timestamp: body.end,
						value: String(isError ? errorRate : isLatency ? latencyNs : 42.6),
					},
				]),
			],
		},
	]);
};
