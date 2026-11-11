/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import type {
	MetricRangePayloadV5,
	QueryRangeRequestV5,
} from 'types/api/v5/queryRange';

import {
	queryRangeV5EmptyResponse,
	queryRangeV5ScalarResponse,
	queryRangeV5ScalarTableResponse,
	queryRangeV5TimeSeriesResponse,
	timeSeriesPoints,
} from '@/storybook/msw/__story_mockdata__/queryRange';

export const LLM_MODELS = [
	'gpt-4o',
	'claude-sonnet-4',
	'gemini-2.5-pro',
	'llama-3.1-70b',
];

export const LLM_ENVIRONMENTS = ['production', 'staging'];

export const LLM_SERVICES = ['assistant-api', 'summarizer', 'rag-indexer'];

const ERROR_TYPES = ['rate_limit', 'context_length', 'upstream_timeout'];

const SPAN_NAMES = [
	'chat gpt-4o',
	'chat claude-sonnet-4',
	'embeddings text-embedding-3-large',
	'tool web_search',
	'tool sql_query',
];

/** The three group-by keys every panel on this dashboard breaks down by. */
const GROUP_VALUES: Record<string, readonly string[]> = {
	'gen_ai.request.model': LLM_MODELS,
	'gen_ai.error.type': ERROR_TYPES,
	name: SPAN_NAMES,
};

interface PanelSpec {
	requestType: string;
	groupBy?: string;
	/** How many aggregations the query asked for, which is a column each. */
	aggregations: string[];
	start: number;
	end: number;
}

const readPanel = (body: QueryRangeRequestV5): PanelSpec => {
	const spec = body.compositeQuery?.queries?.[0]?.spec as
		| {
				groupBy?: Array<{ name: string }>;
				aggregations?: Array<{ expression?: string }>;
		  }
		| undefined;

	return {
		requestType: body.requestType ?? 'time_series',
		groupBy: spec?.groupBy?.[0]?.name,
		aggregations: (spec?.aggregations ?? [{}]).map(
			(aggregation) => aggregation.expression ?? '',
		),
		start: body.start,
		end: body.end,
	};
};

const valuesFor = (groupBy: string, count: number): string[] =>
	(GROUP_VALUES[groupBy] ?? LLM_MODELS).slice(0, count);

/**
 * The single-number tiles all come back as one scalar, so the figure is read off
 * what the tile aggregates rather than being the same everywhere.
 */
const SCALAR_BY_AGGREGATION: Array<[string, number]> = [
	['gen_ai.usage.cost', 1_284.37],
	['gen_ai.usage', 48_216_400],
	['gen_ai.server.ttft', 412],
	['duration_nano', 2_840_000_000],
	['has_error', 0.021],
];

const scalarFor = (aggregations: string[]): number => {
	const expression = aggregations.join(' ');
	const match = SCALAR_BY_AGGREGATION.find(([needle]) =>
		expression.includes(needle),
	);

	return match ? match[1] : 812.6;
};

/**
 * Every panel names its query `A`, so the request is what tells them apart: the
 * request type says number, table or chart, the group-by says which breakdown
 * the legend carries, and the aggregations say how many columns a table has.
 */
export const llmPanelResponse = (
	body: QueryRangeRequestV5,
	seriesCount: number,
): MetricRangePayloadV5 => {
	const { requestType, groupBy, aggregations, start, end } = readPanel(body);

	if (seriesCount === 0) {
		return queryRangeV5EmptyResponse();
	}

	if (requestType === 'scalar') {
		if (groupBy) {
			return queryRangeV5ScalarTableResponse({
				groupBy: [groupBy],
				aggregations: aggregations.map((_unused, index) => ({
					queryName: 'A',
					aggregationIndex: index,
				})),
				rows: valuesFor(groupBy, seriesCount).map((value, rowIndex) => [
					value,
					...aggregations.map(
						(_unused, index) => 4_180 - rowIndex * 620 + index * 940,
					),
				]),
			});
		}

		return queryRangeV5ScalarResponse(scalarFor(aggregations));
	}

	if (!groupBy) {
		return queryRangeV5TimeSeriesResponse([
			{
				queryName: 'A',
				series: [
					{
						labels: [],
						values: timeSeriesPoints({ start, end, base: 640, amplitude: 180 }),
					},
				],
			},
		]);
	}

	return queryRangeV5TimeSeriesResponse([
		{
			queryName: 'A',
			series: valuesFor(groupBy, seriesCount).map((value, index) => ({
				labels: [{ key: { name: groupBy }, value }],
				values: timeSeriesPoints({
					start,
					end,
					base: 520 - index * 90,
					amplitude: 140,
					seed: index * 4,
				}),
			})),
		},
	]);
};
