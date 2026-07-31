import { randomBytes } from 'crypto';

import {
	expect,
	type Locator,
	type Page,
	type Request,
	type Response,
} from '@playwright/test';

import { authToken, requestUrl, seederUrl } from './common';
import { typeExpression } from './query-builder';

// ─── Constants ───────────────────────────────────────────────────────────

export const ALERTS_LIST_PATH = '/alerts';
export const ALERT_OVERVIEW_PATH = '/alerts/overview';
export const ALERT_HISTORY_PATH = '/alerts/history';

/**
 * Mirrors `TIMELINE_TABLE_PAGE_SIZE` in
 * `frontend/src/container/AlertHistory/constants.ts`. This 20 is what makes the
 * page-2 cursor `base64url({"offset":20,"limit":20})`, so the two must not drift.
 */
export const TIMELINE_PAGE_SIZE = 20;

/** The `relativeTime` the history page falls back to (`DEFAULT_TIME_RANGE`). */
export const DEFAULT_RELATIVE_TIME = '30m';

/**
 * Page size the list specs pin in the URL, so the number of rendered rows never
 * depends on the viewport height.
 */
export const ALERT_LIST_PAGE_SIZE = 10;

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
	/**
	 * Rule labels. `severity` drives the list's Severity column and is one of
	 * the things its search box matches on, so list specs set it explicitly.
	 */
	labels?: Record<string, string>;

	// ── SEED-RV2 extras ─────────────────────────────────────────────────────
	// Everything below exists so an *edit* spec can prove the form prefilled from
	// the rule rather than from its own defaults. A prefill assertion against a
	// value that equals `INITIAL_CREATE_ALERT_STATE` proves nothing, so each of
	// these deliberately differs from the corresponding UI default.

	/**
	 * Replaces the single `critical` threshold. Use two or more to exercise the
	 * multi-threshold prefill — and note the UI only reads `op`/`matchType` back
	 * from `spec[0]`, so entries after the first should keep them identical unless
	 * the test is *about* that defect.
	 */
	thresholds?: ThresholdSeedSpec[];
	/** Go duration; UI default is `5m0s`, so pass something else. */
	evalWindow?: string;
	/** Go duration; UI default is `1m`, so pass something else. */
	frequency?: string;
	/**
	 * `notificationSettings.groupBy`. The UI's group-by select only offers keys
	 * that the *query* groups by (`MultipleNotifications.tsx:20-48`), so set
	 * {@link ThresholdAlertSeed.queryGroupBy} to the same keys or the prefilled
	 * value has no matching option.
	 */
	groupBy?: string[];
	/** Attribute keys the query groups by. Also what unlocks the group-by select. */
	queryGroupBy?: string[];
	/** `notificationSettings.renotify`. UI default is `{enabled: false}`. */
	renotify?: {
		enabled: boolean;
		/** Go duration; UI default is `30m`. */
		interval: string;
		alertStates: ('firing' | 'nodata')[];
	};
	/** `condition.alertOnAbsent` + `condition.absentFor` (minutes). */
	alertOnAbsent?: { absentFor: number };
	/** `condition.recoveryTarget` on the first threshold — the UI never renders it. */
	recoveryTarget?: number | null;
}

export interface ThresholdSeedSpec {
	name: string;
	target: number;
	targetUnit?: string;
	matchType?: string;
	op?: string;
	channels: string[];
	recoveryTarget?: number | null;
}

// ─── Payload ─────────────────────────────────────────────────────────────

