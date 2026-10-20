import type { Browser, Page, TestType } from '@playwright/test';

import { onAdminPage, seeded, type Layer, type WorkerLayer } from '../kit';

type Fixtures = Record<string, unknown>;

import {
	FIXTURE_ALERT_HISTORY_TIMEOUT,
	FIXTURE_ALERT_LIST_TIMEOUT,
	FIXTURE_EMPTY_HISTORY_TIMEOUT,
	FIXTURE_METRICS_HISTORY_TIMEOUT,
	FIXTURE_NODATA_HISTORY_TIMEOUT,
	FIXTURE_RESOLVED_HISTORY_TIMEOUT,
	FIXTURE_TRACES_HISTORY_TIMEOUT,
	WAIT_METRICS_TIMELINE_TIMEOUT,
	WAIT_NODATA_TIMELINE_TIMEOUT,
} from './timeouts';
import { alertsDriver } from './driver';

/**
 * Worker-scoped alert seeds.
 *
 * Every history row has to come from the ruler actually evaluating a rule —
 * there is no seeder endpoint for `rule_state_history_v0` — so each history seed
 * pays a real wait: ~20-35 s for logs, ~10 s for metrics, ~105 s for
 * firing→resolved. Worker scope means one wait per worker rather than one per
 * test, and Playwright builds fixtures lazily, so a spec that never asks for
 * `resolvedHistory` never pays its 105 s.
 *
 * Rules seeded here are **frozen** (disabled) as soon as their firing wave
 * lands. Rows are written on state change, so an active rule resolves once the
 * eval window rolls past the seeded records and doubles `total` mid-suite.
 */

/** Anything a seed teardown has to remove. */
interface Owned {
	ruleIds: string[];
	channelId: string;
}

async function drop(page: Page, { ruleIds, channelId }: Owned): Promise<void> {
	const { seed } = alertsDriver(page);
	await seed.deleteRules(ruleIds);
	await seed.deleteChannel(channelId);
}

// ─── Rules ───────────────────────────────────────────────────────────────────

export interface AlertChannelSeed {
	id: string;
	name: string;
}

/** Every rule payload references a channel by name; one serves the whole worker. */
export const withAlertChannel: WorkerLayer<{ alertChannel: AlertChannelSeed }> =
	seeded(
		'alertChannel',
		async ({ page, workerIndex }) =>
			alertsDriver(page).seed.channel(
				`e2e-alerts-ch-w${workerIndex}-${Date.now()}`,
			),
		async ({ page, value }) => alertsDriver(page).seed.deleteChannel(value.id),
	);

export interface AlertListSeed extends Owned {
	channelName: string;
	/** Rules are named `<namePrefix>-NN`, unique to this worker's batch. */
	namePrefix: string;
	/** Rules seeded ⇒ the `of N` total once the list is scoped to the prefix. */
	count: number;
	/** `team` label on the odd-indexed half of the batch, i.e. `count / 2` rules. */
	paymentsLabel: string;
}

/** 12 rules over page size 10 leaves a short second page for pagination. */
const LIST_SEED_COUNT = 12;

/**
 * A read-only batch of rules the list specs page, search and sort through. Names
 * and label values are stamped per worker so parallel batches never count each
 * other's rules.
 */
export const withAlertList: WorkerLayer<{ alertList: AlertListSeed }> = seeded(
	'alertList',
	async ({ page, workerIndex }) => {
		const { seed } = alertsDriver(page);
		const stamp = `w${workerIndex}-${Date.now()}`;
		const namePrefix = `e2e-alert-list-${stamp}`;
		const channel = await seed.channel(`e2e-alerts-ch-${stamp}`);
		const ruleIds = await seed.rules({
			count: LIST_SEED_COUNT,
			channelName: channel.name,
			namePrefix,
			teamSuffix: `-${stamp}`,
		});
		return {
			channelName: channel.name,
			namePrefix,
			count: LIST_SEED_COUNT,
			paymentsLabel: `payments-${stamp}`,
			ruleIds,
			channelId: channel.id,
		};
	},
	async ({ page, value }) => drop(page, value),
	{ timeout: FIXTURE_ALERT_LIST_TIMEOUT },
);

