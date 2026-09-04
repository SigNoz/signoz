/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import setLocalStorage from 'api/browser/localstorage/set';
import { FeatureKeys } from 'constants/features';
import { LOCALSTORAGE } from 'constants/localStorage';
import { QueryParams } from 'constants/query';
import { PANEL_TYPES } from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import type { LogViewMode } from 'container/LogsTable';
import { FontSize } from 'container/OptionsMenu/types';
import { rest } from 'msw';
import { defaultFeatureFlags } from 'tests/fixtures/appContextMock';
import type { Warning } from 'types/api';
import type {
	BaseBuilderQuery,
	QueryRangeRequestV5,
} from 'types/api/v5/queryRange';

import {
	choiceControl,
	countControl,
	multiChoiceControl,
	toggleControl,
} from '@/storybook/controls/controls';
import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';

import {
	logsSavedViewsResponse,
	SAVED_VIEW_MAX,
} from './SavedViews/__story_mockdata__/savedViews';
import {
	attributeValuesResponse,
	dashboardsResponse,
	logCountResponse,
	logFieldKeysResponse,
	logFieldValuesResponse,
	logHistogramResponse,
	logsListOptions,
	logTimeseriesResponse,
	LOG_SEVERITIES,
	type LogSeverity,
	logRowsResponse,
	QUICK_FILTER_MAX,
	quickFiltersResponse,
	RELATIVE_TIME,
	timeRangeState,
} from './__story_mockdata__/logs';

const EXPLORER = 'Logs · explorer';
const LIST = 'Logs · list';
const FILTERS = 'Logs · filters';

const EXPLORER_VIEWS = ['list', 'timeseries', 'table'] as const;

type ExplorerView = (typeof EXPLORER_VIEWS)[number];

const VIEW_PANEL_TYPES: Record<ExplorerView, PANEL_TYPES> = {
	list: PANEL_TYPES.LIST,
	timeseries: PANEL_TYPES.TIME_SERIES,
	table: PANEL_TYPES.TABLE,
};

const LIST_FORMATS: readonly LogViewMode[] = ['table', 'list', 'raw'];

const FONT_SIZES = [FontSize.SMALL, FontSize.MEDIUM, FontSize.LARGE] as const;

/**
 * The list requests a page at a time, so a longer response is not a body the
 * backend can send.
 */
const PAGE_SIZE = 100;

/** Lines a raw-format row wraps to before it is clipped. */
const MAX_LINES_CAP = 10;

const QUERY_WARNING: Warning = {
	code: 'index_not_used',
	message: 'The query did not use an index and read the whole time range.',
	url: 'https://signoz.io/docs/userguide/logs/',
	warnings: [
		{ message: 'body ILIKE cannot use the bloom filter on `body`.' },
		{ message: 'severity_text is not indexed in this workspace.' },
	],
};

const explorerRoute = (view: ExplorerView): string => {
	const panelType = encodeURIComponent(JSON.stringify(VIEW_PANEL_TYPES[view]));

	return `${ROUTES.LOGS_EXPLORER}?${QueryParams.panelTypes}=${panelType}&${QueryParams.relativeTime}=${RELATIVE_TIME}`;
};

