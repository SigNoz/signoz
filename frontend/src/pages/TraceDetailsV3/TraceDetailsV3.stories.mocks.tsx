/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { rest } from 'msw';
import set from 'api/browser/localstorage/set';
import {
	TelemetrytypesFieldContextDTO,
	TelemetrytypesSignalDTO,
} from 'api/generated/services/sigNoz.schemas';
import type { SpantypesPostableTraceAggregationsDTO } from 'api/generated/services/sigNoz.schemas';
import { LOCALSTORAGE } from 'constants/localStorage';
import { USER_PREFERENCES } from 'constants/userPreferences';
import type { QueryRangeRequestV5 } from 'types/api/v5/queryRange';

import {
	choiceControl,
	countControl,
	toggleControl,
} from '@/storybook/controls/controls';
import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';
import {
	fieldKeysResponse,
	fieldValuesResponse,
} from '@/storybook/msw/__story_mockdata__/fields';
import {
	queryRangeV5RawResponse,
	queryRangeV5ScalarResponse,
	queryRangeV5TimeSeriesResponse,
	timeSeriesPoints,
} from '@/storybook/msw/__story_mockdata__/queryRange';

import { SpanDetailVariant } from './SpanDetailsPanel/constants';
import {
	focusSpanIndex,
	spanIdAt,
	spanLogRows,
	type SpanLogScope,
	spanMatchRows,
	spanPercentilesResponse,
	STORY_TRACE_ID,
	traceAggregationsResponse,
	traceDetailFieldKeys,
	traceDetailFieldValues,
	traceFlamegraphResponse,
	traceWaterfallResponse,
} from './__story_mockdata__/traceDetails';

const TRACE = 'Trace · trace';
const PANEL = 'Trace · span panel';

const PANEL_POSITIONS = [
	SpanDetailVariant.DOCKED_RIGHT,
	SpanDetailVariant.DOCKED,
	SpanDetailVariant.DIALOG,
] as const;

/**
 * The trace starts two minutes back, so the header's absolute times read as a
 * trace that just came in rather than one from the fixture's epoch.
 */
const TRACE_AGE_MS = 2 * 60 * 1000;

const traceStartOf = (): number => Date.now() - TRACE_AGE_MS;

const specOf = (
	body: QueryRangeRequestV5,
):
	| QueryRangeRequestV5['compositeQuery']['queries'][number]['spec']
	| undefined => body.compositeQuery?.queries?.[0]?.spec;

const signalOf = (body: QueryRangeRequestV5): string | undefined => {
	const spec = specOf(body);

	return spec && 'signal' in spec ? spec.signal : undefined;
};

/** Which of the panel's three log queries this is, read off its filter. */
const spanLogScopeOf = (body: QueryRangeRequestV5): SpanLogScope => {
	const spec = specOf(body);
	const expression =
		(spec && 'filter' in spec ? spec.filter?.expression : '') ?? '';

	if (expression.includes('span_id')) {
		return 'span';
	}

	if (expression.includes('id <')) {
		return 'before';
	}

	return expression.includes('id >') ? 'after' : 'trace';
};