// A minimal but valid v2 (schemaVersion v2alpha1 / version v5) threshold rule
// on the always-present `signoz_calls_total` metric. Mirrors the shape the
// CreateAlertV2 UI posts to POST /api/v2/rules.
function buildThresholdRulePayload({
	name,
	target,
	channels,
	labels,
	thresholds,
	evalWindow = '5m0s',
	frequency = '1m',
	groupBy = [],
	queryGroupBy = [],
	renotify = { enabled: false, interval: '30m', alertStates: [] },
	alertOnAbsent,
	recoveryTarget = null,
}: ThresholdAlertSeed): Record<string, unknown> {
	const thresholdSpec = (
		thresholds ?? [{ name: 'critical', target, channels, recoveryTarget }]
	).map((spec) => ({
		name: spec.name,
		target: spec.target,
		targetUnit: spec.targetUnit ?? '',
		recoveryTarget: spec.recoveryTarget ?? null,
		matchType: spec.matchType ?? 'at_least_once',
		op: spec.op ?? 'above',
		channels: spec.channels,
	}));

	return {
		alert: name,
		alertType: 'METRIC_BASED_ALERT',
		ruleType: 'threshold_rule',
		schemaVersion: 'v2alpha1',
		version: 'v5',
		disabled: false,
		source: '',
		...(labels ? { labels } : {}),
		annotations: {
			description:
				'This alert is fired when the defined metric (current value: {{$value}}) crosses the threshold ({{$threshold}})',
			summary:
				'This alert is fired when the defined metric (current value: {{$value}}) crosses the threshold ({{$threshold}})',
		},
		evaluation: {
			kind: 'rolling',
			spec: { evalWindow, frequency },
		},
		notificationSettings: {
			groupBy,
			renotify,
			usePolicy: false,
		},
		condition: {
			selectedQueryName: 'A',
			...(alertOnAbsent
				? { alertOnAbsent: true, absentFor: alertOnAbsent.absentFor }
				: {}),
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
							...(queryGroupBy.length > 0
								? {
										groupBy: queryGroupBy.map((key) => ({
											name: key,
											fieldContext: 'attribute',
											fieldDataType: 'string',
										})),
									}
								: {}),
							having: { expression: '' },
							legend: '',
						},
					},
				],
			},
			thresholds: {
				kind: 'basic',
				spec: thresholdSpec,
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
	// `.first()` because a rule may have several thresholds, and the editor renders
	// one input per threshold. Without it this is a strict-mode violation that only
	// appears once the *second* row has rendered — i.e. a timing-dependent failure
	// for multi-threshold rules.
	await expect(page.getByTestId('threshold-value-input').first()).toBeVisible();
	// The builder rewrites location.search shortly after load (adds compositeQuery).
	await page.waitForURL(/compositeQuery=/, { timeout: 15_000 });
	// Let post-load state updates flush so callers read the settled value.
	// eslint-disable-next-line playwright/no-wait-for-timeout -- no DOM signal for the async settle
	await page.waitForTimeout(500);
}

/**
 * Open the alert details shell (Overview tab) for `ruleId` and wait until it has
 * mounted. Unlike {@link gotoAlertOverview} this does **not** wait for the
 * condition editor or the serialised query — use it for scenarios about the
 * shell itself (header, tabs, actions menu) rather than the rule's contents.
 */
export async function gotoAlertDetails(
	page: Page,
	ruleId: string,
): Promise<void> {
	await page.goto(
		`${ALERT_OVERVIEW_PATH}?ruleId=${ruleId}&relativeTime=${DEFAULT_RELATIVE_TIME}`,
	);
	await expect(page.getByTestId('alert-details-root')).toBeVisible();
}

/** Rows currently rendered in the alert-rules table body. */
export function alertRuleRows(page: Page): Locator {
	return page.locator('tbody tr');
}

/**
 * Open the alert-rules list and wait until it has rows. `params` is merged into
 * the query string (`search`, `page`, `orderBy`, …); `limit` defaults to
 * {@link ALERT_LIST_PAGE_SIZE} so row counts are viewport-independent.
 *
 * Pass `expectRows: false` for scenarios whose filters are *meant* to match
 * nothing — the row wait would otherwise fail before the assertion runs.
 */
export async function gotoAlertList(
	page: Page,
	params: Record<string, string> = {},
	{ expectRows = true }: { expectRows?: boolean } = {},
): Promise<void> {
	const query = new URLSearchParams({
		limit: String(ALERT_LIST_PAGE_SIZE),
		...params,
	});
	await page.goto(`${ALERTS_LIST_PATH}?${query.toString()}`);
	await expect(page.getByTestId('list-alerts-search-input')).toBeVisible();
	if (expectRows) {
		await expect(alertRuleRows(page).first()).toBeVisible();
	}
}

// ═══════════════════════════════════════════════════════════════════════════
// Alert history fixtures
//
// There is no seeder endpoint that writes `rule_state_history_v0`, so every
// history row here comes from the ruler actually evaluating a rule: seed
// telemetry, create a rule whose query matches it, then poll the timeline until
// the firing wave lands. See `tests/e2e/specs/alerts/alerts-e2e-coverage.md` §3.
// ═══════════════════════════════════════════════════════════════════════════

