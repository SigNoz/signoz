import { randomBytes } from 'crypto';

import type { Page } from '@playwright/test';

import { apiDriver } from '../api';
import { postToSeeder, type TelemetryPath } from '../telemetry';

import { SEED_B_SEVERITIES } from './constants';
import {
	buildThresholdRulePayload,
	logsCompositeQuery,
	metricsCompositeQuery,
	tracesCompositeQuery,
	v1RulePayload,
	v2RulePayload,
} from './payloads';
import type {
	AlertRulesSeedOptions,
	AlertSchema,
	LogsAlertSeed,
	LogsSeedOptions,
	MetricAlertSeed,
	MetricsSeedOptions,
	ThresholdAlertSeed,
	TracesAlertSeed,
	TracesSeedOptions,
} from './types';

/**
 * Seeding alerts: rules through the API, telemetry through the seeder container.
 *
 * Page-bound rather than layered on `test`, because worker fixtures run outside
 * a test and still need all of it. {@link alertSeeder} is what the worker seeds
 * and the `seed` driver both call.
 */

export interface AlertSeeder {
	channel(name: string): Promise<{ id: string; name: string }>;
	deleteChannel(id: string): Promise<void>;
	threshold(seed: ThresholdAlertSeed): Promise<string>;
	logsRule(seed: LogsAlertSeed): Promise<string>;
	tracesRule(seed: TracesAlertSeed): Promise<string>;
	metricRule(seed: MetricAlertSeed): Promise<string>;
	/** A logs rule whose filter matches nothing, with `alertOnAbsent` set — the
	 * only cheap way to get a `nodata` history row. Seed no telemetry for it. */
	noDataRule(options: {
		name: string;
		marker: string;
		channels: string[];
	}): Promise<string>;
	rules(options: AlertRulesSeedOptions): Promise<string[]>;
	deleteRule(id: string): Promise<void>;
	deleteRules(ids: string[]): Promise<void>;
	/**
	 * Freeze a rule's history. Rows are written on *state change* only, so the
	 * firing wave lands once — but once the eval window rolls past the seeded
	 * records the rule resolves and writes a second row per fingerprint, doubling
	 * `total` mid-suite. Disable as soon as the firing wave is confirmed.
	 */
	setDisabled(id: string, disabled: boolean): Promise<void>;
	logs(options: LogsSeedOptions): Promise<string[]>;
	traces(options: TracesSeedOptions): Promise<string[]>;
	metrics(options: MetricsSeedOptions): Promise<void>;
}

