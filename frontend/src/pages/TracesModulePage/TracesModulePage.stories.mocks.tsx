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
import { LOCALSTORAGE } from 'constants/localStorage';
import { QueryParams } from 'constants/query';
import ROUTES from 'constants/routes';
import { ExplorerViews } from 'pages/LogsExplorer/utils';
import type { QueryRangeRequestV5 } from 'types/api/v5/queryRange';
import { explorerViewToPanelType } from 'utils/explorerUtils';

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

import {
	exportDashboardsResponse,
	savedTraceViewsResponse,
	traceAttributeValuesResponse,
	traceFieldKeys,
	traceFieldValues,
	traceFunnelsResponse,
	traceQuickFiltersResponse,
	traceRootSpanRows,
	traceSpanRows,
	TRACES_EXPLORER_VIEWS,
	TRACES_TABS,
	type TracesTab,
} from './__story_mockdata__/traces';

const VIEW = 'Traces · view';
const LIST = 'Traces · list';
const FILTERS = 'Traces · filters';
const SAVED = 'Traces · saved';

const RESOURCE_KEYS = ['service.name', 'deployment.environment'];

/**
 * Resource and span keys come back from one call, each under its own context,
 * so the query builder groups the suggestions the way it does against a real
 * backend.
 */
const traceFieldKeysResponse = (
	searchText: string | null,
): ReturnType<typeof fieldKeysResponse> => {
	const names = traceFieldKeys(searchText);
	const context = (name: string): TelemetrytypesFieldContextDTO =>
		RESOURCE_KEYS.includes(name)
			? TelemetrytypesFieldContextDTO.resource
			: TelemetrytypesFieldContextDTO.span;

	const byContext = [
		TelemetrytypesFieldContextDTO.resource,
		TelemetrytypesFieldContextDTO.span,
	].map((fieldContext) =>
		fieldKeysResponse(
			names.filter((name) => context(name) === fieldContext),
			{ signal: TelemetrytypesSignalDTO.traces, fieldContext },
		),
	);

	return {
		status: 'success',
		data: {
			complete: true,
			keys: Object.assign({}, ...byContext.map(({ data }) => data?.keys)),
		},
	};
};

interface RouteValues {
	tab: TracesTab;
	view: ExplorerViews;
}

const tracesRoute = ({ tab, view }: RouteValues): string => {
	if (tab === 'funnels') {
		return ROUTES.TRACES_FUNNELS;
	}

	if (tab === 'views') {
		return ROUTES.TRACES_SAVE_VIEWS;
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
}

const rawSpecOf = (body: QueryRangeRequestV5): RawQuerySpec => {
	const spec = body.compositeQuery?.queries?.[0]?.spec ?? {};

	return spec as RawQuerySpec;
};

export const tracesMocks = defineStoryMocks({
	controls: {
		tab: choiceControl<TracesTab>('Tab', {
			group: VIEW,
			description:
				'The three pathnames the module tabs between. Clicking another tab leaves the story, so switch it here.',
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
				'Spans the endpoint has, one root span per trace in the Trace view. The table asks for a page at a time, so a higher count paginates.',
			value: 24,
			max: 40,
		}),
		errors: toggleControl('Failing spans', {
			group: LIST,
			description:
				'Answers 503 on the spans of the services that fail, which is what the status column and the error colouring read.',
			value: true,
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
			description: 'Fills the views dropdown and the Views tab.',
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
			'http://localhost/api/v1/orgs/me/filters/:signal',
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
			'http://localhost/api/v1/explorer/views',
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
	// The quick-filter settings announcement is a first-run popover that covers
	// the toolbar until it is closed, and closing it is what the app persists.
	effect: () => {
		set(LOCALSTORAGE.QUICK_FILTERS_SETTINGS_ANNOUNCEMENT, 'false');
	},
});
