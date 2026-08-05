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

type RequestType = 'time_series' | 'scalar' | 'raw' | 'trace';

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

export interface TimeSeriesPoint {
	timestamp: number;
	value: number;
}

export interface SeriesSpec {
	labels: Record<string, string>;
	points: TimeSeriesPoint[];
}

/** Evenly spaced epoch-ms timestamps ending at `endMs`. */
export function timestamps(
	count: number,
	stepMinutes = 5,
	endMs = Date.now(),
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
	endMs = Date.now(),
): TimeSeriesPoint[] {
	const step = count > 1 ? (to - from) / (count - 1) : 0;
	return timestamps(count, 5, endMs).map((timestamp, i) => ({
		timestamp,
		value: from + step * i,
	}));
}

/** A flat line — use when the assertion is about a specific value, not a shape. */
export function flat(
	count: number,
	value: number,
	endMs = Date.now(),
): TimeSeriesPoint[] {
	return timestamps(count, 5, endMs).map((timestamp) => ({
		timestamp,
		value,
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
		units?: Record<string, string>;
	}): QueryRangeBody {
		const queryName = options.queryName ?? 'A';
		const group = (options.groupColumns ?? []).map((name) => ({
			name,
			columnType: 'group',
			...(options.units?.[name] ? { meta: { unit: options.units[name] } } : {}),
		}));
		const aggregation = (options.aggregationColumns ?? []).map((name, index) => ({
			name,
			columnType: 'aggregation',
			aggregationIndex: index,
			...(options.units?.[name] ? { meta: { unit: options.units[name] } } : {}),
		}));
		return envelope('scalar', [
			{ queryName, columns: [...group, ...aggregation], data: options.rows },
		]);
	},

	/** List rows. `timestamp` is RFC-3339 here, not epoch ms — per the contract. */
	raw(
		rows: Record<string, unknown>[],
		options?: { queryName?: string; nextCursor?: string },
	): QueryRangeBody {
		return envelope('raw', [
			{
				queryName: options?.queryName ?? 'A',
				...(options?.nextCursor ? { nextCursor: options.nextCursor } : {}),
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

export interface MockOptions {
	/** Stop intercepting after N calls, letting later requests hit the backend. */
	times?: number;
}

/** Fulfil every query_range call with one pinned body. */
export async function mockQueryRange(
	page: Page,
	body: QueryRangeBody,
	options?: MockOptions,
): Promise<void> {
	let served = 0;
	await page.route(QUERY_RANGE_GLOB, async (route: Route) => {
		if (options?.times !== undefined && served >= options.times) {
			await route.fallback();
			return;
		}
		served += 1;
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify(body),
		});
	});
}

/** Fail every query_range call — drives `panel-error`. */
export async function mockQueryRangeError(
	page: Page,
	message = 'mocked query failure',
	options?: MockOptions & { status?: number },
): Promise<void> {
	let served = 0;
	await page.route(QUERY_RANGE_GLOB, async (route: Route) => {
		if (options?.times !== undefined && served >= options.times) {
			await route.fallback();
			return;
		}
		served += 1;
		await route.fulfill({
			status: options?.status ?? 500,
			contentType: 'application/json',
			body: JSON.stringify({
				status: 'error',
				error: { code: 'internal', message },
			}),
		});
	});
}

/** One body per call, repeating the last — for pagination and retry flows. */
export async function mockQueryRangeSequence(
	page: Page,
	bodies: QueryRangeBody[],
): Promise<void> {
	let call = 0;
	await page.route(QUERY_RANGE_GLOB, async (route: Route) => {
		const body = bodies[Math.min(call, bodies.length - 1)];
		call += 1;
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify(body),
		});
	});
}

/** Record request bodies without changing responses. */
export function recordQueryRange(page: Page): {
	requests: Record<string, unknown>[];
	install: () => Promise<void>;
} {
	const requests: Record<string, unknown>[] = [];
	return {
		requests,
		install: async () => {
			await page.route(QUERY_RANGE_GLOB, async (route: Route) => {
				const payload = route.request().postDataJSON() as Record<
					string,
					unknown
				> | null;
				if (payload) {
					requests.push(payload);
				}
				await route.fallback();
			});
		},
	};
}

/** Drop the interception so later navigation reaches the real backend again. */
export async function unmockQueryRange(page: Page): Promise<void> {
	await page.unroute(QUERY_RANGE_GLOB);
}