export const traceDetailsMocks = defineStoryMocks({
	controls: {
		spans: countControl('Spans', {
			group: TRACE,
			description:
				'Spans the trace has, spread over a balanced tree. At 0 the page shows the "we cannot show this trace" state.',
			value: 15,
			max: 60,
		}),
		errors: toggleControl('Failing spans', {
			group: TRACE,
			description:
				'Marks the payment and shipping spans as errored, each with an exception event, which is what the error counts and the red bars read.',
			value: true,
		}),
		missingSpans: toggleControl('Missing spans', {
			group: TRACE,
			description:
				'Sets hasMissingSpans, the banner for a trace whose spans have not all arrived.',
			value: false,
		}),
		spanPanel: toggleControl('Span details panel', {
			group: PANEL,
			description:
				'Opens the panel on the first failing span, the way a spanId in the URL does.',
			value: true,
		}),
		panelPosition: choiceControl<SpanDetailVariant>('Panel position', {
			group: PANEL,
			description:
				'Where the panel docks. The page remembers this in localStorage, so the control seeds it before the page mounts.',
			options: PANEL_POSITIONS,
			value: SpanDetailVariant.DOCKED_RIGHT,
		}),
		spanLogs: countControl('Span log rows', {
			group: PANEL,
			description: 'Rows the Logs tab of the panel answers with.',
			value: 8,
			max: 20,
		}),
	},
	handlers: (values, response) => {
		const trace = {
			spans: values.spans,
			errors: values.errors,
			traceStart: traceStartOf(),
		};

		return [
			rest.post(
				'http://localhost/api/v4/traces/:traceId/waterfall',
				response.json(() =>
					traceWaterfallResponse({ ...trace, missingSpans: values.missingSpans }),
				),
			),

			rest.post(
				'http://localhost/api/v3/traces/:traceId/flamegraph',
				response.json(() => traceFlamegraphResponse(trace)),
			),

			rest.post(
				'http://localhost/api/v1/traces/:traceId/aggregations',
				response.json(async (req) => {
					const body = (await req.json()) as SpantypesPostableTraceAggregationsDTO;

					return traceAggregationsResponse(body.aggregations ?? [], trace);
				}),
			),

			rest.post(
				'http://localhost/api/v1/span_percentile',
				response.json(spanPercentilesResponse),
			),

			// The percentile panel reads the attributes it compares on straight from
			// the preference, and dereferences its value without a guard.
			rest.get(
				'http://localhost/api/v1/user/preferences/:name',
				response.json((req) => ({
					status: 'success',
					data: {
						name: String(req.params.name),
						description: 'storybook',
						valueType: 'array',
						defaultValue: [],
						allowedValues: [],
						allowedScopes: ['user'],
						value:
							String(req.params.name) ===
							USER_PREFERENCES.SPAN_PERCENTILE_RESOURCE_ATTRIBUTES
								? ['service.name', 'deployment.environment']
								: [],
					},
				})),
			),

			rest.get(
				'http://localhost/api/v1/fields/keys',
				response.json((req) =>
					fieldKeysResponse(
						traceDetailFieldKeys(req.url.searchParams.get('searchText')),
						{
							signal: TelemetrytypesSignalDTO.traces,
							fieldContext: TelemetrytypesFieldContextDTO.span,
						},
					),
				),
			),

			rest.get(
				'http://localhost/api/v1/fields/values',
				response.json((req) =>
					fieldValuesResponse(
						traceDetailFieldValues(req.url.searchParams.get('name')),
					),
				),
			),

			rest.post(
				'http://localhost/api/v5/query_range',
				response.json(async (req) => {
					const body = (await req.json()) as QueryRangeRequestV5;
					const { start, end, requestType } = body;

					if (requestType === 'raw') {
						return queryRangeV5RawResponse(
							signalOf(body) === 'logs'
								? spanLogRows(values.spanLogs, trace, spanLogScopeOf(body))
								: spanMatchRows(trace),
						);
					}

					if (requestType === 'scalar') {
						return queryRangeV5ScalarResponse(values.spans);
					}

					return queryRangeV5TimeSeriesResponse([
						{
							queryName: 'A',
							series: [
								{
									labels: [],
									values: timeSeriesPoints({
										start,
										end,
										base: 64,
										amplitude: 22,
									}),
								},
							],
						},
					]);
				}),
			),
		];
	},
	config: (values) => ({
		route: values.spanPanel
			? `/trace/${STORY_TRACE_ID}?spanId=${spanIdAt(focusSpanIndex(values.spans))}`
			: `/trace/${STORY_TRACE_ID}`,
	}),
	effect: (values) => {
		set(LOCALSTORAGE.TRACE_DETAILS_SPAN_DETAILS_POSITION, values.panelPosition);
	},
});
