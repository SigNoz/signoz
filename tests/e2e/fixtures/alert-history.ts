import type { Browser } from '@playwright/test';

import {
	createEmailChannelViaApi,
	createLogsAlertViaApi,
	createMetricAlertViaApi,
	createNoDataAlertViaApi,
	createTracesAlertViaApi,
	deleteAlertViaApi,
	deleteChannelViaApi,
	readTimelineTotal,
	seedAlertHistoryLogs,
	seedAlertHistoryMetrics,
	seedAlertHistoryTraces,
	setRuleDisabledViaApi,
	waitForTimelineEntries,
	waitForTimelineStates,
} from '../helpers/alerts';
import { expect, test as base, withAdminPage } from './alert-rules';

// Worker-scoped alert-history fixtures. Extends `alert-rules`, so a spec that
// imports `test` from here also gets `alertChannel` / `alertList` / `ownedRules`
// — the details specs need a history seed *and* their own throwaway rules.
//
// Every history row has to come from the ruler actually evaluating a rule (there
// is no seeder endpoint for `rule_state_history_v0`), so each fixture pays a
// real ruler wait: ~20-35s for the logs fixtures, ~10s for metrics, ~105s for
// the firing→resolved wave. Worker scope means one wait per worker instead of
// one per test, and Playwright creates each fixture lazily — a spec that never
// asks for `resolvedHistory` never pays its 105s.
//
// See `tests/e2e/specs/alerts/alerts-e2e-coverage.md` §3 for the recipes and the
// empirically-measured timings each budget here is derived from.

/** Distinct `service.name` values SEED-A seeds ⇒ its timeline row count. */
const SEED_A_SERVICES = 25;

/** SEED-F seeds fewer services and a 1m window so it resolves inside ~105s. */
const SEED_F_SERVICES = 3;

/** SEED-E's group-by values ⇒ a 2-row history that fits on one page. */
const SEED_E_HOSTS = ['host-0', 'host-1'];

/** SEED-H seeds just enough services to prove the traces link; keeps the wait short. */
const SEED_H_SERVICES = 3;

