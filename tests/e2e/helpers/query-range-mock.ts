import type { Page, Route } from '@playwright/test';

// Pinned `/api/v5/query_range` payloads. Install BEFORE `page.goto`.
//
// Prefer golden data and assert STRUCTURE: the dataset's content is
// deterministic but `seed/golden` rebases timestamps to `now`, so labels and
// counts are stable while exact numbers are not. Reach for this only when the
// backend can't promise what the test needs — error/no-data/warning states,
// exact numbers for thresholds and units, a known series count, or stable
// pagination.
//
// Envelope (double-nested, easy to get wrong), mirroring `QueryRangeV5200`:
//   { status, data: { type, meta, warning, data: { results: [...] } } }
// `data.type` is the discriminator — a body under the wrong type renders as an
// empty panel rather than failing loudly.

const QUERY_RANGE_GLOB = '**/api/v5/query_range';

type RequestType = 'time_series' | 'scalar' | 'raw' | 'trace' | 'heatmap';

export interface QueryRangeBody {
	status: string;
	data: {
		type: RequestType;
		data: { results: unknown[] };
		meta?: Record<string, unknown>;
		warning?: Record<string, unknown>;
	};
}

function envelope(type: RequestType, results: unknown[]): QueryRangeBody {
	return { status: 'success', data: { type, data: { results } } };
}

// ─── Time helpers ────────────────────────────────────────────────────────

const MINUTE_MS = 60_000;

/**
 * The default end of a generated series: now, floored to the minute, so series
 * built by separate calls share their timestamps instead of straddling a
 * millisecond.
 */
function defaultEndMs(): number {
	return Math.floor(Date.now() / MINUTE_MS) * MINUTE_MS;
}

export interface TimeSeriesPoint {
	timestamp: number;
	value: number;
}

export interface SeriesSpec {
	labels: Record<string, string>;
	points: TimeSeriesPoint[];
}

export interface HeatmapPoint {
	timestamp: number;
	/** One count per bucket bound, plus a trailing open-above overflow. */
	counts: number[];
}

export interface HeatmapSeriesSpec {
	labels: Record<string, string>;
	points: HeatmapPoint[];
}

/** Evenly spaced epoch-ms timestamps ending at `endMs`. */
function timestamps(
	count: number,
	stepMinutes = 5,
	endMs = defaultEndMs(),
): number[] {
	return Array.from(
		{ length: count },
		(_, i) => endMs - (count - 1 - i) * stepMinutes * MINUTE_MS,
	);
}

/** A ramp of `count` points from `from` to `to` — readable, non-flat test data. */
export function ramp(
	count: number,
	from: number,
	to: number,
	endMs = defaultEndMs(),
): TimeSeriesPoint[] {
	const step = count > 1 ? (to - from) / (count - 1) : 0;
	return timestamps(count, 5, endMs).map((timestamp, i) => ({
		timestamp,
		value: from + step * i,
	}));
}

/**
 * `count` columns of `width` cells, every count non-zero and growing with both
 * time and bucket, so any hovered cell has a value and the colour domain is known:
 * 1 … count × width.
 */
export function heatmapPoints(
	count: number,
	width: number,
	endMs = defaultEndMs(),
): HeatmapPoint[] {
	return timestamps(count, 5, endMs).map((timestamp, i) => ({
		timestamp,
		counts: Array.from({ length: width }, (_, j) => (i + 1) * (j + 1)),
	}));
}

// ─── Payload builders ────────────────────────────────────────────────────

