import { expect, type Locator, type Page } from '@playwright/test';

import { antdDriver } from './antd';
import {
	allowFor,
	driver,
	kit,
	seeded,
	SEEDED_DATA_TIMEOUT,
	SEEDED_TEST_BUDGET,
	type Layer,
	type WorkerLayer,
} from './kit';
import { celeryTask, kafkaPair, stamp, STATUS } from './spans';
import { postToSeeder } from './telemetry';
import { seedTracesViaSeeder } from './traces';

/**
 * Messaging queues: the overview (`/messaging-queues/overview`), the kafka page
 * and its detail views, and the celery task page.
 *
 * Every table on these pages fetches once on mount, so a seed that is not yet
 * queryable never shows up without a reload: {@link reloadUntilVisible}.
 */

const RELATIVE_TIME = '15m';
const LAG_METRIC = 'kafka.consumer_group.lag';

export type KafkaView =
	| 'consumerLag'
	| 'producerLatency'
	| 'partitionLatency'
	| 'dropRate'
	| 'metricPage';

export const KAFKA_VIEWS: KafkaView[] = [
	'consumerLag',
	'producerLatency',
	'partitionLatency',
	'dropRate',
	'metricPage',
];

export type DetailType = 'producer-details' | 'consumer-details';
export type CeleryState = 'all' | 'failed' | 'retry' | 'successful';

// ─── Seed ────────────────────────────────────────────────────────────────────

export interface MqSeed {
	stamp: string;
	topic: string;
	partition: string;
	group: string;
	producer: string;
	consumer: string;
	/** Kafka pairs seeded; one consumer span of them has status 2. */
	pairs: number;
	celeryService: string;
	task: string;
	/** The celery overview row's span name. */
	taskSpan: string;
	worker: string;
	/** Celery spans per state tab. */
	states: Record<CeleryState, number>;
}

const PAIRS = 3;

async function seedMessagingQueues(
	page: Page,
	workerIndex: number,
): Promise<MqSeed> {
	const prefix = stamp('mq', workerIndex);
	const seed: MqSeed = {
		stamp: prefix,
		topic: `${prefix}-orders`,
		partition: '0',
		group: `${prefix}-grp`,
		producer: `${prefix}-producer`,
		consumer: `${prefix}-consumer`,
		pairs: PAIRS,
		celeryService: `${prefix}-celery`,
		task: `${prefix}.send_email`,
		taskSpan: `run/${prefix}.send_email`,
		worker: `${prefix}-worker`,
		states: { all: 4, successful: 2, failed: 1, retry: 1 },
	};

	const kafka = Array.from({ length: PAIRS }, (_, i) =>
		kafkaPair({
			topic: seed.topic,
			partition: seed.partition,
			group: seed.group,
			producer: seed.producer,
			consumer: seed.consumer,
			consumerStatus: i === 0 ? STATUS.error : STATUS.ok,
			agoMs: 60_000 - i * 10_000,
		}),
	).flat();

	const now = Date.now();
	// The state tabs reduce a 60 s series to its last point, so every task has
	// to land in one minute bucket: the last complete one.
	const bucketStart = Math.floor(now / 60_000) * 60_000 - 60_000;
	const celery = (['SUCCESS', 'SUCCESS', 'FAILURE', 'RETRY'] as const).map(
		(state, i) =>
			celeryTask({
				service: seed.celeryService,
				task: seed.task,
				state,
				hostname: seed.worker,
				agoMs: now - (bucketStart + 5_000 + i * 1_000),
			}),
	);

	const lag = Array.from({ length: 10 }, (_, i) => ({
		metric_name: LAG_METRIC,
		labels: { group: seed.group, topic: seed.topic, partition: seed.partition },
		timestamp: new Date(now - 10 * 60_000 + i * 60_000 + 30_000).toISOString(),
		value: 5 + i,
		type_: 'Gauge',
		temporality: 'Unspecified',
		is_monotonic: false,
	}));

	await seedTracesViaSeeder(page.request, [...kafka, ...celery]);
	await postToSeeder(page.request, '/telemetry/metrics', lag);
	return seed;
}

/** Telemetry cannot be deleted per worker, so there is no teardown. */
export const withMqSeed: WorkerLayer<{ mqSeed: MqSeed }> = seeded(
	'mqSeed',
	({ page, workerIndex }) => seedMessagingQueues(page, workerIndex),
);

// ─── Driver ──────────────────────────────────────────────────────────────────

