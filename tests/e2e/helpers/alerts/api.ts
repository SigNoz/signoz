import type { Page } from '@playwright/test';

import { authToken } from '../common';

import {
	buildThresholdRulePayload,
	logsCompositeQuery,
	metricsCompositeQuery,
	tracesCompositeQuery,
	v1RulePayload,
	v2RulePayload,
} from './payloads';
import type {
	AlertSchema,
	LogsAlertSeed,
	MetricAlertSeed,
	ThresholdAlertSeed,
	TracesAlertSeed,
} from './types';

// ─── API helpers ─────────────────────────────────────────────────────────

/**
 * Seed an email notification channel via API. Returns its `{ id, name }`;
 * thresholds reference channels by name, cleanup deletes by id. `to` is never
 * delivered — the channel only needs to exist to satisfy rule validation.
 */
export async function createEmailChannelViaApi(
	page: Page,
	name: string,
): Promise<{ id: string; name: string }> {
	const token = await authToken(page);
	const res = await page.request.post('/api/v1/channels', {
		data: {
			name,
			email_configs: [
				{ send_resolved: true, to: 'e2e@signoz.test', html: '', headers: {} },
			],
		},
		headers: { Authorization: `Bearer ${token}` },
	});
	if (!res.ok()) {
		throw new Error(`POST /api/v1/channels ${res.status()}: ${await res.text()}`);
	}
	const json = (await res.json()) as { data: { id: string } };
	return { id: String(json.data.id), name };
}

/** Delete a notification channel by ID (best-effort cleanup). */
export async function deleteChannelViaApi(
	page: Page,
	id: string,
): Promise<void> {
	const token = await authToken(page);
	await page.request.delete(`/api/v1/channels/${id}`, {
		headers: { Authorization: `Bearer ${token}` },
	});
}

/**
 * Seed a v2 threshold alert via API. Returns the new rule ID. Pair with
 * {@link deleteAlertViaApi} in an `afterAll`/`afterEach` for cleanup.
 */
export async function createThresholdAlertViaApi(
	page: Page,
	seed: ThresholdAlertSeed,
): Promise<string> {
	const token = await authToken(page);
	const res = await page.request.post('/api/v2/rules', {
		data: buildThresholdRulePayload(seed),
		headers: { Authorization: `Bearer ${token}` },
	});
	if (!res.ok()) {
		throw new Error(`POST /api/v2/rules ${res.status()}: ${await res.text()}`);
	}
	const json = (await res.json()) as { data: { id: string } };
	return json.data.id;
}

/** Delete a rule by ID. Tolerates an already-deleted rule (best-effort cleanup). */
export async function deleteAlertViaApi(page: Page, id: string): Promise<void> {
	const token = await authToken(page);
	await page.request.delete(`/api/v2/rules/${id}`, {
		headers: { Authorization: `Bearer ${token}` },
	});
}

async function postRule(
	page: Page,
	schema: AlertSchema,
	payload: Record<string, unknown>,
): Promise<string> {
	const token = await authToken(page);
	const path = schema === 'v1' ? '/api/v1/rules' : '/api/v2/rules';
	const res = await page.request.post(path, {
		data: payload,
		headers: { Authorization: `Bearer ${token}` },
	});
	if (!res.ok()) {
		throw new Error(`POST ${path} ${res.status()}: ${await res.text()}`);
	}
	const json = (await res.json()) as { data: { id: string } };
	return String(json.data.id);
}

/**
 * Create a logs threshold rule grouped by `service.name`. `schema: 'v1'` posts
 * the legacy payload to `/api/v1/rules`, which the UI then renders through the
 * v1 branch of `AlertHeader` / `ActionButtons` — both schemas serve the *same*
 * history APIs, so history scenarios can be parameterised over them.
 */
export async function createLogsAlertViaApi(
	page: Page,
	{
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
	}: LogsAlertSeed,
): Promise<string> {
	const extraCondition =
		alertOnAbsent === undefined
			? undefined
			: { alertOnAbsent, absentFor: absentFor ?? 1 };
	const args = {
		name,
		alertType: 'LOGS_BASED_ALERT',
		compositeQuery: logsCompositeQuery(marker),
		channels,
		severity,
		extraLabels,
		evalWindow,
		frequency,
		extraCondition,
		target,
		op,
		matchType,
	};
	return postRule(
		page,
		schema,
		schema === 'v1' ? v1RulePayload(args) : v2RulePayload(args),
	);
}

/**
 * SEED-H's rule: traces-based over the seeded spans, grouped by `service.name`.
 * Its history rows carry `relatedTracesLink` and an empty `relatedLogsLink`, so
 * the popover offers "View Traces" only.
 */
export async function createTracesAlertViaApi(
	page: Page,
	{
		name,
		marker,
		channels,
		evalWindow = '5m0s',
		frequency = '15s',
	}: TracesAlertSeed,
): Promise<string> {
	return postRule(
		page,
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
	);
}

/** SEED-E's rule: metrics-based, so its history rows carry no related links. */
export async function createMetricAlertViaApi(
	page: Page,
	{
		name,
		metricName,
		channels,
		groupByKey = 'host',
		evalWindow = '5m0s',
		frequency = '15s',
	}: MetricAlertSeed,
): Promise<string> {
	return postRule(
		page,
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
	);
}

/**
 * SEED-G's rule: a logs rule whose filter matches nothing, with
 * `alertOnAbsent` set — the only cheap way to get a `nodata` history row.
 * Seed no telemetry for its marker.
 */
export async function createNoDataAlertViaApi(
	page: Page,
	{
		name,
		marker,
		channels,
	}: { name: string; marker: string; channels: string[] },
): Promise<string> {
	return createLogsAlertViaApi(page, {
		name,
		marker,
		channels,
		evalWindow: '5m0s',
		frequency: '15s',
		alertOnAbsent: true,
		absentFor: 1,
	});
}

/**
 * Freeze a rule's history. Rows are written on *state change* only, so the
 * firing wave lands once — but once the eval window rolls past the seeded
 * records the rule resolves and writes a second row per fingerprint, doubling
 * `total` mid-suite. Disable the rule as soon as the firing wave is confirmed.
 */
export async function setRuleDisabledViaApi(
	page: Page,
	id: string,
	disabled: boolean,
): Promise<void> {
	const token = await authToken(page);
	const res = await page.request.patch(`/api/v2/rules/${id}`, {
		data: { disabled },
		headers: { Authorization: `Bearer ${token}` },
	});
	if (!res.ok()) {
		throw new Error(
			`PATCH /api/v2/rules/${id} ${res.status()}: ${await res.text()}`,
		);
	}
}