// ─── History ─────────────────────────────────────────────────────────────────

export interface AlertHistorySeed extends Owned {
	/** v2 (`schemaVersion: v2alpha1`) rule — the default history subject. */
	ruleId: string;
	/** Legacy v1 rule over the same logs. Its `threshold.name` is `warning`. */
	ruleIdV1: string;
	channelName: string;
	/** The `body CONTAINS` marker both rules match. */
	marker: string;
	services: string[];
	total: number;
	totalV1: number;
}

/** 25 services yields a multi-page timeline, which is what pagination needs. */
const LOGS_HISTORY_SERVICES = 25;
/** 3 services with a 1m window resolve in ~105 s. */
const RESOLVED_HISTORY_SERVICES = 3;
/** 2 hosts fit one page and carry no related-logs links. */
const METRICS_HISTORY_HOSTS = ['host-0', 'host-1'];
const TRACES_HISTORY_SERVICES = 3;

/** Team label for the v1 rule, so its header labels row is non-empty. */
export const V1_RULE_TEAM_LABEL = 'e2e-platform';

export const withAlertHistory: WorkerLayer<{ alertHistory: AlertHistorySeed }> =
	seeded(
		'alertHistory',
		async ({ page }) => {
			const { seed, history } = alertsDriver(page);
			const stamp = Date.now();
			const marker = `e2e alert history ${stamp}`;
			const channel = await seed.channel(`e2e-ah-ch-${stamp}`);

			const services = await seed.logs({
				marker,
				services: LOGS_HISTORY_SERVICES,
				servicePrefix: 'e2e-ah-svc',
			});

			const ruleId = await seed.logsRule({
				name: `e2e-ah-rule-v2-${stamp}`,
				marker,
				channels: [channel.name],
				schema: 'v2',
			});
			const ruleIdV1 = await seed.logsRule({
				name: `e2e-ah-rule-v1-${stamp}`,
				marker,
				channels: [channel.name],
				schema: 'v1',
				extraLabels: { team: V1_RULE_TEAM_LABEL },
			});

			await history.waitForEntries(ruleId, { min: LOGS_HISTORY_SERVICES });
			await history.waitForEntries(ruleIdV1, { min: LOGS_HISTORY_SERVICES });
			await seed.setDisabled(ruleId, true);
			await seed.setDisabled(ruleIdV1, true);

			const total = await history.readTotal(ruleId);
			if (total !== LOGS_HISTORY_SERVICES) {
				throw new Error(
					`alertHistory expected ${LOGS_HISTORY_SERVICES} timeline rows, got ${total}`,
				);
			}

			return {
				ruleId,
				ruleIdV1,
				channelName: channel.name,
				marker,
				services,
				total,
				totalV1: await history.readTotal(ruleIdV1),
				ruleIds: [ruleId, ruleIdV1],
				channelId: channel.id,
			};
		},
		async ({ page, value }) => drop(page, value),
		{ timeout: FIXTURE_ALERT_HISTORY_TIMEOUT },
	);

export interface MetricsHistorySeed extends Owned {
	ruleId: string;
	channelName: string;
	metricName: string;
	hosts: string[];
	total: number;
}

export const withMetricsHistory: WorkerLayer<{
	metricsHistory: MetricsHistorySeed;
}> = seeded(
	'metricsHistory',
	async ({ page }) => {
		const { seed, history } = alertsDriver(page);
		const stamp = Date.now();
		const metricName = `e2e_ah_probe_metric_${stamp}`;
		const channel = await seed.channel(`e2e-ah-metrics-ch-${stamp}`);

		await seed.metrics({ metricName, hosts: METRICS_HISTORY_HOSTS });
		const ruleId = await seed.metricRule({
			name: `e2e-ah-metrics-rule-${stamp}`,
			metricName,
			channels: [channel.name],
		});

		await history.waitForEntries(ruleId, {
			min: METRICS_HISTORY_HOSTS.length,
			timeoutMs: WAIT_METRICS_TIMELINE_TIMEOUT,
		});
		await seed.setDisabled(ruleId, true);

		return {
			ruleId,
			channelName: channel.name,
			metricName,
			hosts: METRICS_HISTORY_HOSTS,
			total: await history.readTotal(ruleId),
			ruleIds: [ruleId],
			channelId: channel.id,
		};
	},
	async ({ page, value }) => drop(page, value),
	{ timeout: FIXTURE_METRICS_HISTORY_TIMEOUT },
);

