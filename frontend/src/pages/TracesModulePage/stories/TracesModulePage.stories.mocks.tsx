/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { rest } from 'msw';
import remove from 'api/browser/localstorage/remove';
import set from 'api/browser/localstorage/set';
import { LOCALSTORAGE } from 'constants/localStorage';
import { QueryParams } from 'constants/query';
import ROUTES from 'constants/routes';
import { USER_PREFERENCES } from 'constants/userPreferences';
import { ExplorerViews } from 'pages/LogsExplorer/utils';
import { spanPercentilesResponse } from 'pages/TraceDetailsV3/stories/__story_mockdata__/traceDetails';
import type { QueryRangeRequestV5 } from 'types/api/v5/queryRange';
import { explorerViewToPanelType } from 'utils/explorerUtils';

import {
	choiceControl,
	countControl,
	toggleControl,
} from '@/storybook/controls/controls';
import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';
import { fieldValuesResponse } from '@/storybook/msw/__story_mockdata__/fields';
import {
	queryRangeV5RawResponse,
	queryRangeV5ScalarResponse,
	queryRangeV5TimeSeriesResponse,
	timeSeriesPoints,
} from '@/storybook/msw/__story_mockdata__/queryRange';

import {
	exportDashboardsResponse,
	savedTraceViewsResponse,
	SPAN_LOGS_STATES,
	spanLogRows,
	spanLogScopeOf,
	type SpanLogsState,
	traceAttributeValuesResponse,
	traceFieldKeysResponse,
	traceFieldValues,
	traceFunnelsResponse,
	traceQuickFiltersResponse,
	traceRootSpanRows,
	traceSpanRows,
	TRACE_SUMMARY_STATES,
	traceSummaryResponse,
	TRACES_EXPLORER_VIEWS,
	TRACES_TABS,
	type TraceSummaryState,
	type TracesTab,
} from './__story_mockdata__/traces';

const VIEW = 'Traces · view';
const LIST = 'Traces · list';
const FILTERS = 'Traces · filters';
const SAVED = 'Traces · saved';

interface RouteValues {
	tab: TracesTab;
	view: ExplorerViews;
}

const tracesRoute = ({ tab, view }: RouteValues): string => {
	if (tab === 'funnels') {
		return ROUTES.TRACES_FUNNELS;
	}

	const params = new URLSearchParams({
		[QueryParams.panelTypes]: JSON.stringify(explorerViewToPanelType[view]),
		[QueryParams.selectedExplorerView]: view,
	});

	return `${ROUTES.TRACES_EXPLORER}?${params.toString()}`;
};

interface RawQuerySpec {
	limit?: number;
	offset?: number;
	signal?: string;
	filter?: { expression?: string };
}

const rawSpecOf = (body: QueryRangeRequestV5): RawQuerySpec => {
	const spec = body.compositeQuery?.queries?.[0]?.spec ?? {};

	return spec as RawQuerySpec;
};

// The summary has no window of its own; its bounds wrap the span the list showed.
const listWindow = { start: 0, end: 0 };

