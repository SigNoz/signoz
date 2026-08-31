/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import type { MetricRangePayloadV5, RawRow } from 'types/api/v5/queryRange';

import {
	queryRangeV5EmptyResponse,
	queryRangeV5RawResponse,
	queryRangeV5ScalarResponse,
	queryRangeV5ScalarTableResponse,
	queryRangeV5TimeSeriesResponse,
	timeSeriesPoints,
} from '@/storybook/msw/__story_mockdata__/queryRange';

const SERVICES = [
	'checkout',
	'payments',
	'inventory',
	'notifications',
] as const;

const ROUTES = [
	'POST /v1/checkout',
	'GET /v1/cart',
	'POST /v1/payment/authorize',
	'GET /v1/inventory/:sku',
	'POST /v1/notifications/send',
] as const;

const STATUS_CODES = ['500', '502', '503'] as const;

const LOG_LEVELS = ['INFO', 'WARN', 'ERROR'] as const;

const pick = <T>(values: readonly T[], index: number): T =>
	values[index % values.length];

export interface PanelWindow {
	start: number;
	end: number;
}

/** One line per service, each with its own phase so the chart reads as a stack. */
const seriesByLabel = (
	{ start, end }: PanelWindow,
	label: string,
	values: readonly string[],
	base: number,
	amplitude: number,
): MetricRangePayloadV5 =>
	queryRangeV5TimeSeriesResponse([
		{
			queryName: 'A',
			series: values.map((value, index) => ({
				labels: [{ key: { name: label }, value }],
				values: timeSeriesPoints({
					start,
					end,
					base: base - index * (base / (values.length + 2)),
					amplitude,
					seed: index * 3,
				}),
			})),
		},
	]);

const singleSeries = ({ start, end }: PanelWindow): MetricRangePayloadV5 =>
	queryRangeV5TimeSeriesResponse([
		{
			queryName: 'A',
			series: [
				{
					labels: [],
					values: timeSeriesPoints({ start, end, base: 2.4, amplitude: 0.9 }),
				},
			],
		},
	]);

const logRows = ({ start, end }: PanelWindow, count: number): RawRow[] =>
	Array.from({ length: count }, (_unused, index) => {
		const severity = pick(LOG_LEVELS, index);
		const service = pick(SERVICES, index);

		return {
			timestamp: new Date(
				end - ((end - start) / Math.max(count, 1)) * index,
			).toISOString(),
			data: {
				id: `storybook-log-${index + 1}`,
				body: `${severity} ${service} completed ${pick(ROUTES, index)} in ${
					8 + index * 3
				}ms`,
				severity_text: severity,
				resources_string: { 'service.name': service },
			},
		};
	});

/**
 * Which answer a panel's request gets. Every panel names its query `A`, so the
 * request itself is what tells them apart: the request type, the group-by it
 * asks for, and the metric it aggregates.
 */
export interface PanelRequest {
	requestType: string;
	groupBy?: string;
	metricName?: string;
	window: PanelWindow;
}

const LOG_ROW_COUNT = 25;

export const panelResponse = ({
	requestType,
	groupBy,
	metricName,
	window,
}: PanelRequest): MetricRangePayloadV5 => {
	if (requestType === 'raw' || requestType === 'trace') {
		return queryRangeV5RawResponse(logRows(window, LOG_ROW_COUNT));
	}

	if (requestType === 'scalar') {
		if (groupBy === 'http.route') {
			return queryRangeV5ScalarTableResponse({
				groupBy: ['http.route'],
				aggregations: ['A'],
				rows: ROUTES.map((route, index) => [route, 4200 - index * 630]),
			});
		}

		if (groupBy) {
			return queryRangeV5ScalarTableResponse({
				groupBy: [groupBy],
				aggregations: ['A'],
				rows: SERVICES.map((service, index) => [service, 3800 - index * 720]),
			});
		}

		return queryRangeV5ScalarResponse(
			metricName === 'signoz_apdex' ? 0.94 : 812.6,
		);
	}

	if (groupBy === 'http.status_code') {
		return seriesByLabel(window, groupBy, STATUS_CODES, 18, 6);
	}

	if (groupBy) {
		return seriesByLabel(window, groupBy, SERVICES, 240, 55);
	}

	return singleSeries(window);
};

/** What a panel shows when the query runs but matches nothing. */
export const emptyPanelResponse = (): MetricRangePayloadV5 =>
	queryRangeV5EmptyResponse();

/** Values the `service` query variable offers. */
export const serviceVariableValues = (count: number): string[] =>
	Array.from({ length: count }, (_unused, index) =>
		index < SERVICES.length
			? SERVICES[index]
			: `${pick(SERVICES, index)}-${Math.floor(index / SERVICES.length) + 1}`,
	);

/** Values the dynamic `namespace` variable resolves from the fields endpoint. */
export const NAMESPACE_VALUES = [
	'checkout-prod',
	'payments-prod',
	'platform-prod',
] as const;