export interface TracesHistorySeed extends Owned {
	ruleId: string;
	channelName: string;
	/** The span `name` the rule matches (`name = '<marker>'`). */
	marker: string;
	services: string[];
	total: number;
}

export const withTracesHistory: WorkerLayer<{
	tracesHistory: TracesHistorySeed;
}> = seeded(
	'tracesHistory',
	async ({ page }) => {
		const { seed, history } = alertsDriver(page);
		const stamp = Date.now();
		const marker = `e2e-aht-span-${stamp}`;
		const channel = await seed.channel(`e2e-ah-traces-ch-${stamp}`);

		const services = await seed.traces({
			marker,
			services: TRACES_HISTORY_SERVICES,
			servicePrefix: 'e2e-aht-svc',
		});
		const ruleId = await seed.tracesRule({
			name: `e2e-ah-traces-rule-${stamp}`,
			marker,
			channels: [channel.name],
		});

		await history.waitForEntries(ruleId, { min: TRACES_HISTORY_SERVICES });
		await seed.setDisabled(ruleId, true);

		return {
			ruleId,
			channelName: channel.name,
			marker,
			services,
			total: await history.readTotal(ruleId),
			ruleIds: [ruleId],
			channelId: channel.id,
		};
	},
	async ({ page, value }) => drop(page, value),
	{ timeout: FIXTURE_TRACES_HISTORY_TIMEOUT },
);

export interface ResolvedHistorySeed extends Owned {
	ruleId: string;
	channelName: string;
	marker: string;
	services: string[];
	/** Rows in `firing` — equals `stats.totalCurrentTriggers`. */
	firingCount: number;
	/** Rows in `inactive`, i.e. what the Resolved filter shows. */
	resolvedCount: number;
}

export const withResolvedHistory: WorkerLayer<{
	resolvedHistory: ResolvedHistorySeed;
}> = seeded(
	'resolvedHistory',
	async ({ page }) => {
		const { seed, history } = alertsDriver(page);
		const stamp = Date.now();
		const marker = `e2e alert resolved ${stamp}`;
		const channel = await seed.channel(`e2e-ah-resolved-ch-${stamp}`);

		const services = await seed.logs({
			marker,
			services: RESOLVED_HISTORY_SERVICES,
			ageSeconds: 40,
			minAgeSeconds: 28,
			servicePrefix: 'e2e-ahr-svc',
		});
		const ruleId = await seed.logsRule({
			name: `e2e-ah-resolved-rule-${stamp}`,
			marker,
			channels: [channel.name],
			evalWindow: '1m0s',
		});

		const timeline = await history.waitForStates(ruleId, {
			states: {
				firing: RESOLVED_HISTORY_SERVICES,
				inactive: RESOLVED_HISTORY_SERVICES,
			},
		});
		await seed.setDisabled(ruleId, true);

		return {
			ruleId,
			channelName: channel.name,
			marker,
			services,
			firingCount: timeline.items.filter((item) => item.state === 'firing').length,
			resolvedCount: timeline.items.filter((item) => item.state === 'inactive')
				.length,
			ruleIds: [ruleId],
			channelId: channel.id,
		};
	},
	async ({ page, value }) => drop(page, value),
	{ timeout: FIXTURE_RESOLVED_HISTORY_TIMEOUT },
);

export interface RuleSeed extends Owned {
	ruleId: string;
	channelName: string;
}