export const tracesMocks = defineStoryMocks({
	controls: {
		tab: choiceControl<TracesTab>('Tab', {
			group: VIEW,
			description:
				'The two pathnames the module tabs between. Clicking another tab leaves the story, so switch it here.',
			options: TRACES_TABS,
			value: 'explorer',
		}),
		view: choiceControl<ExplorerViews>('Explorer view', {
			group: VIEW,
			description:
				'Which of the explorer views renders: spans, root spans, a chart or an aggregation table.',
			options: TRACES_EXPLORER_VIEWS,
			value: ExplorerViews.LIST,
		}),
		spans: countControl('Spans', {
			group: LIST,
			description:
				'Spans the endpoint has, one root span per trace in the Trace view. The list loads 100 more as it scrolls to the end; the Trace view pages 10 at a time.',
			value: 24,
			max: 250,
		}),
		errors: toggleControl('Failing spans', {
			group: LIST,
			description:
				'Answers 503 on the spans of the services that fail, which is what the status column and the error colouring read.',
			value: true,
		}),
		spanDrawer: toggleControl('Span drawer', {
			group: LIST,
			description:
				'The `TRACES_SPAN_DRAWER_ENABLED` localStorage flag the span drawer ships behind. Off, a row click opens the trace page.',
			value: false,
		}),
		traceSummary: choiceControl<TraceSummaryState>('Trace summary', {
			group: LIST,
			description:
				'What the span drawer gets for the trace start and end. Not found falls back to span-only logs; loading holds the logs tab.',
			options: TRACE_SUMMARY_STATES,
			value: 'found',
		}),
		spanLogs: choiceControl<SpanLogsState>('Span logs', {
			group: LIST,
			description:
				"What the span drawer's Logs tab gets. `span`: the span's logs with context either side; `trace only`: none for the span but some for the trace; `none`; `loading` and `error` hold or fail only the log queries.",
			options: SPAN_LOGS_STATES,
			value: 'span',
		}),
		warning: toggleControl('Query warning', {
			group: LIST,
			description: 'Attaches a warning to the response, next to the toolbar.',
			value: false,
		}),
		quickFilters: countControl('Quick filters', {
			group: FILTERS,
			description:
				'Filters the org has configured for traces. At 0 the panel shows its empty state.',
			value: 6,
			max: 8,
		}),
		savedViews: countControl('Saved views', {
			group: SAVED,
			description: 'Fills the saved views list beside the explorer.',
			value: 4,
			max: 8,
		}),
		funnels: countControl('Funnels', {
			group: SAVED,
			description: 'Fills the Funnels tab.',
			value: 3,
			max: 6,
		}),
	},
	handlers: (values, response) => [
		rest.get(
			'http://localhost/api/v2/quick_filters/:source',
			response.json(() => traceQuickFiltersResponse(values.quickFilters)),
		),

		rest.get(
			'http://localhost/api/v1/fields/keys',
			response.json((req) =>
				traceFieldKeysResponse(req.url.searchParams.get('searchText')),
			),
		),

		rest.get(
			'http://localhost/api/v1/fields/values',
			response.json((req) =>
				fieldValuesResponse(traceFieldValues(req.url.searchParams.get('name'))),
			),
		),

		rest.get(
			'http://localhost/api/v3/autocomplete/attribute_values',
			response.json((req) =>
				traceAttributeValuesResponse(req.url.searchParams.get('attributeKey')),
			),
		),

		rest.get(
			'http://localhost/api/v2/saved_views',
			response.json(() => savedTraceViewsResponse(values.savedViews)),
		),

		rest.get(
			'http://localhost/api/v1/trace-funnels/list',
			response.json(() => traceFunnelsResponse(values.funnels)),
		),

		rest.get(
			'http://localhost/api/v2/users/me/dashboards',
			response.json(exportDashboardsResponse),
		),

		rest.post(
			'http://localhost/api/v1/span_percentile',
			response.json(spanPercentilesResponse),
		),

		// Answers on its own control rather than the Data one, so the drawer's
		// fallback and waiting states are reachable with the list loaded.
		rest.get(
			'http://localhost/api/v1/traces/:traceId/summary',
			(req, res, ctx) => {
				if (values.traceSummary === 'loading') {
					return res(ctx.delay('infinite'));
				}
				const summary =
					values.traceSummary === 'found'
						? traceSummaryResponse({
								traceId: String(req.params.traceId),
								count: values.spans,
								...listWindow,
							})
						: null;

				return summary
					? res(ctx.status(200), ctx.json(summary))
					: res(ctx.status(404), ctx.json({ status: 'error' }));
			},
		),

		// The drawer's percentile panel dereferences this preference without a guard.
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
							? ['service.name']
							: [],
				},
			})),
		),

		// The drawer's log queries answer on their own control, so they can hang or
		// fail with the list loaded. Anything else falls through to the next handler.
		rest.post('http://localhost/api/v5/query_range', async (req, res, ctx) => {
			const body = (await req.json()) as QueryRangeRequestV5;
			const { signal, filter } = rawSpecOf(body);
			if (signal !== 'logs') {
				return undefined;
			}
			if (values.spanLogs === 'loading') {
				return res(ctx.delay('infinite'));
			}
			if (values.spanLogs === 'error') {
				return res(
					ctx.status(500),
					ctx.json({ status: 'error', error: 'storybook logs failure' }),
				);
			}

			const expression = filter?.expression ?? '';
			const scope = spanLogScopeOf(expression);
			const answers =
				values.spanLogs === 'span' ||
				(values.spanLogs === 'trace only' && scope === 'trace');

			return res(
				ctx.status(200),
				ctx.json(
					queryRangeV5RawResponse(
						answers
							? spanLogRows({
									scope,
									expression,
									startMicros: body.start,
									endMicros: body.end,
								})
							: [],
					),
				),
			);
		}),

		rest.post(
			'http://localhost/api/v5/query_range',
			response.json(async (req) => {
				const body = (await req.json()) as QueryRangeRequestV5;
				const { start, end, requestType } = body;
				const { limit = 10, offset = 0 } = rawSpecOf(body);

				const rows = {
					count: values.spans,
					offset,
					limit,
					start,
					end,
					errors: values.errors,
				};

				const warning = values.warning
					? {
							code: 'storybook_warning',
							message: 'Query scanned more rows than the limit allows.',
							url: '',
							warnings: [],
						}
					: undefined;

				if (requestType === 'raw' || requestType === 'trace') {
					listWindow.start = start;
					listWindow.end = end;

					return queryRangeV5RawResponse(
						requestType === 'trace' ? traceRootSpanRows(rows) : traceSpanRows(rows),
						{
							type: requestType,
							hasMore: offset + limit < values.spans,
							warning,
						},
					);
				}

				if (requestType === 'scalar') {
					return queryRangeV5ScalarResponse(values.spans, 'A', { warning });
				}

				return queryRangeV5TimeSeriesResponse(
					[
						{
							queryName: 'A',
							series: [
								{
									labels: [],
									values: timeSeriesPoints({
										start,
										end,
										base: 420,
										amplitude: 120,
									}),
								},
							],
						},
					],
					{ warning },
				);
			}),
		),
	],
	config: (values) => ({ route: tracesRoute(values) }),
	effect: (values) => {
		if (values.spanDrawer) {
			set(LOCALSTORAGE.TRACES_SPAN_DRAWER_ENABLED, 'true');
		} else {
			remove(LOCALSTORAGE.TRACES_SPAN_DRAWER_ENABLED);
		}
	},
});