export interface MessagingQueues {
	gotoOverview(): Promise<void>;
	overviewTable(): Locator;
	overviewRow(service: string, span: string): Locator;
	/** Reload the overview until the row for `service` / `span` renders. */
	waitForOverviewRow(service: string, span: string): Promise<void>;
	openOverviewRow(service: string, span: string): Promise<void>;
	overviewDrawer(): Locator;
	overviewDrawerMetric(title: string): Locator;

	gotoKafka(): Promise<void>;
	viewDetailsButtons(): Locator;
	viewDetails(view: KafkaView): Promise<void>;
	openHealthCheck(): Promise<Locator>;
	healthCheckSection(name: 'Consumers' | 'Producers'): Locator;

	/** Deep link a detail view. `params` are extra query params. */
	gotoKafkaDetail(
		view: KafkaView,
		params?: Record<string, string>,
	): Promise<void>;
	/** Consumer-lag view scoped to one group/topic/partition, as a graph click leaves it. */
	gotoConsumerLagPoint(seed: MqSeed): Promise<void>;
	viewSelect(): Locator;
	table(type: 'overview' | 'detail'): Locator;
	dropRateTable(): Locator;
	/** Reload the current detail URL until `table` has a row containing `text`. */
	waitForTableRow(table: Locator, text: string): Promise<void>;
	/** A row of `table` containing `text`. */
	tableRow(table: Locator, text: string): Locator;
	tableHeader(table: Locator, name: string): Locator;
	producerLatencyToggle(): Locator;
	producerLatencyOption(option: 'Producers' | 'Consumers'): Locator;
	detailType(type: DetailType): Locator;
	consumerLagGraph(): Locator;
	consumerLagChart(): Locator;
	consumerLagNoData(): Locator;
	metricPage(): Locator;
	metricPageSection(title: string): Locator;

	gotoCelery(): Promise<void>;
	celeryGrid(): Locator;
	celeryGridSection(title: string): Locator;
	/** The first chart the grid draws. */
	celeryGridChart(): Locator;
	pickTask(name: string): Promise<void>;
	/** Deep link the page filtered to `task`, reloading until `state` reads `count`. */
	gotoCeleryTask(task: string, state: CeleryState, count: number): Promise<void>;
	celeryStateTab(state: CeleryState): Locator;
	selectCeleryState(state: CeleryState): Promise<void>;
}