// ─── Types ─────────────────────────────────────────────────────────────────

/** Rule schema flavour. `v1` is the legacy payload posted to `/api/v1/rules`. */
export type AlertSchema = 'v1' | 'v2';

export interface LogsAlertSeed {
	name: string;
	/** Substring the rule matches on (`body CONTAINS '<marker>'`). */
	marker: string;
	/** Channel *names* (not ids) — the API validates the reference. */
	channels: string[];
	schema?: AlertSchema;
	/** Go duration, e.g. `5m0s`. Shrink it to make the rule resolve fast. */
	evalWindow?: string;
	frequency?: string;
	/** Becomes the history `threshold.name` for v1 rules (`processRuleDefaults`). */
	severity?: string;
	/**
	 * Extra rule labels merged alongside `severity`. They show up in the details
	 * header's labels row (which renders `labels` minus `severity`) *and* as extra
	 * history `filter_keys`, so add them only where a scenario needs them.
	 */
	extraLabels?: Record<string, string>;
	/** `condition.alertOnAbsent` — the only route to a `nodata` row. */
	alertOnAbsent?: boolean;
	/** `condition.absentFor`, in minutes. */
	absentFor?: number;

	// ── SEED-RV1 extras ─────────────────────────────────────────────────────
	// v1 only. Same reasoning as SEED-RV2's block: an `EV1-*` prefill assertion
	// against the value the create form would have produced anyway proves nothing,
	// so each of these exists to differ from `alertDefaults`
	// (`container/CreateAlertRule/defaults.ts`).

	/** `condition.target`. The v1 default is *absent*, so any number differs. */
	target?: number;
	/** `condition.op` as the legacy numeric string. `1` above, `2` below, … */
	op?: string;
	/** `condition.matchType`, same encoding. `1` at-least-once, `2` all-the-times. */
	matchType?: string;
}

export interface TracesAlertSeed {
	name: string;
	/** Span name the rule matches on (`name = '<marker>'`). */
	marker: string;
	channels: string[];
	evalWindow?: string;
	frequency?: string;
}

export interface MetricAlertSeed {
	name: string;
	metricName: string;
	channels: string[];
	/** Attribute the history rows group by. Defaults to `host`. */
	groupByKey?: string;
	evalWindow?: string;
	frequency?: string;
}

export interface LogsSeedOptions {
	marker: string;
	/** Number of distinct `service.name` values ⇒ number of timeline rows. */
	services: number;
	recordsPerService?: number;
	/** Oldest record age in seconds; records spread from here up to `minAgeSeconds`. */
	ageSeconds?: number;
	minAgeSeconds?: number;
	/** Prefix for the generated `service.name` values. */
	servicePrefix?: string;
}

export interface MetricsSeedOptions {
	metricName: string;
	/** Distinct attribute values ⇒ number of timeline rows. */
	hosts: string[];
	pointsPerHost?: number;
	groupByKey?: string;
}

export interface TracesSeedOptions {
	/** Span `name` the rule matches on. */
	marker: string;
	/** Number of distinct `service.name` values ⇒ number of timeline rows. */
	services: number;
	spansPerService?: number;
	/** Oldest span age in seconds; spans spread from here up to `minAgeSeconds`. */
	ageSeconds?: number;
	minAgeSeconds?: number;
	servicePrefix?: string;
}

/** One row of `GET /api/v2/rules/{id}/history/timeline`. */
export interface TimelineItem {
	state: string;
	unixMilli: number;
	fingerprint: string;
	value: number;
	labels: {
		key?: { name?: string };
		value?: string | number | boolean | null;
	}[];
	relatedLogsLink?: string;
	relatedTracesLink?: string;
}

export interface TimelineResponse {
	items: TimelineItem[];
	total: number;
	nextCursor?: string;
}

// ─── Payload builders ────────────────────────────────────────────────────

const ANNOTATIONS = {
	description:
		'This alert is fired when the defined metric (current value: {{$value}}) crosses the threshold ({{$threshold}})',
	summary:
		'This alert is fired when the defined metric (current value: {{$value}}) crosses the threshold ({{$threshold}})',
};

