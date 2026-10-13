/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import type { ServicesList } from 'types/api/metrics/getService';

export const SERVICE_NAME = 'checkout';

/**
 * Span names an under-instrumented service reports: an id baked into the path is
 * what makes each request its own entry point, which is the case this page is
 * shown for.
 */
const operationName = (index: number): string =>
	`GET /api/orders/${(918_400 + index * 137).toString(16)}/status`;

/**
 * `dataWarning.topLevelOps` on the page's own service is the whole payload it
 * reads; every other service is there so the list is not the only row.
 */
export const servicesWithTopLevelOpsResponse = (
	operations: number,
): { status: string; data: ServicesList[] } => ({
	status: 'success',
	data: [
		{
			serviceName: SERVICE_NAME,
			p99: 184_000_000,
			avgDuration: 61_000_000,
			numCalls: 42_100,
			callRate: 23.4,
			numErrors: 190,
			errorRate: 0.45,
			dataWarning: {
				topLevelOps: Array.from({ length: operations }, (_unused, index) =>
					operationName(index),
				),
			},
		},
		{
			serviceName: 'cart',
			p99: 96_000_000,
			avgDuration: 31_000_000,
			numCalls: 18_600,
			callRate: 10.3,
			numErrors: 0,
			errorRate: 0,
		},
	],
});