export const QueryRange = {
	/** Series must nest at `results[].aggregations[].series[]`. */
	timeSeries(series: SeriesSpec[], queryName = 'A'): QueryRangeBody {
		return envelope('time_series', [
			{
				queryName,
				aggregations: [
					{
						index: 0,
						alias: '',
						series: series.map((s) => ({
							labels: Object.entries(s.labels).map(([name, value]) => ({
								key: { name },
								value,
							})),
							values: s.points.map((p) => ({
								timestamp: p.timestamp,
								value: p.value,
							})),
						})),
					},
				],
			},
		]);
	},

	/** Rows are positional across `[...groupColumns, ...aggregationColumns]`. */
	scalar(options: {
		groupColumns?: string[];
		aggregationColumns?: string[];
		rows: (string | number)[][];
		queryName?: string;
	}): QueryRangeBody {
		const queryName = options.queryName ?? 'A';
		const group = (options.groupColumns ?? []).map((name) => ({
			name,
			queryName,
			columnType: 'group',
		}));
		const aggregation = (options.aggregationColumns ?? []).map((name, index) => ({
			name,
			queryName,
			columnType: 'aggregation',
			aggregationIndex: index,
		}));
		return envelope('scalar', [
			{ queryName, columns: [...group, ...aggregation], data: options.rows },
		]);
	},

	/** List rows. `timestamp` is RFC-3339 here, not epoch ms — per the contract. */
	raw(rows: Record<string, unknown>[], queryName = 'A'): QueryRangeBody {
		return envelope('raw', [
			{
				queryName,
				rows: rows.map((data) => ({
					timestamp:
						typeof data.timestamp === 'string'
							? data.timestamp
							: new Date(Number(data.timestamp ?? 0)).toISOString(),
					data,
				})),
			},
		]);
	},

	/**
	 * Bucket bounds sit on the aggregation's `meta`; without them the panel
	 * draws no grid. `series: []` is the heatmap's own no-data body.
	 */
	heatmap(
		buckets: number[],
		series: HeatmapSeriesSpec[],
		queryName = 'A',
	): QueryRangeBody {
		return envelope('heatmap', [
			{
				queryName,
				aggregations: [
					{
						index: 0,
						alias: '',
						meta: { buckets },
						series: series.map((s) => ({
							labels: Object.entries(s.labels).map(([name, value]) => ({
								key: { name },
								value,
							})),
							values: s.points.map((p) => ({
								timestamp: p.timestamp,
								values: p.counts,
							})),
						})),
					},
				],
			},
		]);
	},

	/** Successful but empty — drives `panel-no-data`. */
	empty(queryName = 'A'): QueryRangeBody {
		return envelope('time_series', [{ queryName, aggregations: [] }]);
	},

	/** Successful with a warning — drives the `panel-status-warning` indicator. */
	withWarning(body: QueryRangeBody, message: string): QueryRangeBody {
		return {
			...body,
			data: {
				...body.data,
				warning: { warnings: [{ message }], message },
			},
		};
	},
};

// ─── Route installers ────────────────────────────────────────────────────

function fulfill(route: Route, body: QueryRangeBody): Promise<void> {
	return route.fulfill({
		status: 200,
		contentType: 'application/json',
		body: JSON.stringify(body),
	});
}

/** Fulfil every query_range call with one pinned body. */
export async function mockQueryRange(
	page: Page,
	body: QueryRangeBody,
): Promise<void> {
	await page.route(QUERY_RANGE_GLOB, (route) => fulfill(route, body));
}

/** Fail every query_range call — drives `panel-error`. */
export async function mockQueryRangeError(
	page: Page,
	message = 'mocked query failure',
): Promise<void> {
	await page.route(QUERY_RANGE_GLOB, (route) =>
		route.fulfill({
			status: 500,
			contentType: 'application/json',
			body: JSON.stringify({
				status: 'error',
				error: { code: 'internal', message },
			}),
		}),
	);
}

/** Hold every query_range call until `release` is called, then serve `body`. */
export async function holdQueryRange(
	page: Page,
	body: QueryRangeBody,
): Promise<{ release: () => void }> {
	let release: () => void = () => undefined;
	const gate = new Promise<void>((resolve) => {
		release = resolve;
	});
	await page.route(QUERY_RANGE_GLOB, async (route) => {
		await gate;
		await fulfill(route, body);
	});
	return { release: () => release() };
}

/** Drop the interception so later navigation reaches the real backend again. */
export async function unmockQueryRange(page: Page): Promise<void> {
	await page.unroute(QUERY_RANGE_GLOB);
}

export function isQueryRange(url: string): boolean {
	return url.includes('/query_range');
}

/** A query_range request's `start` / `end`, in epoch ms, and which query it ran. */
export interface QueryWindow {
	start: number;
	end: number;
	/** The request type and composite query, serialized: equal for the same panel. */
	query: string;
}

/** The window of every query_range request `page` makes from now on. */
export function recordQueryWindows(page: Page): QueryWindow[] {
	const windows: QueryWindow[] = [];
	page.on('request', (request) => {
		if (!isQueryRange(request.url())) {
			return;
		}
		const body = request.postDataJSON() as {
			start?: unknown;
			end?: unknown;
			requestType?: unknown;
			compositeQuery?: unknown;
		} | null;
		if (typeof body?.start === 'number' && typeof body.end === 'number') {
			windows.push({
				start: body.start,
				end: body.end,
				query: JSON.stringify([body.requestType, body.compositeQuery]),
			});
		}
	});
	return windows;
}