// The v5 `queries[]` envelope is identical for both schema versions
// (`AlertCompositeQuery` in pkg/types/ruletypes/alerting.go) — only the
// threshold / evaluation / channel envelopes differ. That keeps one builder
// per signal and a thin branch over the wrapper.
function logsCompositeQuery(marker: string): Record<string, unknown> {
	return {
		panelType: 'graph',
		queryType: 'builder',
		queries: [
			{
				type: 'builder_query',
				spec: {
					name: 'A',
					signal: 'logs',
					source: '',
					disabled: false,
					filter: { expression: `body CONTAINS '${marker}'` },
					groupBy: [
						{
							name: 'service.name',
							fieldContext: 'resource',
							fieldDataType: 'string',
						},
					],
					aggregations: [{ expression: 'count()' }],
					having: { expression: '' },
					legend: '',
				},
			},
		],
	};
}

// Same shape as the logs query, one signal over: the rule's signal is what
// decides which related link the history rows carry (`links()` in
// `pkg/modules/rulestatehistory/implrulestatehistory/links.go` returns *either*
// a logs link *or* a traces link, never both).
function tracesCompositeQuery(marker: string): Record<string, unknown> {
	return {
		panelType: 'graph',
		queryType: 'builder',
		queries: [
			{
				type: 'builder_query',
				spec: {
					name: 'A',
					signal: 'traces',
					source: '',
					disabled: false,
					filter: { expression: `name = '${marker}'` },
					groupBy: [
						{
							name: 'service.name',
							fieldContext: 'resource',
							fieldDataType: 'string',
						},
					],
					aggregations: [{ expression: 'count()' }],
					having: { expression: '' },
					legend: '',
				},
			},
		],
	};
}

function metricsCompositeQuery(
	metricName: string,
	groupByKey: string,
): Record<string, unknown> {
	return {
		panelType: 'graph',
		queryType: 'builder',
		queries: [
			{
				type: 'builder_query',
				spec: {
					name: 'A',
					signal: 'metrics',
					source: '',
					disabled: false,
					filter: { expression: '' },
					groupBy: [
						{ name: groupByKey, fieldContext: 'attribute', fieldDataType: 'string' },
					],
					aggregations: [
						{
							metricName,
							temporality: '',
							timeAggregation: 'avg',
							spaceAggregation: 'max',
						},
					],
					having: { expression: '' },
					legend: '',
				},
			},
		],
	};
}

// `target 0 / op above / matchType at_least_once` fires on the first evaluation
// that sees any matching record, which is what keeps the ruler wait to ~20-35s.
function v2RulePayload({
	name,
	alertType,
	compositeQuery,
	channels,
	severity,
	extraLabels,
	evalWindow,
	frequency,
	extraCondition,
}: {
	name: string;
	alertType: string;
	compositeQuery: Record<string, unknown>;
	channels: string[];
	severity: string;
	extraLabels?: Record<string, string>;
	evalWindow: string;
	frequency: string;
	extraCondition?: Record<string, unknown>;
}): Record<string, unknown> {
	return {
		alert: name,
		alertType,
		ruleType: 'threshold_rule',
		schemaVersion: 'v2alpha1',
		version: 'v5',
		disabled: false,
		source: '',
		labels: { severity, ...extraLabels },
		annotations: ANNOTATIONS,
		evaluation: { kind: 'rolling', spec: { evalWindow, frequency } },
		notificationSettings: {
			groupBy: [],
			renotify: { enabled: false, interval: '30m', alertStates: [] },
			usePolicy: false,
		},
		condition: {
			selectedQueryName: 'A',
			compositeQuery,
			thresholds: {
				kind: 'basic',
				spec: [
					{
						name: severity,
						target: 0,
						targetUnit: '',
						recoveryTarget: null,
						matchType: 'at_least_once',
						op: 'above',
						channels,
					},
				],
			},
			...extraCondition,
		},
	};
}

