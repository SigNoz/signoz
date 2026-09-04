/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { rest } from 'msw';
import set from 'api/browser/localstorage/set';
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
import { fieldValuesResponse } from '@/storybook/msw/__story_mockdata__/fields';
import {
	queryRangeV5RawResponse,
	queryRangeV5ScalarResponse,
	queryRangeV5TimeSeriesResponse,
	timeSeriesPoints,
} from '@/storybook/msw/__story_mockdata__/queryRange';

// The tab renders the traces explorer over `DataSource.TRACES`, so it asks the
// same endpoints for the same shapes and answers from the traces builders.
import {
	exportDashboardsResponse,
	savedTraceViewsResponse,
	traceAttributeValuesResponse,
	traceFieldKeysResponse,
	traceFieldValues,
	traceQuickFiltersResponse,
	traceRootSpanRows,
	traceSpanRows,
	TRACES_EXPLORER_VIEWS,
} from '../../TracesModulePage/__story_mockdata__/traces';

const VIEW = 'Explorer · view';
const LIST = 'Explorer · list';
const FILTERS = 'Explorer · filters';
const SAVED = 'Explorer · saved';

const explorerRoute = (view: ExplorerViews): string => {
	const params = new URLSearchParams({
		[QueryParams.panelTypes]: JSON.stringify(explorerViewToPanelType[view]),
		[QueryParams.selectedExplorerView]: view,
	});

	return `${ROUTES.AI_OBSERVABILITY_EXPLORER}?${params.toString()}`;
};

interface RawQuerySpec {
	limit?: number;
	offset?: number;
}

const rawSpecOf = (body: QueryRangeRequestV5): RawQuerySpec => {
	const spec = body.compositeQuery?.queries?.[0]?.spec ?? {};

	return spec as RawQuerySpec;
};

export const llmExplorerMocks = defineStoryMocks({
	controls: {
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
				'LLM spans the endpoint has, one root span per trace in the Trace view. The table asks for a page at a time, so a higher count paginates.',
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
			description: 'Fills the views dropdown the explorer options offer.',
			value: 4,
			max: 8,
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
	config: (values) => ({ route: explorerRoute(values.view) }),
	// The quick-filter settings announcement is a first-run popover that covers
	// the toolbar until it is closed, and closing it is what the app persists.
	effect: () => {
		set(LOCALSTORAGE.QUICK_FILTERS_SETTINGS_ANNOUNCEMENT, 'false');
	},
});
