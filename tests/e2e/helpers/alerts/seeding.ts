import { randomBytes } from 'crypto';

import type { Page } from '@playwright/test';

import { seederUrl } from '../common';

import { createThresholdAlertViaApi } from './api';
import { SEED_B_SEVERITIES } from './constants';
import type {
	AlertRulesSeedOptions,
	LogsSeedOptions,
	MetricsSeedOptions,
	TracesSeedOptions,
} from './types';

// ─── Seeding telemetry ───────────────────────────────────────────────────

async function postToSeeder(
	page: Page,
	path: string,
	data: unknown,
): Promise<void> {
	const url = `${seederUrl()}${path}`;
	// The seeder shares one ClickHouse client, so concurrent POSTs from parallel
	// workers collide with a transient 500 "concurrent queries within the same
	// session". Retry those; anything else is real.
	const maxAttempts = 6;
	let lastStatus = 0;
	let lastText = '';
	for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
		// eslint-disable-next-line no-await-in-loop
		const res = await page.request.post(url, {
			data,
			headers: { 'Content-Type': 'application/json' },
		});
		if (res.ok()) {
			return;
		}
		lastStatus = res.status();
		// eslint-disable-next-line no-await-in-loop
		lastText = await res.text();
		if (!(lastStatus === 500 && lastText.includes('concurrent'))) {
			break;
		}
		// eslint-disable-next-line no-await-in-loop
		await new Promise((resolve) => {
			setTimeout(resolve, 150 * (attempt + 1) + Math.floor(Math.random() * 100));
		});
	}
	throw new Error(`seeder POST ${path} ${lastStatus}: ${lastText}`);
}

/**
 * Seed log records the history rules match on. Returns the generated
 * `service.name` values, which become the timeline rows' `groupBy` labels
 * (N distinct services ⇒ N distinct fingerprints ⇒ N timeline rows).
 *
 * Seed these **immediately** before creating the rule: the rule only fires
 * while the records are still inside its eval window, and a stale marker
 * silently never fires.
 */
export async function seedAlertHistoryLogs(
	page: Page,
	{
		marker,
		services,
		recordsPerService = 2,
		ageSeconds = 150,
		minAgeSeconds = 30,
		servicePrefix = 'e2e-ah-svc',
	}: LogsSeedOptions,
): Promise<string[]> {
	const now = Date.now();
	const span = Math.max(ageSeconds - minAgeSeconds, 1);
	const serviceNames: string[] = [];
	const records: Record<string, unknown>[] = [];

	for (let i = 0; i < services; i += 1) {
		const service = `${servicePrefix}-${i}`;
		serviceNames.push(service);
		for (let r = 0; r < recordsPerService; r += 1) {
			const fraction =
				(i * recordsPerService + r) / (services * recordsPerService);
			const offset = ageSeconds - Math.floor(fraction * span);
			records.push({
				timestamp: new Date(now - offset * 1000).toISOString(),
				body: marker,
				resources: { 'service.name': service },
			});
		}
	}

	await postToSeeder(page, '/telemetry/logs', records);
	return serviceNames;
}

/**
 * Seed spans the traces history rule matches on — one root span per
 * `service.name`, all sharing the span `name` marker. Returns the generated
 * service names (⇒ one timeline row each), same contract as
 * {@link seedAlertHistoryLogs}, and the same "seed immediately before creating
 * the rule" rule applies.
 */
export async function seedAlertHistoryTraces(
	page: Page,
	{
		marker,
		services,
		spansPerService = 2,
		ageSeconds = 150,
		minAgeSeconds = 30,
		servicePrefix = 'e2e-aht-svc',
	}: TracesSeedOptions,
): Promise<string[]> {
	const now = Date.now();
	const span = Math.max(ageSeconds - minAgeSeconds, 1);
	const serviceNames: string[] = [];
	const spans: Record<string, unknown>[] = [];

	for (let i = 0; i < services; i += 1) {
		const service = `${servicePrefix}-${i}`;
		serviceNames.push(service);
		for (let s = 0; s < spansPerService; s += 1) {
			const fraction = (i * spansPerService + s) / (services * spansPerService);
			const offset = ageSeconds - Math.floor(fraction * span);
			spans.push({
				timestamp: new Date(now - offset * 1000).toISOString(),
				trace_id: randomBytes(16).toString('hex'),
				span_id: randomBytes(8).toString('hex'),
				name: marker,
				kind: 2,
				duration: 'PT0.05S',
				resources: { 'service.name': service },
			});
		}
	}

	await postToSeeder(page, '/telemetry/traces', spans);
	return serviceNames;
}

/**
 * Seed a throwaway gauge the metrics rule alerts on. Cheaper than the logs
 * fixture (~10s to fire) and its history rows carry neither `relatedLogsLink`
 * nor `relatedTracesLink` — the "no links available" case.
 */
export async function seedAlertHistoryMetrics(
	page: Page,
	{
		metricName,
		hosts,
		pointsPerHost = 3,
		groupByKey = 'host',
	}: MetricsSeedOptions,
): Promise<void> {
	const now = Date.now();
	const points: Record<string, unknown>[] = [];
	for (const host of hosts) {
		for (let p = 0; p < pointsPerHost; p += 1) {
			points.push({
				metric_name: metricName,
				labels: { [groupByKey]: host },
				timestamp: new Date(now - (pointsPerHost - p) * 20 * 1000).toISOString(),
				value: 10 + p,
				type_: 'Gauge',
				temporality: 'Unspecified',
				is_monotonic: false,
			});
		}
	}
	await postToSeeder(page, '/telemetry/metrics', points);
}

/**
 * SEED-B: `count` metric threshold rules sharing one channel. Severities cycle
 * through {@link SEED_B_SEVERITIES} and every rule carries a `team` label, so
 * the list's "Alert Name, Severity and Labels" search has hits *and* misses for
 * all three. Even-indexed rules are `platform`, odd ones `payments` — i.e. half
 * the batch each. Returns the ids in creation order.
 */
export async function seedAlertRules(
	page: Page,
	{
		count,
		channelName,
		namePrefix = 'e2e-alert-list',
		teamSuffix = '',
	}: AlertRulesSeedOptions,
): Promise<string[]> {
	const ids: string[] = [];
	for (let i = 0; i < count; i += 1) {
		// Sequential on purpose: the rules API is not the thing under test and
		// parallel POSTs make failures harder to attribute.
		// eslint-disable-next-line no-await-in-loop
		const id = await createThresholdAlertViaApi(page, {
			name: `${namePrefix}-${String(i).padStart(2, '0')}`,
			target: 100 + i,
			channels: [channelName],
			labels: {
				severity: SEED_B_SEVERITIES[i % SEED_B_SEVERITIES.length],
				team: `${i % 2 === 0 ? 'platform' : 'payments'}${teamSuffix}`,
			},
		});
		ids.push(id);
	}
	return ids;
}