// Legacy schema: `evalWindow`/`frequency` sit at the top level, channels are
// `preferredChannels`, and `condition.{op,target,matchType}` are the numeric
// enum forms the v1 validator requires. `labels.severity` becomes the history
// `threshold.name`.
function v1RulePayload({
	name,
	alertType,
	compositeQuery,
	channels,
	severity,
	extraLabels,
	evalWindow,
	frequency,
	extraCondition,
	target = 0,
	op = '1',
	matchType = '1',
}: {
	name: string;
	alertType: string;
	compositeQuery: Record<string, unknown>;
	channels: string[];
	severity: string;
	extraLabels?: Record<string, string>;
	evalWindow: string;
	frequency: string;
	extraCondition?: Record<string, unknown>;
	target?: number;
	op?: string;
	matchType?: string;
}): Record<string, unknown> {
	return {
		alert: name,
		alertType,
		ruleType: 'threshold_rule',
		disabled: false,
		source: '',
		evalWindow,
		frequency,
		preferredChannels: channels,
		labels: { severity, ...extraLabels },
		annotations: ANNOTATIONS,
		condition: {
			selectedQueryName: 'A',
			// Defaults match the history seeds' original shape — `target 0 / op above /
			// matchType at_least_once` fires on the first evaluation that sees data — so
			// overriding them is opt-in and cannot change what those seeds do.
			op,
			target,
			matchType,
			compositeQuery,
			...extraCondition,
		},
	};
}

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

// ─── Rule creation ───────────────────────────────────────────────────────

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

/** Severities SEED-B cycles through, so list search/sort has more than one value. */
export const SEED_B_SEVERITIES = ['critical', 'warning', 'info'] as const;

export interface AlertRulesSeedOptions {
	count: number;
	channelName: string;
	/** Rules are named `<namePrefix>-NN`. Keep it unique per batch. */
	namePrefix?: string;
	/**
	 * Appended to both `team` label values. Every list spec seeds its own batch
	 * and they run in parallel, so a bare `team: payments` would also match the
	 * neighbouring batches — which is exactly what the label-search scenario
	 * counts. Leave it empty only when nothing asserts an exact label count.
	 */
	teamSuffix?: string;
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

// ─── History API probes ──────────────────────────────────────────────────

/**
 * Read the timeline straight from the API. Used to gate on the ruler having
 * produced rows *before* a spec opens the UI — polling through the browser
 * would conflate "no rows yet" with "the table failed to render".
 */
export async function fetchTimeline(
	page: Page,
	ruleId: string,
	params: Record<string, string | number> = {},
): Promise<TimelineResponse> {
	const token = await authToken(page);
	const now = Date.now();
	const query = new URLSearchParams({
		start: String(now - 30 * 60 * 1000),
		end: String(now),
		limit: '100',
		order: 'asc',
		...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
	});
	const res = await page.request.get(
		`/api/v2/rules/${ruleId}/history/timeline?${query.toString()}`,
		{ headers: { Authorization: `Bearer ${token}` } },
	);
	if (!res.ok()) {
		throw new Error(
			`GET /api/v2/rules/${ruleId}/history/timeline ${res.status()}: ${await res.text()}`,
		);
	}
	const json = (await res.json()) as { data: TimelineResponse | null };
	return {
		items: json.data?.items ?? [],
		total: json.data?.total ?? 0,
		nextCursor: json.data?.nextCursor,
	};
}

function countStates(items: TimelineItem[]): Record<string, number> {
	return items.reduce<Record<string, number>>((acc, item) => {
		acc[item.state] = (acc[item.state] ?? 0) + 1;
		return acc;
	}, {});
}

/**
 * Poll until at least `min` rows in state `state` exist. Takes ~20-35s for the
 * logs fixture (the rule fires on the first evaluation that sees the data) and
 * ~10s for the metrics one, so budget generously — a timeout here means the
 * marker aged out of the eval window, not that the assertion is wrong.
 */
export async function waitForTimelineEntries(
	page: Page,
	ruleId: string,
	{
		min,
		state = 'firing',
		timeoutMs = 90_000,
	}: { min: number; state?: string; timeoutMs?: number },
): Promise<TimelineResponse> {
	const deadline = Date.now() + timeoutMs;
	let last: TimelineResponse = { items: [], total: 0 };
	while (Date.now() < deadline) {
		// eslint-disable-next-line no-await-in-loop
		last = await fetchTimeline(page, ruleId);
		if (last.items.filter((item) => item.state === state).length >= min) {
			return last;
		}
		// eslint-disable-next-line no-await-in-loop
		await new Promise((resolve) => {
			setTimeout(resolve, 2_000);
		});
	}
	throw new Error(
		`timeline for rule ${ruleId} never reached ${min} '${state}' rows within ${timeoutMs}ms ` +
			`(last: total=${last.total}, states=${JSON.stringify(countStates(last.items))})`,
	);
}

/**
 * Poll until every requested state has at least the requested row count.
 * SEED-F's firing→resolved wave and SEED-G's `nodata` row both gate on this.
 */
export async function waitForTimelineStates(
	page: Page,
	ruleId: string,
	{
		states,
		timeoutMs = 180_000,
	}: { states: Record<string, number>; timeoutMs?: number },
): Promise<TimelineResponse> {
	const deadline = Date.now() + timeoutMs;
	let last: TimelineResponse = { items: [], total: 0 };
	while (Date.now() < deadline) {
		// eslint-disable-next-line no-await-in-loop
		last = await fetchTimeline(page, ruleId);
		const seen = countStates(last.items);
		if (
			Object.entries(states).every(([state, min]) => (seen[state] ?? 0) >= min)
		) {
			return last;
		}
		// eslint-disable-next-line no-await-in-loop
		await new Promise((resolve) => {
			setTimeout(resolve, 3_000);
		});
	}
	throw new Error(
		`timeline for rule ${ruleId} never reached ${JSON.stringify(states)} within ${timeoutMs}ms ` +
			`(last states: ${JSON.stringify(countStates(last.items))})`,
	);
}

/** The filtered row count the timeline reports. Ignores `limit`. */
export async function readTimelineTotal(
	page: Page,
	ruleId: string,
): Promise<number> {
	return (await fetchTimeline(page, ruleId, { limit: 1 })).total;
}

/**
 * Mirror of `encodeCursor` in
 * `container/AlertHistory/Timeline/Table/useTimelineTableCursor.ts`, so specs
 * can assert the *exact* cursor the UI sends. Verified byte-identical to the
 * server's `nextCursor`.
 */
export function encodeTimelineCursor(
	page_: number,
	limit = TIMELINE_PAGE_SIZE,
): string | undefined {
	if (page_ <= 1) {
		return undefined;
	}
	const offset = (page_ - 1) * limit;
	return Buffer.from(JSON.stringify({ offset, limit }))
		.toString('base64')
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/, '');
}