export function messagingQueuesDriver(page: Page): MessagingQueues {
	const antd = antdDriver(page);

	/**
	 * `goto` and wait for `target`, reloading on a miss. Budgeted for ingestion,
	 * not render: the page fetches once, so a late row needs a new mount.
	 */
	const reloadUntilVisible = async (
		goto: () => Promise<void>,
		target: () => Locator,
		attempts = 5,
	): Promise<void> => {
		allowFor(SEEDED_TEST_BUDGET);
		for (let i = 0; i < attempts; i += 1) {
			// eslint-disable-next-line no-await-in-loop
			await goto();
			try {
				// eslint-disable-next-line no-await-in-loop
				await target().first().waitFor({ state: 'visible', timeout: 8_000 });
				return;
			} catch {
				// not ingested yet; remount
			}
		}
		await expect(target().first()).toBeVisible({ timeout: SEEDED_DATA_TIMEOUT });
	};

	const rowOf = (table: Locator, text: string): Locator =>
		table.locator('tbody tr').filter({ hasText: text });

	const mq: MessagingQueues = {
		gotoOverview: async () => {
			await page.goto(`/messaging-queues/overview?relativeTime=${RELATIVE_TIME}`);
			await expect(mq.overviewTable()).toBeVisible();
		},

		overviewTable: () => page.getByTestId('mq-overview-table'),

		overviewRow: (service, span) =>
			rowOf(mq.overviewTable(), service).filter({ hasText: span }),

		waitForOverviewRow: (service, span) =>
			reloadUntilVisible(
				() => mq.gotoOverview(),
				() => mq.overviewRow(service, span),
			),

		openOverviewRow: async (service, span) => {
			await mq.overviewRow(service, span).first().click();
			await expect(mq.overviewDrawer()).toBeVisible();
		},

		overviewDrawer: () => page.getByTestId('mq-overview-details-drawer'),
		overviewDrawerMetric: (title) =>
			mq.overviewDrawer().getByText(title, { exact: true }),

		gotoKafka: async () => {
			await page.goto(`/messaging-queues/kafka?relativeTime=${RELATIVE_TIME}`);
			await expect(page.getByTestId('mq-view-details-consumerLag')).toBeVisible();
		},

		viewDetailsButtons: () => page.locator('[data-testid^="mq-view-details-"]'),

		viewDetails: async (view) => {
			await page.getByTestId(`mq-view-details-${view}`).click();
			await expect(page).toHaveURL(new RegExp(`mqServiceView=${view}`));
		},

		openHealthCheck: async () => {
			// "Configuration", or "Missing Configuration (N)" when checks fail.
			await page.getByRole('button', { name: /Configuration/ }).click();
			const dialog = page.getByRole('dialog');
			await expect(dialog).toBeVisible();
			return dialog;
		},

		healthCheckSection: (name) =>
			page.getByRole('dialog').getByText(name, { exact: true }),

		gotoKafkaDetail: async (view, params = {}) => {
			const query = new URLSearchParams({
				mqServiceView: view,
				relativeTime: RELATIVE_TIME,
				...params,
			});
			await page.goto(`/messaging-queues/kafka/detail?${query.toString()}`);
			await expect(mq.viewSelect()).toBeVisible();
		},

		gotoConsumerLagPoint: async (seed) => {
			const now = Date.now();
			const timeline = {
				group: seed.group,
				topic: seed.topic,
				partition: seed.partition,
				start: now - 10 * 60_000,
				end: now,
			};
			// The app writes `encodeURIComponent(JSON)` into the param, so the value
			// carries one encoding beyond URLSearchParams' own.
			await mq.gotoKafkaDetail('consumerLag', {
				consumerGrp: seed.group,
				topic: seed.topic,
				selectedTimelineQuery: encodeURIComponent(JSON.stringify(timeline)),
			});
		},

		viewSelect: () => page.getByTestId('mq-view-select'),
		table: (type) => page.getByTestId(`mq-table-${type}`),
		dropRateTable: () => page.getByTestId('mq-drop-rate-table'),
		tableRow: rowOf,
		tableHeader: (table, name) => table.getByRole('columnheader', { name }),

		waitForTableRow: async (table, text) => {
			const url = page.url();
			await reloadUntilVisible(
				async () => {
					await page.goto(url);
				},
				() => rowOf(table, text),
			);
		},

		producerLatencyToggle: () => page.getByTestId('mq-producer-latency-toggle'),
		producerLatencyOption: (option) =>
			page.getByTestId(`mq-producer-latency-toggle-button-${option}`),
		detailType: (type) =>
			page.getByTestId(`mq-detail-type-toggle-button-${type}`),
		consumerLagGraph: () => page.getByTestId('mq-consumer-lag-graph'),
		consumerLagChart: () => mq.consumerLagGraph().locator('canvas').first(),
		consumerLagNoData: () =>
			mq.consumerLagGraph().getByText('No Data', { exact: true }),
		metricPage: () => page.getByTestId('mq-metric-page'),
		metricPageSection: (title) => mq.metricPage().getByText(title),

		gotoCelery: async () => {
			await page.goto(
				`/messaging-queues/celery-task?relativeTime=${RELATIVE_TIME}`,
			);
			await expect(mq.celeryGrid()).toBeVisible();
		},

		celeryGrid: () => page.getByTestId('celery-graph-grid'),
		celeryGridSection: (title) => mq.celeryGrid().getByText(title),
		celeryGridChart: () => mq.celeryGrid().locator('canvas').first(),

		pickTask: async (name) => {
			allowFor(SEEDED_TEST_BUDGET);
			await antd.pickByName(page.getByTestId('celery-task-name-select'), name);
			await expect(page).toHaveURL(/taskName=/);
		},

		gotoCeleryTask: async (task, state, count) => {
			const query = new URLSearchParams({
				taskName: task,
				relativeTime: RELATIVE_TIME,
			});
			// The tab's text is its label then its value, e.g. "Failed1".
			const reads = new RegExp(`\\D${count}$`);
			await reloadUntilVisible(
				async () => {
					await page.goto(`/messaging-queues/celery-task?${query.toString()}`);
				},
				() => mq.celeryStateTab(state).filter({ hasText: reads }),
			);
		},

		celeryStateTab: (state) => page.getByTestId(`celery-state-tab-${state}`),

		selectCeleryState: async (state) => {
			await mq.celeryStateTab(state).click();
			// The tab exposes its selection only through this BEM modifier.
			await expect(mq.celeryStateTab(state)).toHaveClass(
				/celery-task-states__tab--selected/,
			);
		},
	};

	return mq;
}

export const withMessagingQueues: Layer<{ mq: MessagingQueues }> = driver(
	'mq',
	({ page }) => messagingQueuesDriver(page),
);

/** The messaging-queues `test`. */
export const test = withMessagingQueues(withMqSeed(kit));
export { expect } from './kit';