export const logsMocks = defineStoryMocks({
	controls: {
		view: choiceControl<ExplorerView>('Explorer view', {
			group: EXPLORER,
			description:
				'Which panel the explorer renders: the log list, the timeseries chart or the aggregated table.',
			options: EXPLORER_VIEWS,
			value: 'list',
		}),
		logs: countControl('Log lines', {
			group: EXPLORER,
			value: 30,
			max: PAGE_SIZE,
		}),
		severities: multiChoiceControl<LogSeverity>('Severities', {
			group: EXPLORER,
			description:
				'Severities the logs carry, cycled through the list and stacked in the frequency chart. None selected reads as nothing matching the query.',
			options: LOG_SEVERITIES,
			value: LOG_SEVERITIES,
		}),
		frequencyChart: toggleControl('Frequency chart', {
			group: EXPLORER,
			description: 'The counts-per-severity chart above the log list.',
			value: true,
		}),
		warning: toggleControl('Query warning', {
			group: EXPLORER,
			description:
				'A warning on the response, which the toolbar offers next to the run button.',
			value: false,
		}),
		format: choiceControl<LogViewMode>('Line format', {
			group: LIST,
			description:
				'Columns, one line per log, or the raw line. Only the raw format reads the line limit.',
			options: LIST_FORMATS,
			value: 'table',
		}),
		maxLines: countControl('Max lines', {
			group: LIST,
			value: 1,
			max: MAX_LINES_CAP,
		}),
		fontSize: choiceControl<FontSize>('Font size', {
			group: LIST,
			options: FONT_SIZES,
			value: FontSize.SMALL,
		}),
		jsonBody: toggleControl('JSON body', {
			group: LIST,
			description:
				'`use_json_body`: the service logs JSON and the backend hands the body over parsed, so the body is a tree and its keys are queryable as `body.x`.',
			value: false,
		}),
		filtersPanel: toggleControl('Filters panel', {
			group: FILTERS,
			description: 'The quick filters panel down the left of the explorer.',
			value: true,
		}),
		quickFilters: countControl('Quick filters', {
			group: FILTERS,
			description:
				'Filters the org configured for logs. Without any, the left panel offers to add some.',
			value: QUICK_FILTER_MAX,
			max: QUICK_FILTER_MAX,
		}),
		savedViews: countControl('Saved views', {
			group: FILTERS,
			description: 'The views the view picker above the query builder lists.',
			value: 4,
			max: SAVED_VIEW_MAX,
		}),
	},
	handlers: (values, response) => {
		const warning = values.warning ? QUERY_WARNING : undefined;

		return [
			rest.post(
				'http://localhost/api/v5/query_range',
				response.json(async (req) => {
					const body = (await req.json()) as QueryRangeRequestV5;
					const timeWindow = { start: body.start, end: body.end };

					if (body.requestType === 'time_series') {
						// The frequency chart asks for counts grouped by severity; the
						// timeseries view asks the same aggregation without a group by.
						const spec = body.compositeQuery?.queries?.[0]?.spec as
							| BaseBuilderQuery
							| undefined;
						const bySeverity = (spec?.groupBy ?? []).some(
							(key) => key.name === 'severity_text',
						);

						return bySeverity
							? logHistogramResponse(values.severities, timeWindow, { warning })
							: logTimeseriesResponse(timeWindow, { warning });
					}

					if (body.requestType === 'scalar') {
						return logCountResponse(values.severities);
					}

					return logRowsResponse(values.logs, values.severities, body.end, {
						jsonBody: values.jsonBody,
						warning,
					});
				}),
			),

			rest.get(
				'http://localhost/api/v1/orgs/me/filters/:signal',
				response.json(() => quickFiltersResponse(values.quickFilters)),
			),

			rest.get(
				'http://localhost/api/v1/fields/keys',
				response.json((req) =>
					logFieldKeysResponse(req.url.searchParams.get('searchText') ?? '', {
						jsonBody: values.jsonBody,
					}),
				),
			),

			rest.get(
				'http://localhost/api/v1/fields/values',
				response.json((req) =>
					logFieldValuesResponse(
						req.url.searchParams.get('name') ?? '',
						req.url.searchParams.get('searchText') ?? '',
					),
				),
			),

			rest.get(
				'http://localhost/api/v3/autocomplete/attribute_values',
				response.json((req) =>
					attributeValuesResponse(
						req.url.searchParams.get('attributeKey') ?? '',
						req.url.searchParams.get('searchText') ?? '',
					),
				),
			),

			rest.get(
				'http://localhost/api/v1/explorer/views',
				response.json(() => logsSavedViewsResponse(values.savedViews)),
			),

			rest.get(
				'http://localhost/api/v2/users/me/dashboards',
				response.json(dashboardsResponse),
			),
		];
	},
	config: ({ view, jsonBody }) => ({
		route: explorerRoute(view),
		reduxState: timeRangeState(),
		appContext: jsonBody
			? {
					featureFlags: [
						...defaultFeatureFlags,
						{
							name: FeatureKeys.USE_JSON_BODY,
							active: true,
							usage: 0,
							usage_limit: -1,
							route: '',
						},
					],
				}
			: {},
	}),
	effect: ({ frequencyChart, filtersPanel, format, maxLines, fontSize }) => {
		setLocalStorage(LOCALSTORAGE.SHOW_FREQUENCY_CHART, String(frequencyChart));
		setLocalStorage(LOCALSTORAGE.SHOW_LOGS_QUICK_FILTERS, String(filtersPanel));

		// The preferences loader reads localStorage ahead of the URL, so this is
		// what the options menu opens on.
		setLocalStorage(
			LOCALSTORAGE.LOGS_LIST_OPTIONS,
			JSON.stringify(logsListOptions({ format, maxLines, fontSize })),
		);

		// A one-time announcement over the quick filters panel is not what the page
		// looks like, so the story starts from it already read.
		setLocalStorage(LOCALSTORAGE.QUICK_FILTERS_SETTINGS_ANNOUNCEMENT, 'false');
	},
});