/** Labels on a timeline row, flattened to a plain object. */
export function timelineLabelsToObject(
	item: TimelineItem,
): Record<string, string> {
	return (item.labels ?? []).reduce<Record<string, string>>((acc, label) => {
		const name = label.key?.name;
		if (name) {
			acc[name] = String(label.value ?? '');
		}
		return acc;
	}, {});
}

// ─── Navigation ────────────────────────────────────────────────────────────

/**
 * Open the history tab for `ruleId` and wait until the timeline table has
 * mounted. `params` is merged into the query string, so scenarios can deep-link
 * `page`, `order`, `timelineFilter`, … in one call.
 */
export async function gotoAlertHistory(
	page: Page,
	ruleId: string,
	params: Record<string, string> = {},
): Promise<void> {
	// An absolute window and `relativeTime` are mutually exclusive in practice:
	// with both present the time picker normalises back to the relative range and
	// **drops** `startTime`/`endTime` from the URL, so the absolute window never
	// takes effect. Only send the default relative range when no absolute one was
	// asked for.
	const hasAbsoluteRange = !!params.startTime && !!params.endTime;
	const query = new URLSearchParams({
		ruleId,
		...(hasAbsoluteRange ? {} : { relativeTime: DEFAULT_RELATIVE_TIME }),
		...params,
	});
	await page.goto(`${ALERT_HISTORY_PATH}?${query.toString()}`);

	// Race the table against the app's error boundary. The history page has been
	// observed crashing into it intermittently on load; without this the failure
	// reads as a 15s "timeline-table not found", which says nothing about why.
	const table = page.getByTestId('timeline-table');
	const crashed = page.getByText('Something went wrong :/');
	await expect(table.or(crashed)).toBeVisible();
	if (await crashed.isVisible()) {
		throw new Error(
			`alert history crashed into the app error boundary at ${page.url()} — ` +
				'a component threw during render; check the captured console output',
		);
	}
	await expect(table).toBeVisible();

	// The `timeline-table` node is rendered by the first paint, *before* the
	// timeline request settles — antd only overlays a spinner on it. Returning
	// here would leave that request in flight, and the next
	// `waitForHistoryResponse` in the spec would resolve with the page's own
	// load instead of the response its interaction produced. Wait the spinner
	// out so every caller starts from a quiet page.
	await expect(page.locator('.timeline-table .ant-spin-spinning')).toHaveCount(
		0,
	);
}

// ─── Locators ──────────────────────────────────────────────────────────────

