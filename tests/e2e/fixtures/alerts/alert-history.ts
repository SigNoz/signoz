import type { Browser } from '@playwright/test';

import {
	createEmailChannelViaApi,
	createLogsAlertViaApi,
	createMetricAlertViaApi,
	createNoDataAlertViaApi,
	createTracesAlertViaApi,
	deleteAlertViaApi,
	deleteChannelViaApi,
	setRuleDisabledViaApi,
} from '../../helpers/alerts/api';
import {
	readTimelineTotal,
	waitForTimelineEntries,
	waitForTimelineStates,
} from '../../helpers/alerts/history';
import {
	seedAlertHistoryLogs,
	seedAlertHistoryMetrics,
	seedAlertHistoryTraces,
} from '../../helpers/alerts/seeding';
import { expect, test as base, withAdminPage } from './alert-rules';
import {
	FIXTURE_ALERT_HISTORY_TIMEOUT,
	FIXTURE_EMPTY_HISTORY_TIMEOUT,
	FIXTURE_METRICS_HISTORY_TIMEOUT,
	FIXTURE_NODATA_HISTORY_TIMEOUT,
	FIXTURE_RESOLVED_HISTORY_TIMEOUT,
	FIXTURE_TRACES_HISTORY_TIMEOUT,
	WAIT_METRICS_TIMELINE_TIMEOUT,
	WAIT_NODATA_TIMELINE_TIMEOUT,
} from './timeouts';

// Worker-scoped alert-history fixtures. Extends `alert-rules`, so a spec that
// imports `test` from here also gets `alertChannel` / `alertList` / `ownedRules`
// — the details specs need a history seed *and* their own throwaway rules.
//
// Every history row has to come from the ruler actually evaluating a rule (there
// is no seeder endpoint for `rule_state_history_v0`), so each fixture pays a
// real ruler wait: ~20-35s for logs, ~10s for metrics, ~105s for firing→resolved.
// Worker scope means one wait per worker instead of one per test, and Playwright
// creates each fixture lazily — a spec that never asks for `resolvedHistory`
// never pays its 105s.

/** Service count for `alertHistory`. 25 yields multi-page timeline + pagination tests. */
const LOGS_HISTORY_SERVICES = 25;

/** Service count for `resolvedHistory`. 3 services + 1m window = resolves in ~105s. */
const RESOLVED_HISTORY_SERVICES = 3;

/** Hosts for `metricsHistory`. 2 rows fit one page, no related-logs links. */
const METRICS_HISTORY_HOSTS = ['host-0', 'host-1'];

/** Service count for `tracesHistory`. 3 keeps wait short while proving traces link. */
const TRACES_HISTORY_SERVICES = 3;

/** Team label for the v1 rule in `alertHistory`, so its header labels row is non-empty. */
export const V1_RULE_TEAM_LABEL = 'e2e-platform';

export interface AlertHistorySeed {
	/** v2 (`schemaVersion: v2alpha1`) rule — the default history subject. */
	ruleId: string;
	/** Legacy v1 rule over the same logs. Its `threshold.name` is `warning`. */
	ruleIdV1: string;
	channelName: string;
	/** The `body CONTAINS` marker both rules match. */
	marker: string;
	/** The seeded `service.name` values, in creation order. */
	services: string[];
	/** Baseline `total` for {@link ruleId}, read after the rule was frozen. */
	total: number;
	/** Baseline `total` for {@link ruleIdV1}. */
	totalV1: number;
}

export interface MetricsHistorySeed {
	ruleId: string;
	channelName: string;
	metricName: string;
	hosts: string[];
	total: number;
}

export interface TracesHistorySeed {
	ruleId: string;
	channelName: string;
	/** The span `name` the rule matches (`name = '<marker>'`). */
	marker: string;
	services: string[];
	total: number;
}

export interface ResolvedHistorySeed {
	ruleId: string;
	channelName: string;
	marker: string;
	services: string[];
	/** Rows in the `firing` state — equals `stats.totalCurrentTriggers`. */
	firingCount: number;
	/** Rows in the `inactive` state, i.e. what the `Resolved` filter shows. */
	resolvedCount: number;
}

export interface NoDataHistorySeed {
	ruleId: string;
	channelName: string;
}

export interface EmptyHistorySeed {
	ruleId: string;
	channelName: string;
}

async function cleanup(
	browser: Browser,
	{ ruleIds, channelId }: { ruleIds: string[]; channelId?: string },
): Promise<void> {
	await withAdminPage(browser, async (page) => {
		for (const id of ruleIds) {
			// eslint-disable-next-line no-await-in-loop
			await deleteAlertViaApi(page, id);
		}
		if (channelId) {
			await deleteChannelViaApi(page, channelId);
		}
	});
}

// --- Fixture setup functions ---

interface HistoryFixtureResult<T> {
	seed: T;
	ruleIds: string[];
	channelId: string;
}