export const withNoDataHistory: WorkerLayer<{ noDataHistory: RuleSeed }> =
	seeded(
		'noDataHistory',
		async ({ page }) => {
			const { seed, history } = alertsDriver(page);
			const stamp = Date.now();
			const channel = await seed.channel(`e2e-ah-nodata-ch-${stamp}`);
			const ruleId = await seed.noDataRule({
				name: `e2e-ah-nodata-rule-${stamp}`,
				marker: `e2e alert nodata ${stamp}`,
				channels: [channel.name],
			});

			await history.waitForEntries(ruleId, {
				min: 1,
				state: 'nodata',
				timeoutMs: WAIT_NODATA_TIMELINE_TIMEOUT,
			});
			await seed.setDisabled(ruleId, true);

			return {
				ruleId,
				channelName: channel.name,
				ruleIds: [ruleId],
				channelId: channel.id,
			};
		},
		async ({ page, value }) => drop(page, value),
		{ timeout: FIXTURE_NODATA_HISTORY_TIMEOUT },
	);

/** A rule that never fires, for the "no history yet" empty state. */
export const withEmptyHistory: WorkerLayer<{ emptyHistory: RuleSeed }> = seeded(
	'emptyHistory',
	async ({ page }) => {
		const { seed } = alertsDriver(page);
		const stamp = Date.now();
		const channel = await seed.channel(`e2e-ah-empty-ch-${stamp}`);
		const ruleId = await seed.logsRule({
			name: `e2e-ah-empty-rule-${stamp}`,
			marker: `e2e alert never seeded ${stamp}`,
			channels: [channel.name],
		});
		await seed.setDisabled(ruleId, true);

		return {
			ruleId,
			channelName: channel.name,
			ruleIds: [ruleId],
			channelId: channel.id,
		};
	},
	async ({ page, value }) => drop(page, value),
	{ timeout: FIXTURE_EMPTY_HISTORY_TIMEOUT },
);

// ─── Rules a single test owns ────────────────────────────────────────────────

export interface OwnedRules {
	/** Seed a metric threshold rule this test owns. */
	threshold(name: string, overrides?: Record<string, unknown>): Promise<string>;
	/**
	 * Seed a logs rule this test owns. No telemetry is seeded for its marker, so
	 * it never fires — enough for anything about the details shell.
	 */
	logs(options: {
		name: string;
		schema?: 'v1' | 'v2';
		marker?: string;
		severity?: string;
		extraLabels?: Record<string, string>;
		evalWindow?: string;
		target?: number;
		op?: string;
		matchType?: string;
	}): Promise<string>;
	/**
	 * Track a rule the *app* created (Clone / Duplicate) so teardown removes it
	 * too. Lives here because the id may legitimately be missing, and a
	 * conditional inside a test body is a lint error.
	 */
	register(response: { json: () => Promise<unknown> }): Promise<void>;
}

/**
 * Test-scoped, because a scenario that renames, toggles, clones or deletes a
 * rule must not mutate a shared seed: everything scheduled after it would break.
 */
export const withOwnedRules: Layer<{ ownedRules: OwnedRules }> = ((
	test: TestType<Fixtures, Fixtures>,
) =>
	test.extend({
		ownedRules: async (
			{
				browser,
				alertChannel,
			}: { browser: Browser; alertChannel: AlertChannelSeed },
			use: (value: OwnedRules) => Promise<void>,
		) => {
			const ids = new Set<string>();
			const create = async (
				body: (page: Page) => Promise<string>,
			): Promise<string> => {
				const id = await onAdminPage(browser, body);
				ids.add(id);
				return id;
			};

			await use({
				threshold: (name, overrides = {}) =>
					create((page) =>
						alertsDriver(page).seed.threshold({
							name,
							target: 42,
							channels: [alertChannel.name],
							labels: { severity: 'critical' },
							...overrides,
						}),
					),

				logs: ({ name, schema = 'v2', marker, ...overrides }) =>
					create((page) =>
						alertsDriver(page).seed.logsRule({
							name,
							marker: marker ?? `e2e alert never seeded ${name}`,
							channels: [alertChannel.name],
							schema,
							...overrides,
						}),
					),

				register: async (response) => {
					const body = (await response.json()) as { data?: { id?: string } };
					if (body.data?.id) {
						ids.add(String(body.data.id));
					}
				},
			});

			await onAdminPage(browser, (page) =>
				alertsDriver(page).seed.deleteRules([...ids]),
			);
		},
	}) as never) as Layer<{ ownedRules: OwnedRules }>;
