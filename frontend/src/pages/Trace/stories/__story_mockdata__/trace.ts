/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import type { PayloadProps as SpanFiltersPayload } from 'types/api/trace/getFilters';
import type { PayloadProps as SpanAggregatePayload } from 'types/api/trace/getSpanAggregate';
import type { PayloadProps as SpansPayload } from 'types/api/trace/getSpans';
import type { PayloadProps as TagFiltersPayload } from 'types/api/trace/getTagFilters';
import type { PayloadProps as TagValuesPayload } from 'types/api/trace/getTagValue';

const SERVICES = ['frontend', 'checkout', 'cart', 'payment', 'shipping'];

const OPERATIONS = [
	'HTTP GET /',
	'POST /api/checkout',
	'payment.authorize',
	'shipping.quote',
	'SELECT orders',
];

const HTTP_ROUTES = ['/', '/api/checkout', '/api/cart', '/api/payment'];

/**
 * Every filter panel on the page reads one key off this map, and the number
 * beside each value is the span count the panel shows.
 */
const FILTER_VALUES: Record<string, string[]> = {
	serviceName: SERVICES,
	operation: OPERATIONS,
	httpHost: ['signoz.io', 'api.signoz.io'],
	httpMethod: ['GET', 'POST', 'PUT'],
	httpRoute: HTTP_ROUTES,
	httpUrl: HTTP_ROUTES.map((route) => `https://signoz.io${route}`),
	responseStatusCode: ['200', '400', '500'],
	rpcMethod: ['oteldemo.CartService/GetCart', 'oteldemo.CheckoutService/Place'],
	status: ['ok', 'error'],
	traceID: [],
};

const countAt = (index: number): string => String(4_200 - index * 630);

export const spanFiltersResponse = (
	requested: string[],
	values: number,
): SpanFiltersPayload =>
	Object.fromEntries(
		requested.map((key) => [
			key,
			key === 'duration'
				? { maxDuration: '4200000000', minDuration: '180000' }
				: Object.fromEntries(
						(FILTER_VALUES[key] ?? [])
							.slice(0, values)
							.map((value, index) => [value, countAt(index)]),
					),
		]),
	);

const spanId = (index: number): string =>
	((0x51ad * (index + 1) * 2_654_435_761) >>> 0).toString(16).padStart(16, '0');

export const spansAggregateResponse = (
	rows: number,
	total: number,
	offset: number,
): SpanAggregatePayload => ({
	totalSpans: total,
	spans: Array.from({ length: rows }, (_unused, position) => {
		const index = offset + position;

		return {
			timestamp: new Date(1_766_000_000_000 - index * 1_500).toISOString(),
			spanID: spanId(index),
			traceID: `${spanId(index)}${spanId(index + 1)}`,
			serviceName: SERVICES[index % SERVICES.length],
			operation: OPERATIONS[index % OPERATIONS.length],
			durationNano: 180_000_000 + (index % 7) * 46_000_000,
			statusCode: index % 6 === 0 ? '500' : '200',
			method: index % 3 === 0 ? 'POST' : 'GET',
		};
	}),
});

/** The graph above the table: one bucket per step across the selected window. */
export const spansGraphResponse = (
	startInNanoseconds: number,
	endInNanoseconds: number,
	stepInSeconds: number,
	base: number,
): SpansPayload => {
	const start = Math.floor(startInNanoseconds / 1e9);
	const end = Math.floor(endInNanoseconds / 1e9);
	const step = Math.max(stepInSeconds, 1);
	const buckets = Math.min(Math.max(Math.floor((end - start) / step), 0), 400);

	return {
		items: Object.fromEntries(
			Array.from({ length: buckets }, (_unused, index) => {
				const timestamp = (start + index * step) * 1_000_000_000;

				return [
					String(timestamp),
					{
						timestamp,
						value: Math.round(base * (0.7 + ((index * 37) % 60) / 100)),
					},
				];
			}),
		),
	};
};

/** Keys the tag modal offers, split the way the legacy endpoint types them. */
export const tagFiltersResponse = (): TagFiltersPayload => ({
	stringTagKeys: [
		'service.name',
		'http.method',
		'http.route',
		'deployment.environment',
	],
	numberTagKeys: ['http.status_code', 'duration_ms'],
	boolTagKeys: ['error'],
});

export const tagValuesResponse = (): TagValuesPayload => ({
	stringTagValues: SERVICES,
	numberTagValues: [200, 400, 500],
	boolTagValues: [true, false],
});