async function createAlertHistorySeed(
	browser: Browser,
): Promise<HistoryFixtureResult<AlertHistorySeed>> {
	const stamp = Date.now();
	const marker = `e2e alert history ${stamp}`;

	const result = await withAdminPage(browser, async (page) => {
		const channel = await createEmailChannelViaApi(page, `e2e-ah-ch-${stamp}`);

		const services = await seedAlertHistoryLogs(page, {
			marker,
			services: LOGS_HISTORY_SERVICES,
			servicePrefix: `e2e-ah-svc`,
		});

		const ruleId = await createLogsAlertViaApi(page, {
			name: `e2e-ah-rule-v2-${stamp}`,
			marker,
			channels: [channel.name],
			schema: 'v2',
		});
		const ruleIdV1 = await createLogsAlertViaApi(page, {
			name: `e2e-ah-rule-v1-${stamp}`,
			marker,
			channels: [channel.name],
			schema: 'v1',
			extraLabels: { team: V1_RULE_TEAM_LABEL },
		});

		await waitForTimelineEntries(page, ruleId, { min: LOGS_HISTORY_SERVICES });
		await waitForTimelineEntries(page, ruleIdV1, { min: LOGS_HISTORY_SERVICES });

		await setRuleDisabledViaApi(page, ruleId, true);
		await setRuleDisabledViaApi(page, ruleIdV1, true);

		return {
			seed: {
				ruleId,
				ruleIdV1,
				channelName: channel.name,
				marker,
				services,
				total: await readTimelineTotal(page, ruleId),
				totalV1: await readTimelineTotal(page, ruleIdV1),
			},
			ruleIds: [ruleId, ruleIdV1],
			channelId: channel.id,
		};
	});

	if (result.seed.total !== LOGS_HISTORY_SERVICES) {
		throw new Error(
			`alertHistory expected ${LOGS_HISTORY_SERVICES} timeline rows, got ${result.seed.total}`,
		);
	}

	return result;
}

async function createMetricsHistorySeed(
	browser: Browser,
): Promise<HistoryFixtureResult<MetricsHistorySeed>> {
	const stamp = Date.now();
	const metricName = `e2e_ah_probe_metric_${stamp}`;

	return withAdminPage(browser, async (page) => {
		const channel = await createEmailChannelViaApi(
			page,
			`e2e-ah-metrics-ch-${stamp}`,
		);

		await seedAlertHistoryMetrics(page, {
			metricName,
			hosts: METRICS_HISTORY_HOSTS,
		});

		const ruleId = await createMetricAlertViaApi(page, {
			name: `e2e-ah-metrics-rule-${stamp}`,
			metricName,
			channels: [channel.name],
		});

		await waitForTimelineEntries(page, ruleId, {
			min: METRICS_HISTORY_HOSTS.length,
			timeoutMs: WAIT_METRICS_TIMELINE_TIMEOUT,
		});
		await setRuleDisabledViaApi(page, ruleId, true);

		return {
			seed: {
				ruleId,
				channelName: channel.name,
				metricName,
				hosts: METRICS_HISTORY_HOSTS,
				total: await readTimelineTotal(page, ruleId),
			},
			ruleIds: [ruleId],
			channelId: channel.id,
		};
	});
}

async function createTracesHistorySeed(
	browser: Browser,
): Promise<HistoryFixtureResult<TracesHistorySeed>> {
	const stamp = Date.now();
	const marker = `e2e-aht-span-${stamp}`;

	return withAdminPage(browser, async (page) => {
		const channel = await createEmailChannelViaApi(
			page,
			`e2e-ah-traces-ch-${stamp}`,
		);

		const services = await seedAlertHistoryTraces(page, {
			marker,
			services: TRACES_HISTORY_SERVICES,
			servicePrefix: 'e2e-aht-svc',
		});

		const ruleId = await createTracesAlertViaApi(page, {
			name: `e2e-ah-traces-rule-${stamp}`,
			marker,
			channels: [channel.name],
		});

		await waitForTimelineEntries(page, ruleId, { min: TRACES_HISTORY_SERVICES });
		await setRuleDisabledViaApi(page, ruleId, true);

		return {
			seed: {
				ruleId,
				channelName: channel.name,
				marker,
				services,
				total: await readTimelineTotal(page, ruleId),
			},
			ruleIds: [ruleId],
			channelId: channel.id,
		};
	});
}

