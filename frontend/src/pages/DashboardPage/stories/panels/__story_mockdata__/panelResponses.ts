/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import type { QueryRangeV5200 } from 'api/generated/services/sigNoz.schemas';
import type { Warning } from 'types/api';
import type { MetricRangePayloadV5, RawRow } from 'types/api/v5/queryRange';

import {
	queryRangeV5EmptyResponse,
	queryRangeV5HeatmapResponse,
	queryRangeV5RawResponse,
	queryRangeV5ScalarResponse,
	queryRangeV5ScalarTableResponse,
	queryRangeV5TimeSeriesResponse,
	timeSeriesPoints,
} from '@/storybook/msw/__story_mockdata__/queryRange';

import {
	HEATMAP_BUCKETS,
	HEATMAP_COLUMNS,
	HOLE,
	MAX_SERIES,
	NUMBER_VALUE,
	QUERY_NAME,
	serviceAt,
	TABLE_SECOND_COLUMN,
	TABLE_SECOND_VALUES,
	TABLE_VALUES,
} from './constants';
import type {
	Gaps,
	PanelRequest,
	PanelResponseArgs,
	PanelWindow,
} from './types';

export const PANEL_WARNING: Warning = {
	code: 'partial_data',
	message:
		'Some series were dropped: the metric changed temporality partway through the selected window.',
	url: 'https://signoz.io/docs/metrics-management/types-and-aggregation/',
	warnings: [{ message: 'Narrow the window to a period with one temporality.' }],
};

/** Every `query_range` the panel sent since the story mounted, oldest first. */
const requests: PanelRequest[] = [];

export const recordPanelRequest = (request: PanelRequest): void => {
	requests.push(request);
};

export const panelRequests = (): readonly PanelRequest[] => requests;

export const resetPanelRequests = (): void => {
	requests.length = 0;
};

/** One service's samples, as the time series response carries them. */
export const latencyPoints = (
	{ start, end }: PanelWindow,
	index: number,
	gaps: Gaps,
): { timestamp: number; value: number }[] =>
	timeSeriesPoints({
		start,
		end,
		base: 260 - index * 20,
		amplitude: 60,
		seed: index * 3,
	}).filter(
		(_point, position) =>
			gaps === 'none' || position < HOLE.from || position >= HOLE.to,
	);

/** The series index a service label was generated from. */
export const serviceIndex = (label: string): number =>
	Array.from({ length: MAX_SERIES }, (_unused, index) =>
		serviceAt(index),
	).indexOf(label);

const latencySeries = (
	window: PanelWindow,
	count: number,
	gaps: Gaps,
): MetricRangePayloadV5 =>
	queryRangeV5TimeSeriesResponse([
		{
			queryName: QUERY_NAME,
			series: Array.from({ length: count }, (_unused, index) => ({
				labels: [{ key: { name: 'service.name' }, value: serviceAt(index) }],
				values: latencyPoints(window, index, gaps),
			})),
		},
	]);

const heatmapCounts = (column: number, group: number): number[] =>
	Array.from(
		{ length: HEATMAP_BUCKETS.length + 1 },
		(_unused, row) =>
			1 + ((column * 7 + row * 3 + group * 5) % 17) * (row < 6 ? 3 : 1),
	);

/** The busiest cell once every group is summed into it, as the grid does. */
export const heatmapMaxCount = (groups: number): number => {
	let max = 0;
	for (let column = 0; column < HEATMAP_COLUMNS; column++) {
		for (let row = 0; row <= HEATMAP_BUCKETS.length; row++) {
			let sum = 0;
			for (let group = 0; group < groups; group++) {
				sum += heatmapCounts(column, group)[row];
			}
			max = Math.max(max, sum);
		}
	}

	return max;
};

const heatmapResponse = (
	{ start, end }: PanelWindow,
	count: number,
): QueryRangeV5200 => {
	const stepMs = (end - start) / HEATMAP_COLUMNS;

	return queryRangeV5HeatmapResponse({
		buckets: HEATMAP_BUCKETS,
		stepSeconds: Math.max(1, Math.round(stepMs / 1000)),
		series: Array.from({ length: count }, (_unused, group) => ({
			labels: [{ key: { name: 'service.name' }, value: serviceAt(group) }],
			values: Array.from({ length: HEATMAP_COLUMNS }, (_point, column) => ({
				timestamp: Math.round(start + column * stepMs),
				values: heatmapCounts(column, group),
			})),
		})),
	});
};

/** Spaced by the window, newest first, as the `timestamp desc` order asks for. */
const logRows = (
	{ start, end }: PanelWindow,
	total: number,
	offset: number,
	limit: number,
): RawRow[] =>
	Array.from(
		{ length: Math.max(0, Math.min(limit, total - offset)) },
		(_unused, position) => {
			const index = offset + position;
			const service = serviceAt(index % MAX_SERIES);

			return {
				timestamp: new Date(
					end - ((end - start) / Math.max(total, 1)) * index,
				).toISOString(),
				data: {
					id: `storybook-log-${index + 1}`,
					body: `log line ${index + 1}: ${service} served the request in ${
						8 + (index % 9) * 3
					}ms`,
					severity_text: index % 5 === 0 ? 'ERROR' : 'INFO',
					resources_string: { 'service.name': service },
				},
			};
		},
	);

const withWarning = <T extends MetricRangePayloadV5 | QueryRangeV5200>(
	payload: T,
	warn: boolean,
): T => {
	if (warn) {
		payload.data.warning = PANEL_WARNING;
	}

	return payload;
};

/** What the panel's `query_range` answers, per kind and result. */
export const panelQueryResponse = ({
	kind,
	result,
	series,
	listRows,
	gaps,
	window,
	offset,
	limit,
}: PanelResponseArgs): MetricRangePayloadV5 | QueryRangeV5200 => {
	if (result === 'empty') {
		return queryRangeV5EmptyResponse();
	}

	const warn = result === 'warning';

	switch (kind) {
		case 'Heatmap':
			return withWarning(heatmapResponse(window, series), warn);
		case 'Pie':
			return withWarning(
				queryRangeV5ScalarTableResponse({
					groupBy: ['service.name'],
					aggregations: [QUERY_NAME],
					rows: TABLE_VALUES(series).map((value, index) => [
						serviceAt(index),
						value,
					]),
				}),
				warn,
			);
		case 'Table': {
			const second = TABLE_SECOND_VALUES(series);

			return withWarning(
				queryRangeV5ScalarTableResponse({
					groupBy: ['service.name'],
					aggregations: [QUERY_NAME, TABLE_SECOND_COLUMN],
					rows: TABLE_VALUES(series).map((value, index) => [
						serviceAt(index),
						value,
						second[index],
					]),
				}),
				warn,
			);
		}
		case 'Number':
			return withWarning(queryRangeV5ScalarResponse(NUMBER_VALUE), warn);
		case 'List':
			return withWarning(
				queryRangeV5RawResponse(logRows(window, listRows, offset, limit)),
				warn,
			);
		default:
			return withWarning(latencySeries(window, series, gaps), warn);
	}
};
