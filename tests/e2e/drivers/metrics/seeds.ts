import type { APIRequestContext } from '@playwright/test';

import { seeded, type WorkerLayer } from '../kit';
import { postToSeeder } from '../telemetry';

/**
 * Metrics seeded through `POST /telemetry/metrics`.
 *
 * The seeder has no scoped delete and `test_teardown` truncates, so nothing here
 * is removed per spec. Every series carries the resource attribute `e2e.run`,
 * and every read scopes by it.
 */

/** Shape of `Metrics.from_dict` in `tests/fixtures/metrics.py`. */
export interface SeederMetric {
	metric_name: string;
	labels: Record<string, string>;
	resource_attrs: Record<string, string>;
	timestamp: string;
	value: number;
	type_: 'Gauge' | 'Sum' | 'Histogram';
	temporality: 'Cumulative' | 'Delta' | 'Unspecified';
	is_monotonic: boolean;
	unit: string;
	description: string;
}

export interface SeriesSpec {
	labels?: Record<string, string>;
	/**
	 * Also copied into `labels`: the query builder reads every filter key from
	 * the labels JSON, as the collector's exporter writes it.
	 */
	resource?: Record<string, string>;
}

export interface MetricSpec {
	name: string;
	type: SeederMetric['type_'];
	temporality?: SeederMetric['temporality'];
	unit?: string;
	description?: string;
	series: SeriesSpec[];
	/** Points per series, one per `stepSec`. Defaults to 30. */
	points?: number;
	stepSec?: number;
}

/**
 * Newest point this far before now. The summary and explorer only report a
 * series whose latest sample falls inside the window, and the seeder drops
 * future-stamped samples.
 */
const LATEST_SAMPLE_LAG_MS = 30_000;

export function metricRows(spec: MetricSpec): SeederMetric[] {
	const points = spec.points ?? 30;
	const stepMs = (spec.stepSec ?? 60) * 1000;
	const newest = Date.now() - LATEST_SAMPLE_LAG_MS;
	const monotonic = spec.type === 'Sum';
	return spec.series.flatMap((series, seriesIndex) =>
		Array.from({ length: points }, (_, i) => ({
			metric_name: spec.name,
			labels: { ...series.resource, ...series.labels },
			resource_attrs: series.resource ?? {},
			timestamp: new Date(newest - (points - 1 - i) * stepMs).toISOString(),
			value: monotonic ? (i + 1) * 10 : 10 + seriesIndex * 5 + (i % 5),
			type_: spec.type,
			temporality:
				spec.temporality ?? (spec.type === 'Gauge' ? 'Unspecified' : 'Cumulative'),
			is_monotonic: monotonic,
			unit: spec.unit ?? '',
			description: spec.description ?? '',
		})),
	);
}

export function seedMetric(
	request: APIRequestContext,
	spec: MetricSpec,
): Promise<void> {
	return postToSeeder(request, '/telemetry/metrics', metricRows(spec));
}

/** Metric names allow `[a-zA-Z0-9_]` only, so the stamp uses underscores. */
export function runStamp(workerIndex: number): string {
	return `w${workerIndex}_${Date.now()}`;
}

export function scopeExpression(run: string): string {
	return `e2e.run = '${run}'`;
}

export interface MetricsCatalogSeed {
	run: string;
	/** Gauge, unit `By`, description `e2e gauge`, three series. */
	gauge: string;
	/** Cumulative monotonic Sum, one series on its own service, no unit or description. */
	sum: string;
	/** `service.name` of the gauge's three series, in `host` order h1..h3. */
	services: string[];
	/** The filter expression that scopes a list to this worker's metrics. */
	scope: string;
}

export const withMetricsCatalog: WorkerLayer<{
	metricsCatalog: MetricsCatalogSeed;
}> = seeded('metricsCatalog', async ({ page, workerIndex }) => {
	const run = runStamp(workerIndex);
	const gauge = `e2e_mx_gauge_${run}`;
	const sum = `e2e_mx_sum_${run}`;
	const services = ['a', 'b', 'c'].map((s) => `e2e-mx-${s}-${run}`);
	const resource = { 'e2e.run': run };

	await seedMetric(page.request, {
		name: gauge,
		type: 'Gauge',
		unit: 'By',
		description: 'e2e gauge',
		series: services.map((service, i) => ({
			labels: { host: `h${i + 1}` },
			resource: { ...resource, 'service.name': service },
		})),
	});
	await seedMetric(page.request, {
		name: sum,
		type: 'Sum',
		temporality: 'Cumulative',
		series: [{ resource: { ...resource, 'service.name': `e2e-mx-sum-${run}` } }],
	});

	return { run, gauge, sum, services, scope: scopeExpression(run) };
});
