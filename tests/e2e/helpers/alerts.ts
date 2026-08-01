import { expect, type Page } from '@playwright/test';

import { authToken } from './common';

// ─── Constants ───────────────────────────────────────────────────────────

export const ALERTS_LIST_PATH = '/alerts';
export const ALERT_OVERVIEW_PATH = '/alerts/overview';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface ThresholdAlertSeed {
	/** Alert rule name. Keep unique per test to avoid collisions. */
	name: string;
	/** The critical-threshold target value to persist and later assert. */
	target: number;
	/**
	 * Notification channel names for the critical threshold. At least one is
	 * required by the API — seed one with {@link createEmailChannelViaApi}.
	 */
	channels: string[];
}

// ─── Payload ─────────────────────────────────────────────────────────────

// A minimal but valid v2 (schemaVersion v2alpha1 / version v5) threshold rule
// on the always-present `signoz_calls_total` metric. Mirrors the shape the
// CreateAlertV2 UI posts to POST /api/v2/rules.
function buildThresholdRulePayload({
	name,
	target,
	channels,
}: ThresholdAlertSeed): Record<string, unknown> {
	return {
		alert: name,
		alertType: 'METRIC_BASED_ALERT',
		ruleType: 'threshold_rule',
		schemaVersion: 'v2alpha1',
		version: 'v5',
		disabled: false,
		source: '',
		annotations: {
			description:
				'This alert is fired when the defined metric (current value: {{$value}}) crosses the threshold ({{$threshold}})',
			summary:
				'This alert is fired when the defined metric (current value: {{$value}}) crosses the threshold ({{$threshold}})',
		},
		evaluation: {
			kind: 'rolling',
			spec: { evalWindow: '5m0s', frequency: '1m' },
		},
		notificationSettings: {
			groupBy: [],
			renotify: { enabled: false, interval: '30m', alertStates: [] },
			usePolicy: false,
		},
		condition: {
			selectedQueryName: 'A',
			compositeQuery: {
				panelType: 'graph',
				queryType: 'builder',
				queries: [
					{
						type: 'builder_query',
						spec: {
							name: 'A',
							signal: 'metrics',
							source: '',
							aggregations: [
								{
									metricName: 'signoz_calls_total',
									temporality: '',
									timeAggregation: 'rate',
									spaceAggregation: 'sum',
								},
							],
							disabled: false,
							filter: { expression: '' },
							having: { expression: '' },
							legend: '',
						},
					},
				],
			},
			thresholds: {
				kind: 'basic',
				spec: [
					{
						name: 'critical',
						target,
						targetUnit: '',
						recoveryTarget: null,
						matchType: 'at_least_once',
						op: 'above',
						channels,
					},
				],
			},
		},
	};
}

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

// ─── Navigation ────────────────────────────────────────────────────────────

/**
 * Open the alert overview (edit) page for `ruleId` and wait until it has fully
 * settled: the condition editor is visible and the query builder has finished
 * serializing the loaded query into the URL.
 */
export async function gotoAlertOverview(
	page: Page,
	ruleId: string,
): Promise<void> {
	await page.goto(`${ALERT_OVERVIEW_PATH}?ruleId=${ruleId}`);
	await expect(page.getByTestId('threshold-value-input')).toBeVisible();
	// The builder rewrites location.search shortly after load (adds compositeQuery).
	await page.waitForURL(/compositeQuery=/, { timeout: 15_000 });
	// Let post-load state updates flush so callers read the settled value.
	// eslint-disable-next-line playwright/no-wait-for-timeout -- no DOM signal for the async settle
	await page.waitForTimeout(500);
}
