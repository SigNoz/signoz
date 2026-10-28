import type { Threshold } from 'lib/uPlotV2/hooks/types';

import { ScatterAxisScale, type ScatterSeries } from './types';

const SERVICES = [
	'frontend',
	'cart',
	'checkout',
	'payment',
	'shipping',
	'currency',
	'email',
	'recommendation',
	'ads',
	'product-catalog',
];

export type Shape = 'spread' | 'single' | 'sameX';

export interface ScatterStoryProps {
	groups: number;
	pointsPerGroup: number;
	/** Adds an error-count size column. */
	sized: boolean;
	xScale: ScatterAxisScale;
	yScale: ScatterAxisScale;
	/** Zeroes a share of y values, which forces the symmetric log. */
	withZeros: boolean;
	shape: Shape;
	thresholds: boolean;
	pointSize: number;
	/** 0–1. */
	fillOpacity: number;
	width: number;
	height: number;
}

/** Deterministic, so a story renders the same points on every run. */
function createRng(seed: number): () => number {
	let state = seed >>> 0;
	return (): number => {
		state = (state * 1664525 + 1013904223) >>> 0;
		return state / 2 ** 32;
	};
}

export function buildSeries({
	groups,
	pointsPerGroup,
	sized,
	withZeros,
	shape,
}: ScatterStoryProps): ScatterSeries[] {
	const rng = createRng(42);
	return Array.from({ length: groups }, (_, groupIndex) => {
		const label = SERVICES[groupIndex % SERVICES.length];
		// Each service sits in its own throughput/latency band, so groups are telling
		// apart rather than one cloud.
		const baseThroughput = 20 * 2 ** (groupIndex % 5);
		const baseLatency = 40 + 60 * (groupIndex % 4);

		const count = shape === 'single' ? 1 : pointsPerGroup;
		const xs: number[] = [];
		const ys: number[] = [];
		const sizes: Array<number | null> = [];

		for (let i = 0; i < count; i++) {
			const throughput =
				shape === 'sameX' ? baseThroughput : baseThroughput * (0.5 + rng() * 1.5);
			// Latency grows with load, plus noise; the odd outlier keeps the axis honest.
			const outlier = rng() < 0.03 ? 4 + rng() * 6 : 1;
			let latency =
				baseLatency *
				(0.8 + (throughput / baseThroughput) * 0.4 + rng() * 0.3) *
				outlier;
			if (withZeros && rng() < 0.2) {
				latency = 0;
			}
			xs.push(Number(throughput.toFixed(2)));
			ys.push(Number(latency.toFixed(2)));
			sizes.push(rng() < 0.1 ? null : Math.round(rng() * rng() * 500));
		}

		return sized ? { label, xs, ys, sizes } : { label, xs, ys };
	});
}

export const THRESHOLDS: Threshold[] = [
	{
		thresholdValue: 300,
		thresholdUnit: 'ms',
		thresholdColor: '#E5484D',
		thresholdLabel: 'p99 SLO',
	},
];