/**
 * Assert the table is back on page 1. Both the list and the timeline use nuqs
 * with `parseAsInteger.withDefault(1)`, which **removes** the `page` param when
 * it is reset rather than writing `page=1` — so "absent" and "1" are the same
 * state and a naive `?page=1` regex never matches.
 */
export async function expectFirstPage(page: Page): Promise<void> {
	await expect
		.poll(() => new URL(page.url()).searchParams.get('page') ?? '1')
		.toBe('1');
}

export function timelineRows(page: Page): Locator {
	return page.getByTestId('timeline-row');
}

export function timelineFooterRange(page: Page): Locator {
	return page.getByTestId('timeline-footer-range');
}

export function statsCard(page: Page, title: string): Locator {
	return page.locator(`[data-testid="stats-card"][data-stats-title="${title}"]`);
}

/** Open the ACTIONS popover on timeline row `index` (0-based). */
export async function openTimelineRowActions(
	page: Page,
	index: number,
): Promise<void> {
	await timelineRows(page)
		.nth(index)
		.getByTestId('timeline-row-actions')
		.click();
}

// ─── History request matchers ──────────────────────────────────────────────

/** The four v2 endpoints one history page load hits. */
export const HISTORY_ENDPOINTS = [
	'stats',
	'timeline',
	'top_contributors',
	'overall_status',
] as const;

export type HistoryEndpoint = (typeof HISTORY_ENDPOINTS)[number];

/** Match a request against one history endpoint, whatever the rule id. */
export function isHistoryRequest(
	request: Request,
	endpoint: HistoryEndpoint,
): boolean {
	return new RegExp(`/api/v2/rules/[^/]+/history/${endpoint}`).test(
		request.url(),
	);
}

/**
 * Wait for a history API response. Common pattern across history specs.
 *
 * Optionally narrow by HTTP status code or by the `filterExpression` the
 * request carried. The latter matters whenever a scenario reacts to *its own*
 * request: the page's own load is still in flight when the spec starts typing,
 * so an unqualified matcher happily resolves with that earlier response.
 */
export function waitForHistoryResponse(
	page: Page,
	endpoint: HistoryEndpoint,
	options?: { status?: number; filterExpression?: string },
): Promise<Response> {
	return page.waitForResponse((res) => {
		if (!isHistoryRequest(res.request(), endpoint)) return false;
		if (options?.status !== undefined && res.status() !== options.status)
			return false;
		if (
			options?.filterExpression !== undefined &&
			(requestUrl(res.request()).searchParams.get('filterExpression') ?? '') !==
				options.filterExpression
		)
			return false;
		return true;
	});
}

// ─── History interactions ──────────────────────────────────────────────────

/** Apply a filter expression through the real editor + Run button. */
export async function runFilterExpression(
	page: Page,
	expression: string,
): Promise<void> {
	await typeExpression(page, expression);
	await page.getByRole('button', { name: /run query/i }).click();
}

/**
 * Sort the timeline descending through the STATE header.
 *
 * The antd table is *uncontrolled* — it has `sorter: true` but no `sortOrder`,
 * so its internal cycle is none → ascend → descend regardless of the `order`
 * the hook already sends. Reaching `desc` therefore takes two clicks, and the
 * first one only resets the page (asc is nuqs's default, so it writes no param).
 */
export async function sortTimelineDescending(page: Page): Promise<void> {
	const header = page.getByRole('columnheader', { name: 'STATE' });
	const descRequest = page.waitForRequest(
		(req) =>
			isHistoryRequest(req, 'timeline') &&
			requestUrl(req).searchParams.get('order') === 'desc',
	);
	await header.click();
	await header.click();
	await descRequest;
}

/**
 * Snapshot the LABELS cell of every rendered row. Scenarios that compare two
 * snapshots taken at different times (page 1 vs page 2, one timezone vs
 * another) cannot express that as a web-first assertion, so the read lives in a
 * helper rather than inline in the test.
 */
export async function timelineRowLabels(page: Page): Promise<string[]> {
	return timelineRows(page).getByTestId('timeline-row-labels').allInnerTexts();
}

/** Snapshot the first row's CREATED AT cell. See {@link timelineRowLabels}. */
export async function firstTimelineRowCreatedAt(page: Page): Promise<string> {
	return timelineRows(page)
		.first()
		.getByTestId('timeline-row-created-at')
		.innerText();
}