/** Non-severity label on SEED-C, so the v1 header's labels row is non-empty. */
export const SEED_C_TEAM_LABEL = 'e2e-platform';

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
	/**
	 * SEED-A (25-row firing history, v2) **plus** SEED-C (the same logs seen
	 * through a legacy v1 rule). Both rules share one seeded log batch, so the
	 * two ruler waves overlap and the fixture costs roughly one wait, not two.
	 */
	alertHistory: [
		async ({ browser }, use) => {
			const stamp = Date.now();
			const marker = `e2e alert history ${stamp}`;
			let channelId = '';
			let ruleId = '';
			let ruleIdV1 = '';

			const seed = await withAdminPage(browser, async (page) => {
				const channel = await createEmailChannelViaApi(page, `e2e-ah-ch-${stamp}`);
				channelId = channel.id;

				// Seed and create in the same breath: the rules only fire while the
				// records are inside the 5m eval window.
				const services = await seedAlertHistoryLogs(page, {
					marker,
					services: SEED_A_SERVICES,
					servicePrefix: `e2e-ah-svc`,
				});

				ruleId = await createLogsAlertViaApi(page, {
					name: `e2e-ah-rule-v2-${stamp}`,
					marker,
					channels: [channel.name],
					schema: 'v2',
				});
				ruleIdV1 = await createLogsAlertViaApi(page, {
					name: `e2e-ah-rule-v1-${stamp}`,
					marker,
					channels: [channel.name],
					schema: 'v1',
					// The v1 header renders `labels` minus `severity`, so without a
					// second label its labels row is present but empty (AD-02).
					extraLabels: { team: SEED_C_TEAM_LABEL },
				});

				await waitForTimelineEntries(page, ruleId, { min: SEED_A_SERVICES });
				await waitForTimelineEntries(page, ruleIdV1, { min: SEED_A_SERVICES });

				// Freeze both before the eval window rolls past the seeded records —
				// otherwise the resolve wave doubles `total` mid-suite.
				await setRuleDisabledViaApi(page, ruleId, true);
				await setRuleDisabledViaApi(page, ruleIdV1, true);

				return {
					ruleId,
					ruleIdV1,
					channelName: channel.name,
					marker,
					services,
					total: await readTimelineTotal(page, ruleId),
					totalV1: await readTimelineTotal(page, ruleIdV1),
				};
			});

			if (seed.total !== SEED_A_SERVICES) {
				// A different total means the fixture is not what the scenarios were
				// written against — most likely the resolve wave landed before the
				// PATCH froze the rule. Fail loudly here rather than let every
				// downstream count assertion fail with a confusing off-by-N.
				throw new Error(
					`SEED-A expected ${SEED_A_SERVICES} timeline rows, got ${seed.total}`,
				);
			}

			await use(seed);

			await cleanup(browser, { ruleIds: [ruleId, ruleIdV1], channelId });
		},
		{ scope: 'worker', timeout: 240_000 },
	],

	/**
	 * SEED-E — a metrics rule over two hosts. Two things SEED-A can't give:
	 * history rows with **no** related links (links are derived from the rule's
	 * signal), and a 2-row history that fits on a single page.
	 */
	metricsHistory: [
		async ({ browser }, use) => {
			const stamp = Date.now();
			const metricName = `e2e_ah_probe_metric_${stamp}`;
			let channelId = '';
			let ruleId = '';

			const seed = await withAdminPage(browser, async (page) => {
				const channel = await createEmailChannelViaApi(
					page,
					`e2e-ah-metrics-ch-${stamp}`,
				);
				channelId = channel.id;

				await seedAlertHistoryMetrics(page, {
					metricName,
					hosts: SEED_E_HOSTS,
				});

				ruleId = await createMetricAlertViaApi(page, {
					name: `e2e-ah-metrics-rule-${stamp}`,
					metricName,
					channels: [channel.name],
				});

				await waitForTimelineEntries(page, ruleId, {
					min: SEED_E_HOSTS.length,
					timeoutMs: 120_000,
				});
				await setRuleDisabledViaApi(page, ruleId, true);

				return {
					ruleId,
					channelName: channel.name,
					metricName,
					hosts: SEED_E_HOSTS,
					total: await readTimelineTotal(page, ruleId),
				};
			});

			await use(seed);

			await cleanup(browser, { ruleIds: [ruleId], channelId });
		},
		{ scope: 'worker', timeout: 240_000 },
	],

	/**
	 * SEED-H — a traces rule over seeded spans. The only fixture whose history
	 * rows carry `relatedTracesLink`: the backend derives the link from the
	 * rule's signal and returns either a logs link or a traces link, never both,
	 * so the "View Traces" popover entry is unreachable from SEED-A.
	 */
	tracesHistory: [
		async ({ browser }, use) => {
			const stamp = Date.now();
			const marker = `e2e-aht-span-${stamp}`;
			let channelId = '';
			let ruleId = '';

			const seed = await withAdminPage(browser, async (page) => {
				const channel = await createEmailChannelViaApi(
					page,
					`e2e-ah-traces-ch-${stamp}`,
				);
				channelId = channel.id;

				const services = await seedAlertHistoryTraces(page, {
					marker,
					services: SEED_H_SERVICES,
					servicePrefix: 'e2e-aht-svc',
				});

				ruleId = await createTracesAlertViaApi(page, {
					name: `e2e-ah-traces-rule-${stamp}`,
					marker,
					channels: [channel.name],
				});

				await waitForTimelineEntries(page, ruleId, { min: SEED_H_SERVICES });
				// Same reason as SEED-A: freeze before the eval window rolls past the
				// seeded spans and the resolve wave doubles `total`.
				await setRuleDisabledViaApi(page, ruleId, true);

				return {
					ruleId,
					channelName: channel.name,
					marker,
					services,
					total: await readTimelineTotal(page, ruleId),
				};
			});

			await use(seed);

			await cleanup(browser, { ruleIds: [ruleId], channelId });
		},
		{ scope: 'worker', timeout: 240_000 },
	],

	/**
	 * SEED-F — firing **and** resolved, without touching the seeder: a 1m eval
	 * window means the seeded records fall out of it fast, so the rule resolves
	 * on its own in ~105s. This is the only fixture that produces a non-zero
	 * average resolution time and a 3-segment overall-status graph.
	 */
	resolvedHistory: [
		async ({ browser }, use) => {
			const stamp = Date.now();
			const marker = `e2e alert resolved ${stamp}`;
			let channelId = '';
			let ruleId = '';

			const seed = await withAdminPage(browser, async (page) => {
				const channel = await createEmailChannelViaApi(
					page,
					`e2e-ah-resolved-ch-${stamp}`,
				);
				channelId = channel.id;

				const services = await seedAlertHistoryLogs(page, {
					marker,
					services: SEED_F_SERVICES,
					ageSeconds: 40,
					minAgeSeconds: 28,
					servicePrefix: 'e2e-ahr-svc',
				});

				ruleId = await createLogsAlertViaApi(page, {
					name: `e2e-ah-resolved-rule-${stamp}`,
					marker,
					channels: [channel.name],
					evalWindow: '1m0s',
				});

				const timeline = await waitForTimelineStates(page, ruleId, {
					states: {
						firing: SEED_F_SERVICES,
						inactive: SEED_F_SERVICES,
					},
				});
				await setRuleDisabledViaApi(page, ruleId, true);

				return {
					ruleId,
					channelName: channel.name,
					marker,
					services,
					firingCount: timeline.items.filter((i) => i.state === 'firing').length,
					resolvedCount: timeline.items.filter((i) => i.state === 'inactive').length,
				};
			});

			await use(seed);

			await cleanup(browser, { ruleIds: [ruleId], channelId });
		},
		{ scope: 'worker', timeout: 300_000 },
	],

	/**
	 * SEED-G — a `nodata` row, reached the same way
	 * `integration/testdata/alerts/test_scenarios/no_data_rule_test` does:
	 * `alertOnAbsent` on a query that matches nothing.
	 */
	noDataHistory: [
		async ({ browser }, use) => {
			const stamp = Date.now();
			let channelId = '';
			let ruleId = '';

			const seed = await withAdminPage(browser, async (page) => {
				const channel = await createEmailChannelViaApi(
					page,
					`e2e-ah-nodata-ch-${stamp}`,
				);
				channelId = channel.id;

				ruleId = await createNoDataAlertViaApi(page, {
					name: `e2e-ah-nodata-rule-${stamp}`,
					// Deliberately unseeded — the query must match nothing.
					marker: `e2e alert nodata ${stamp}`,
					channels: [channel.name],
				});

				await waitForTimelineEntries(page, ruleId, {
					min: 1,
					state: 'nodata',
					timeoutMs: 180_000,
				});
				await setRuleDisabledViaApi(page, ruleId, true);

				return { ruleId, channelName: channel.name };
			});

			await use(seed);

			await cleanup(browser, { ruleIds: [ruleId], channelId });
		},
		{ scope: 'worker', timeout: 300_000 },
	],

	/**
	 * A rule that will never have history: its query matches nothing and it is
	 * disabled immediately. Covers "no history yet" (empty table, zero stats) and
	 * "no key suggestions" without waiting on the ruler at all.
	 */
	emptyHistory: [
		async ({ browser }, use) => {
			const stamp = Date.now();
			let channelId = '';
			let ruleId = '';

			const seed = await withAdminPage(browser, async (page) => {
				const channel = await createEmailChannelViaApi(
					page,
					`e2e-ah-empty-ch-${stamp}`,
				);
				channelId = channel.id;

				ruleId = await createLogsAlertViaApi(page, {
					name: `e2e-ah-empty-rule-${stamp}`,
					marker: `e2e alert never seeded ${stamp}`,
					channels: [channel.name],
				});
				await setRuleDisabledViaApi(page, ruleId, true);

				return { ruleId, channelName: channel.name };
			});

			await use(seed);

			await cleanup(browser, { ruleIds: [ruleId], channelId });
		},
		{ scope: 'worker', timeout: 120_000 },
	],
});

export { expect };
