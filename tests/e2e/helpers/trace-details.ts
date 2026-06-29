import { randomBytes } from 'crypto';

import type { APIRequestContext, Page } from '@playwright/test';

import largeTraceRecords from '../testdata/traces/large-trace.json';
import { authToken, seederUrl } from './common';

// ── Seeder: insert traces via POST /telemetry/traces ─────────────────────────

// Shape accepted by the seeder's POST /telemetry/traces endpoint
// (mirrors `Traces.from_dict` in tests/fixtures/traces.py). One object per span;
// spans sharing a `trace_id` form one trace, linked into a tree via
// `parent_span_id`. NOTE: the endpoint does NOT ingest span events/links.
export interface SeederSpan {
	timestamp: string; // ISO-8601, e.g. new Date().toISOString()
	trace_id: string; // 32 hex chars
	span_id: string; // 16 hex chars
	parent_span_id?: string; // empty/omitted = root span
	name?: string;
	kind?: number; // 1=internal 2=server 3=client 4=producer 5=consumer
	status_code?: number; // 0=unset 1=ok 2=error
	status_message?: string;
	duration?: string; // ISO-8601 duration, e.g. "PT0.12S" (default PT1S)
	resources?: Record<string, string>; // include 'service.name'
	attributes?: Record<string, unknown>;
}

// 16-byte trace id / 8-byte span id, matching tests/fixtures/traces.py.
export const randomTraceId = (): string => randomBytes(16).toString('hex');
export const randomSpanId = (): string => randomBytes(8).toString('hex');