async function createResolvedHistorySeed(
	browser: Browser,
): Promise<HistoryFixtureResult<ResolvedHistorySeed>> {
	const stamp = Date.now();
	const marker = `e2e alert resolved ${stamp}`;

	return withAdminPage(browser, async (page) => {
		const channel = await createEmailChannelViaApi(
			page,
			`e2e-ah-resolved-ch-${stamp}`,
		);

		const services = await seedAlertHistoryLogs(page, {
			marker,
			services: RESOLVED_HISTORY_SERVICES,
			ageSeconds: 40,
			minAgeSeconds: 28,
			servicePrefix: 'e2e-ahr-svc',
		});

		const ruleId = await createLogsAlertViaApi(page, {
			name: `e2e-ah-resolved-rule-${stamp}`,
			marker,
			channels: [channel.name],
			evalWindow: '1m0s',
		});

		const timeline = await waitForTimelineStates(page, ruleId, {
			states: {
				firing: RESOLVED_HISTORY_SERVICES,
				inactive: RESOLVED_HISTORY_SERVICES,
			},
		});
		await setRuleDisabledViaApi(page, ruleId, true);

		return {
			seed: {
				ruleId,
				channelName: channel.name,
				marker,
				services,
				firingCount: timeline.items.filter((i) => i.state === 'firing').length,
				resolvedCount: timeline.items.filter((i) => i.state === 'inactive').length,
			},
			ruleIds: [ruleId],
			channelId: channel.id,
		};
	});
}

async function createNoDataHistorySeed(
	browser: Browser,
): Promise<HistoryFixtureResult<NoDataHistorySeed>> {
	const stamp = Date.now();

	return withAdminPage(browser, async (page) => {
		const channel = await createEmailChannelViaApi(
			page,
			`e2e-ah-nodata-ch-${stamp}`,
		);

		const ruleId = await createNoDataAlertViaApi(page, {
			name: `e2e-ah-nodata-rule-${stamp}`,
			marker: `e2e alert nodata ${stamp}`,
			channels: [channel.name],
		});

		await waitForTimelineEntries(page, ruleId, {
			min: 1,
			state: 'nodata',
			timeoutMs: WAIT_NODATA_TIMELINE_TIMEOUT,
		});
		await setRuleDisabledViaApi(page, ruleId, true);

		return {
			seed: { ruleId, channelName: channel.name },
			ruleIds: [ruleId],
			channelId: channel.id,
		};
	});
}

async function createEmptyHistorySeed(
	browser: Browser,
): Promise<HistoryFixtureResult<EmptyHistorySeed>> {
	const stamp = Date.now();

	return withAdminPage(browser, async (page) => {
		const channel = await createEmailChannelViaApi(
			page,
			`e2e-ah-empty-ch-${stamp}`,
		);

		const ruleId = await createLogsAlertViaApi(page, {
			name: `e2e-ah-empty-rule-${stamp}`,
			marker: `e2e alert never seeded ${stamp}`,
			channels: [channel.name],
		});
		await setRuleDisabledViaApi(page, ruleId, true);

		return {
			seed: { ruleId, channelName: channel.name },
			ruleIds: [ruleId],
			channelId: channel.id,
		};
	});
}

// --- Fixture definitions ---

export const test = base.extend<
	// eslint-disable-next-line @typescript-eslint/ban-types
	{},
	{
		alertHistory: AlertHistorySeed;
		metricsHistory: MetricsHistorySeed;
		tracesHistory: TracesHistorySeed;
		resolvedHistory: ResolvedHistorySeed;
		noDataHistory: NoDataHistorySeed;
		emptyHistory: EmptyHistorySeed;
	}
>({
	alertHistory: [
		async ({ browser }, use) => {
			const { seed, ruleIds, channelId } = await createAlertHistorySeed(browser);
			await use(seed);
			await cleanup(browser, { ruleIds, channelId });
		},
		{ scope: 'worker', timeout: FIXTURE_ALERT_HISTORY_TIMEOUT },
	],

	metricsHistory: [
		async ({ browser }, use) => {
			const { seed, ruleIds, channelId } = await createMetricsHistorySeed(browser);
			await use(seed);
			await cleanup(browser, { ruleIds, channelId });
		},
		{ scope: 'worker', timeout: FIXTURE_METRICS_HISTORY_TIMEOUT },
	],

	tracesHistory: [
		async ({ browser }, use) => {
			const { seed, ruleIds, channelId } = await createTracesHistorySeed(browser);
			await use(seed);
			await cleanup(browser, { ruleIds, channelId });
		},
		{ scope: 'worker', timeout: FIXTURE_TRACES_HISTORY_TIMEOUT },
	],

	resolvedHistory: [
		async ({ browser }, use) => {
			const { seed, ruleIds, channelId } =
				await createResolvedHistorySeed(browser);
			await use(seed);
			await cleanup(browser, { ruleIds, channelId });
		},
		{ scope: 'worker', timeout: FIXTURE_RESOLVED_HISTORY_TIMEOUT },
	],

	noDataHistory: [
		async ({ browser }, use) => {
			const { seed, ruleIds, channelId } = await createNoDataHistorySeed(browser);
			await use(seed);
			await cleanup(browser, { ruleIds, channelId });
		},
		{ scope: 'worker', timeout: FIXTURE_NODATA_HISTORY_TIMEOUT },
	],

	emptyHistory: [
		async ({ browser }, use) => {
			const { seed, ruleIds, channelId } = await createEmptyHistorySeed(browser);
			await use(seed);
			await cleanup(browser, { ruleIds, channelId });
		},
		{ scope: 'worker', timeout: FIXTURE_EMPTY_HISTORY_TIMEOUT },
	],
});

export { expect };