export function alertSeeder(page: Page): AlertSeeder {
	const api = apiDriver(page);

	const postRule = (
		schema: AlertSchema,
		payload: Record<string, unknown>,
	): Promise<string> =>
		api.create(schema === 'v1' ? '/api/v1/rules' : '/api/v2/rules', payload);

	const postTelemetry = (path: TelemetryPath, data: unknown[]): Promise<void> =>
		postToSeeder(page.request, path, data);

	const seeder: AlertSeeder = {
		channel: async (name) => {
			// `to` is never delivered; the channel only has to exist for rule
			// validation, which references channels by name.
			const id = await api.create('/api/v1/channels', {
				name,
				email_configs: [
					{ send_resolved: true, to: 'e2e@signoz.test', html: '', headers: {} },
				],
			});
			return { id, name };
		},

		deleteChannel: (id) => api.tryDel(`/api/v1/channels/${id}`),

		threshold: (seed) =>
			api.create('/api/v2/rules', buildThresholdRulePayload(seed)),

		logsRule: ({
			name,
			marker,
			channels,
			schema = 'v2',
			evalWindow = '5m0s',
			frequency = '15s',
			severity = schema === 'v1' ? 'warning' : 'critical',
			extraLabels,
			alertOnAbsent,
			absentFor,
			target,
			op,
			matchType,
		}) => {
			const args = {
				name,
				alertType: 'LOGS_BASED_ALERT',
				compositeQuery: logsCompositeQuery(marker),
				channels,
				severity,
				extraLabels,
				evalWindow,
				frequency,
				extraCondition:
					alertOnAbsent === undefined
						? undefined
						: { alertOnAbsent, absentFor: absentFor ?? 1 },
				target,
				op,
				matchType,
			};
			return postRule(
				schema,
				schema === 'v1' ? v1RulePayload(args) : v2RulePayload(args),
			);
		},

		tracesRule: ({
			name,
			marker,
			channels,
			evalWindow = '5m0s',
			frequency = '15s',
		}) =>
			postRule(
				'v2',
				v2RulePayload({
					name,
					alertType: 'TRACES_BASED_ALERT',
					compositeQuery: tracesCompositeQuery(marker),
					channels,
					severity: 'critical',
					evalWindow,
					frequency,
				}),
			),

		metricRule: ({
			name,
			metricName,
			channels,
			groupByKey = 'host',
			evalWindow = '5m0s',
			frequency = '15s',
		}) =>
			postRule(
				'v2',
				v2RulePayload({
					name,
					alertType: 'METRIC_BASED_ALERT',
					compositeQuery: metricsCompositeQuery(metricName, groupByKey),
					channels,
					severity: 'critical',
					evalWindow,
					frequency,
				}),
			),

		noDataRule: ({ name, marker, channels }) =>
			seeder.logsRule({
				name,
				marker,
				channels,
				evalWindow: '5m0s',
				frequency: '15s',
				alertOnAbsent: true,
				absentFor: 1,
			}),

		/**
		 * `count` metric threshold rules sharing one channel. Severities cycle so
		 * the list's search has hits *and* misses for all three, and every rule
		 * carries a `team` label: even-indexed `platform`, odd `payments`, i.e.
		 * half the batch each.
		 */
		rules: async ({
			count,
			channelName,
			namePrefix = 'e2e-alert-list',
			teamSuffix = '',
		}) => {
			const ids: string[] = [];
			for (let i = 0; i < count; i += 1) {
				// Sequential on purpose: the rules API is not the thing under test and
				// parallel POSTs make failures harder to attribute.
				// eslint-disable-next-line no-await-in-loop
				const id = await seeder.threshold({
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
		},

		deleteRule: (id) => api.tryDel(`/api/v2/rules/${id}`),

		deleteRules: async (ids) => {
			for (const id of ids) {
				// eslint-disable-next-line no-await-in-loop
				await seeder.deleteRule(id);
			}
		},

		setDisabled: async (id, disabled) => {
			await api.patch(`/api/v2/rules/${id}`, { disabled });
		},

		/**
		 * Log records the history rules match on. Returns the generated
		 * `service.name` values, which become the timeline rows' `groupBy` labels
		 * (N services ⇒ N fingerprints ⇒ N timeline rows).
		 *
		 * Seed **immediately** before creating the rule: the rule only fires while
		 * the records are inside its eval window, and a stale marker silently never
		 * fires.
		 */
		logs: async ({
			marker,
			services,
			recordsPerService = 2,
			ageSeconds = 150,
			minAgeSeconds = 30,
			servicePrefix = 'e2e-ah-svc',
		}) => {
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
					records.push({
						timestamp: new Date(
							now - (ageSeconds - Math.floor(fraction * span)) * 1000,
						).toISOString(),
						body: marker,
						resources: { 'service.name': service },
					});
				}
			}

			await postTelemetry('/telemetry/logs', records);
			return serviceNames;
		},

		/** One root span per service, all sharing the span `name` marker. */
		traces: async ({
			marker,
			services,
			spansPerService = 2,
			ageSeconds = 150,
			minAgeSeconds = 30,
			servicePrefix = 'e2e-aht-svc',
		}) => {
			const now = Date.now();
			const span = Math.max(ageSeconds - minAgeSeconds, 1);
			const serviceNames: string[] = [];
			const spans: Record<string, unknown>[] = [];

			for (let i = 0; i < services; i += 1) {
				const service = `${servicePrefix}-${i}`;
				serviceNames.push(service);
				for (let s = 0; s < spansPerService; s += 1) {
					const fraction = (i * spansPerService + s) / (services * spansPerService);
					spans.push({
						timestamp: new Date(
							now - (ageSeconds - Math.floor(fraction * span)) * 1000,
						).toISOString(),
						trace_id: randomBytes(16).toString('hex'),
						span_id: randomBytes(8).toString('hex'),
						name: marker,
						kind: 2,
						duration: 'PT0.05S',
						resources: { 'service.name': service },
					});
				}
			}

			await postTelemetry('/telemetry/traces', spans);
			return serviceNames;
		},

		/**
		 * A throwaway gauge the metrics rule alerts on. Cheaper than the logs seed
		 * (~10 s to fire) and its history rows carry neither related link — the "no
		 * links available" case.
		 */
		metrics: async ({
			metricName,
			hosts,
			pointsPerHost = 3,
			groupByKey = 'host',
		}) => {
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
			await postTelemetry('/telemetry/metrics', points);
		},
	};

	return seeder;
}
