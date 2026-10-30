/**
 * AI-owned. Generated and maintained by coding agents alongside the specs that
 * use it. Do not hand-edit: regenerate it with the spec that needs the change.
 */
import { postToSeeder } from '../../helpers/alerts/seeding';

import { seeded } from '../kit';

import type { MetricTypes } from './types';

const HISTOGRAM_BOUNDS = ['1', '2', '4', '+Inf'];

/** Ten minutes of a gauge and a cumulative histogram, names unique per worker. */
export const withMetricTypes = seeded(
	'metricTypes',
	async ({ page, workerIndex }) => {
		const suffix = `${workerIndex}_${Date.now()}`;
		const types: MetricTypes = {
			gauge: `e2e_qb_gauge_${suffix}`,
			histogram: `e2e_qb_histogram_${suffix}`,
		};
		const now = Date.now();
		const points: Record<string, unknown>[] = [];
		for (let minute = 0; minute < 10; minute += 1) {
			const timestamp = new Date(now - (10 - minute) * 60_000).toISOString();
			points.push({
				metric_name: types.gauge,
				labels: { host: 'qb-host' },
				timestamp,
				value: 10 + minute,
				type_: 'Gauge',
				temporality: 'Unspecified',
				is_monotonic: false,
			});
			HISTOGRAM_BOUNDS.forEach((le, bucket) => {
				points.push({
					metric_name: types.histogram,
					labels: { le },
					timestamp,
					value: (minute + 1) * (bucket + 1),
					type_: 'Histogram',
					temporality: 'Cumulative',
					is_monotonic: false,
				});
			});
		}
		await postToSeeder(page, '/telemetry/metrics', points);
		return types;
	},
);