// Insert spans into the backend via the seeder. No auth needed (direct seeder
// call), so any APIRequestContext works — `page.request` or a standalone
// `playwright.request.newContext()` (cheaper than a full browser page for a
// pure API call).
//
// The seeder shares a single ClickHouse client, so concurrent POSTs from
// parallel workers collide with a 500 "concurrent queries within the same
// session". That's transient, so retry with backoff; any other error is real.
export async function seedTracesViaSeeder(
	request: APIRequestContext,
	spans: SeederSpan[],
): Promise<void> {
	const url = `${seederUrl()}/telemetry/traces`;
	const maxAttempts = 6;
	let lastStatus = 0;
	let lastText = '';
	for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
		// eslint-disable-next-line no-await-in-loop
		const res = await request.post(url, {
			data: spans,
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
	throw new Error(`seeder POST /telemetry/traces ${lastStatus}: ${lastText}`);
}

// ── Navigation ───────────────────────────────────────────────────────────────

// Pages that already had the e2e test-hook init script registered, so
// gotoTraceUntilLoaded adds it at most once per Page (addInitScript re-runs on
// every navigation, and the script would otherwise stack up across calls).
const e2eHookRegistered = new WeakSet<Page>();

// Open a seeded trace and wait until the waterfall has rendered. The trace page
// fetches once on load, so if the seed isn't query-able yet (ClickHouse lag, worse
// under parallel load) it lands on the NoData state and never refetches — this
// reloads until the given row testid appears. Makes seeded-trace specs
// deterministic in the full parallel run, not just when run alone.
export async function gotoTraceUntilLoaded(
	page: Page,
	url: string,
	readyTestId: string,
	{ attempts = 5, perAttemptTimeoutMs = 8000 } = {},
): Promise<void> {
	// Enable e2e-only test hooks (e.g. the flamegraph span→rect map in
	// useFlamegraphTestHook) before the first navigation. Registered here because
	// every trace-detail spec loads the page through this helper, so the flag is
	// set without a dedicated fixture. Guarded to once per Page — addInitScript
	// re-runs on every navigation, so re-registering would stack duplicates.
	if (!e2eHookRegistered.has(page)) {
		await page.addInitScript(() => {
			(window as unknown as { __SIGNOZ_E2E__?: boolean }).__SIGNOZ_E2E__ = true;
		});
		// Dock the left nav so it doesn't fly out on hover and overlay the trace
		// content's left strip (which otherwise makes left-edge hover/click targets
		// land on the sidebar). Once per Page, before the first navigation.
		await pinSidenav(page);
		e2eHookRegistered.add(page);
	}

	for (let i = 0; i < attempts; i += 1) {
		// eslint-disable-next-line no-await-in-loop
		await page.goto(url);
		try {
			// eslint-disable-next-line no-await-in-loop
			await page
				.getByTestId(readyTestId)
				.waitFor({ state: 'visible', timeout: perAttemptTimeoutMs });
			return;
		} catch {
			// not loaded yet (NoData / seed lag) — reload and retry
		}
	}
	// final navigation so the test's own assertion surfaces a clear failure
	await page.goto(url);
}

// ── Trace options menu ─────────────────────────────────────────────────────

// Change the colour-by field via the trace options menu (Trace options → Colour
// by → field). colour-by is a per-user preference that persists, so tests should
// set a known field explicitly rather than assume the default. `fieldName` is a
// COLOR_BY_OPTIONS label (service.name | service.namespace | host.name |
// k8s.node.name | k8s.container.name); exact match avoids service.name matching
// service.namespace.
export async function changeColourByViaMenu(
	page: Page,
	fieldName: string,
): Promise<void> {
	await page.getByRole('button', { name: 'Trace options' }).click();
	await page.getByRole('menuitem', { name: /colour by/i }).click();
	await page
		.getByRole('menuitemradio', { name: fieldName, exact: true })
		.click();
}

// ── Large trace fixture (tests/e2e/testdata/traces/large-trace.json) ─────────
// One deep, realistic trace: 100 spans across 18 services, nested ~34 levels,
// 8 error spans, a wide duration spread, and db/http/llm/messaging attributes —
// enough to drive the flamegraph, waterfall, filters and drawer off one seed.
// Converted once from a real getWaterfallV4 capture. `loadLargeTrace()` stamps
// fresh ids per run (parallel isolation), rebases the timeline to ~now, and
// derives landmark span ids so specs target rows without hardcoding ids.

// Shape of each record in large-trace.json.
interface LargeTraceRecord {
	span_id: string;
	parent_span_id: string; // empty = root
	name: string;
	kind: number;
	status_code: number;
	duration: string; // ISO-8601, e.g. "PT0.080000S"
	offset_ms: number; // start offset from the root span
	resources: Record<string, string>;
	attributes: Record<string, unknown>;
}

const LARGE_TRACE_RECORDS = largeTraceRecords as LargeTraceRecord[];

export interface LargeTrace {
	traceId: string;
	spans: SeederSpan[];
	// landmark span ids — already stamped — for targeting rows / the drawer
	landmarks: {
		root: string;
		errors: string[];
		db: string;
		http: string;
		llm: string;
		messaging: string;
		deepLeaf: string;
	};
}

// Depth of a record via its parent chain (the JSON doesn't store level).
function recordDepth(
	rec: LargeTraceRecord,
	byId: Map<string, LargeTraceRecord>,
): number {
	let depth = 0;
	let cur: LargeTraceRecord | undefined = rec;
	while (cur && cur.parent_span_id) {
		cur = byId.get(cur.parent_span_id);
		depth += 1;
	}
	return depth;
}

// Build a seedable copy of the large trace with fresh, isolated ids.
export function loadLargeTrace(): LargeTrace {
	const traceId = randomTraceId();
	// Stamp a fresh span id for every original id, preserving the tree links.
	const idMap = new Map<string, string>();
	LARGE_TRACE_RECORDS.forEach((r) => idMap.set(r.span_id, randomSpanId()));

	// Sit the whole trace ~1 min in the past so all timestamps stay <= now.
	const baseStartMs = Date.now() - 60_000;

	const spans: SeederSpan[] = LARGE_TRACE_RECORDS.map((r) => {
		const span: SeederSpan = {
			timestamp: new Date(baseStartMs + r.offset_ms).toISOString(),
			trace_id: traceId,
			span_id: idMap.get(r.span_id) as string,
			name: r.name,
			kind: r.kind,
			status_code: r.status_code,
			duration: r.duration,
			resources: r.resources,
			attributes: r.attributes,
		};
		if (r.parent_span_id) {
			span.parent_span_id = idMap.get(r.parent_span_id);
		}
		return span;
	});

	const byId = new Map(LARGE_TRACE_RECORDS.map((r) => [r.span_id, r]));
	const stamp = (r: LargeTraceRecord | undefined): string =>
		r ? (idMap.get(r.span_id) as string) : '';
	const firstWithAttr = (key: string): LargeTraceRecord | undefined =>
		LARGE_TRACE_RECORDS.find((r) => key in r.attributes);

	const deepest = LARGE_TRACE_RECORDS.reduce((a, b) =>
		recordDepth(b, byId) > recordDepth(a, byId) ? b : a,
	);

	const landmarks = {
		root: stamp(LARGE_TRACE_RECORDS.find((r) => !r.parent_span_id)),
		errors: LARGE_TRACE_RECORDS.filter((r) => r.status_code === 2).map((r) =>
			stamp(r),
		),
		db: stamp(firstWithAttr('db.system')),
		http: stamp(firstWithAttr('http.method')),
		llm: stamp(firstWithAttr('gen_ai.request.model')),
		messaging: stamp(firstWithAttr('messaging.system')),
		deepLeaf: stamp(deepest),
	};

	return { traceId, spans, landmarks };
}

// ── Flamegraph canvas test hook ──────────────────────────────────────────────
// The flamegraph is canvas-rendered, so individual bars have no DOM nodes. The
// frontend exposes a read-only span→rect view on window.__sigTraceFlame__
// (useFlamegraphTestHook), present only when __SIGNOZ_E2E__ is set — which
// gotoTraceUntilLoaded injects via addInitScript.

// Mirror of the API exposed by useFlamegraphTestHook.
interface FlamegraphTestApi {
	getSpanPoint: (spanId: string) => { x: number; y: number } | null;
	isSpanInView: (spanId: string) => boolean;
	getSpanColor: (spanId: string) => string | null;
}

interface FlameWindow {
	__sigTraceFlame__?: FlamegraphTestApi;
}

// Resolve a span's on-canvas viewport point, waiting through the first paint
// (the hook + spanRects populate only after the flamegraph's draw rAF).
async function spanPoint(
	page: Page,
	spanId: string,
): Promise<{ x: number; y: number }> {
	const handle = await page.waitForFunction(
		(id) =>
			(window as unknown as FlameWindow).__sigTraceFlame__?.getSpanPoint(id) ??
			null,
		spanId,
		{ timeout: 10_000 },
	);
	const point = await handle.jsonValue();
	if (!point) {
		throw new Error(`flamegraph span "${spanId}" is not drawn on the canvas`);
	}
	return point;
}

// Hover the flamegraph bar for `spanId` (opens its SpanHoverCard).
export async function hoverFlamegraphSpan(
	page: Page,
	spanId: string,
): Promise<void> {
	const { x, y } = await spanPoint(page, spanId);
	await page.mouse.move(x, y);
}

// Click the flamegraph bar for `spanId` (selects the span / opens the drawer).
export async function clickFlamegraphSpan(
	page: Page,
	spanId: string,
): Promise<void> {
	const { x, y } = await spanPoint(page, spanId);
	await page.mouse.move(x, y);
	await page.mouse.click(x, y);
}

// Whether `spanId`'s bar is currently drawn AND inside the viewport container.
export async function isFlamegraphSpanInView(
	page: Page,
	spanId: string,
): Promise<boolean> {
	return page.evaluate(
		(id) =>
			(window as unknown as FlameWindow).__sigTraceFlame__?.isSpanInView(id) ??
			false,
		spanId,
	);
}

// Resting group color of a span's bar — used to assert colour-by recolor.
export async function getFlamegraphSpanColor(
	page: Page,
	spanId: string,
): Promise<string | null> {
	return page.evaluate(
		(id) =>
			(window as unknown as FlameWindow).__sigTraceFlame__?.getSpanColor(id) ??
			null,
		spanId,
	);
}

// ── User preferences (server-side, per-user) ─────────────────────────────────

// Trace-detail user-preference keys (mirror frontend constants/userPreferences.ts).
export const TRACE_PREFERENCE = {
	COLOR_BY: 'span_details_color_by_attribute',
	PREVIEW_FIELDS: 'span_details_preview_attributes',
	PINNED_ATTRIBUTES: 'span_details_pinned_attributes',
} as const;

// Whether the left nav is docked/pinned (mirror USER_PREFERENCES.SIDENAV_PINNED).
const SIDENAV_PINNED = 'sidenav_pinned';

// A telemetry field key as persisted in the preview-fields preference. Only
// `name` is required by the store (derivePreviewFields), but fieldContext /
// fieldDataType match how the UI persists them.
export interface PreviewFieldKey {
	name: string;
	fieldContext?: string;
	fieldDataType?: string;
}

// PUT a single user preference (server-side, per-user). Call BEFORE navigating
// to the trace page so its on-mount preference fetch returns the seeded value.
//
// NOTE: user preferences are GLOBAL PER USER, not per-test — they persist on the
// server for the admin user. Reset them (resetTracePreferences) in afterAll, and
// be aware other specs run by the same user in parallel share this state.
export async function setUserPreference(
	page: Page,
	name: string,
	value: unknown,
): Promise<void> {
	const token = await authToken(page);
	const res = await page.request.put(`/api/v1/user/preferences/${name}`, {
		data: { value },
		headers: { Authorization: `Bearer ${token}` },
	});
	if (!res.ok()) {
		throw new Error(
			`PUT /api/v1/user/preferences/${name} ${res.status()}: ${await res.text()}`,
		);
	}
}

// Persist the flamegraph color-by field. `fieldName` must be one of
// COLOR_BY_OPTIONS (service.name | service.namespace | host.name |
// k8s.node.name | k8s.container.name); '' falls back to the default.
export async function setColorByPreference(
	page: Page,
	fieldName: string,
): Promise<void> {
	await setUserPreference(page, TRACE_PREFERENCE.COLOR_BY, fieldName);
}

// Persist the span-details preview fields (shown as rows in the hover card).
export async function setPreviewFieldsPreference(
	page: Page,
	fields: PreviewFieldKey[],
): Promise<void> {
	await setUserPreference(page, TRACE_PREFERENCE.PREVIEW_FIELDS, fields);
}

// Reset trace-detail prefs to defaults. Run in afterAll so a prefs spec doesn't
// leak color-by / preview-field state into other specs for the same user.
export async function resetTracePreferences(page: Page): Promise<void> {
	await setColorByPreference(page, '');
	await setPreviewFieldsPreference(page, []);
}

// Pin (dock) the left nav. When unpinned it's a collapsed rail that flies out on
// hover as an absolute OVERLAY, covering the trace content's left strip — so
// hover/click on left-edge targets (the waterfall collapse arrow, flamegraph
// bars) lands on the sidebar instead. Pinned, it's a flex child that reserves
// layout space, so nothing is occluded. Set before navigating: the server pref
// wins over localStorage once preferences load.
export async function pinSidenav(page: Page): Promise<void> {
	await setUserPreference(page, SIDENAV_PINNED, true);
}
