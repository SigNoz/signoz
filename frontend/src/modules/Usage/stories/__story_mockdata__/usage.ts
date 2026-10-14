/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import type { UsageDataItem } from 'store/actions';
import type { ServicesList } from 'types/api/metrics/getService';

export const USAGE_SERVICES = [
	'frontend',
	'checkout',
	'cart',
	'payment',
	'shipping',
];

/** The select is the only thing this page reads a service for. */
export const usageServicesResponse = (): {
	status: string;
	data: ServicesList[];
} => ({
	status: 'success',
	data: USAGE_SERVICES.map((serviceName, index) => ({
		serviceName,
		p99: 120_000_000 + index * 9_000_000,
		avgDuration: 40_000_000,
		numCalls: 12_000 + index * 3_100,
		callRate: 6.4 + index,
		numErrors: 0,
		errorRate: 0,
	})),
});

/**
 * The page asks for its window in nanoseconds and steps through it in seconds,
 * so the buckets are derived from the request rather than pinned: whichever
 * range and interval the selects are on, the bars fill it.
 */
export const usageResponse = (
	startInNanoseconds: number,
	endInNanoseconds: number,
	stepInSeconds: number,
	spansPerBucket: number,
): UsageDataItem[] => {
	const start = Math.floor(startInNanoseconds / 1e9);
	const end = Math.floor(endInNanoseconds / 1e9);
	const step = Math.max(stepInSeconds, 1);
	const buckets = Math.min(Math.max(Math.floor((end - start) / step), 0), 1000);

	return Array.from({ length: buckets }, (_unused, index) => ({
		timestamp: (start + index * step) * 1_000_000_000,
		count: Math.round(spansPerBucket * (0.7 + ((index * 37) % 60) / 100)),
	}));
};
