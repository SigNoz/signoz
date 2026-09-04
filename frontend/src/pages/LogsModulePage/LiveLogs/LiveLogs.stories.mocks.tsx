/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import setLocalStorage from 'api/browser/localstorage/set';
import { LOCALSTORAGE } from 'constants/localStorage';
import { QueryParams } from 'constants/query';
import { PANEL_TYPES } from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import type { LogViewMode } from 'container/LogsTable';
import { FontSize } from 'container/OptionsMenu/types';
import { rest } from 'msw';
import type {
	BaseBuilderQuery,
	QueryRangeRequestV5,
} from 'types/api/v5/queryRange';

import {
	choiceControl,
	countControl,
	multiChoiceControl,
} from '@/storybook/controls/controls';
import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';

import { logsSavedViewsResponse } from '../SavedViews/__story_mockdata__/savedViews';
import {
	attributeValuesResponse,
	dashboardsResponse,
	logFieldKeysResponse,
	logFieldValuesResponse,
	logHistogramResponse,
	logRowsResponse,
	logsListOptions,
	logTimeseriesResponse,
	LOG_SEVERITIES,
	type LogSeverity,
	QUICK_FILTER_MAX,
	quickFiltersResponse,
	RELATIVE_TIME,
	timeRangeState,
} from '../__story_mockdata__/logs';
import {
	LIVE_TAIL_LIMIT,
	liveLogsQuery,
	liveLogsStream,
} from './__story_mockdata__/liveLogs';

const STREAM = 'Live tail · stream';
const LIST = 'Live tail · list';

const LIST_FORMATS: readonly LogViewMode[] = ['table', 'list', 'raw'];

const liveRoute = (): string => {
	const params = new URLSearchParams({
		[QueryParams.panelTypes]: JSON.stringify(PANEL_TYPES.LIST),
		[QueryParams.relativeTime]: RELATIVE_TIME,
	});

	params.set(
		QueryParams.compositeQuery,
		encodeURIComponent(JSON.stringify(liveLogsQuery())),
	);

	return `${ROUTES.LOGS_EXPLORER}?${params.toString()}`;
};

/**
 * How long the connection takes to answer. The container opens, closes and
 * reopens on mount, and only attaches its `message` listener on the render the
 * connection's own state change causes. Answering immediately would put every
 * frame out before anything was listening.
 */
const CONNECT_LATENCY_MS = 600;

export const liveLogsMocks = defineStoryMocks({
	controls: {
		liveLogs: countControl('Lines received', {
			group: STREAM,
			description:
				'Lines the connection has delivered so far. None reads as connected and waiting, which is where live tail starts.',
			value: 30,
			max: LIVE_TAIL_LIMIT,
		}),
		severities: multiChoiceControl<LogSeverity>('Severities', {
			group: STREAM,
			description:
				'Severities the streamed lines carry, cycled through the list and stacked in the frequency chart.',
			options: LOG_SEVERITIES,
			value: LOG_SEVERITIES,
		}),
		format: choiceControl<LogViewMode>('Line format', {
			group: LIST,
			description: 'Columns, one line per log, or the raw line.',
			options: LIST_FORMATS,
			value: 'table',
		}),
	},
	handlers: (values, response) => [
		// The frequency chart above the list stays empty here: it only queries
		// while the connection is open, and a connection msw answers in one piece
		// is open for an instant. The chart's other source is the payload the
		// explorer pushes in `location.state`, which the story's own navigation
		// drops as soon as the page writes its first query param.
		//
		// The stream the live list is. It is answered plainly rather than through
		// `response`: the polyfill reads a non-200 as a dropped connection and the
		// provider answers that by rotating the session and reconnecting, so the
		// Data control on `error` would drive a reconnect loop rather than show a
		// live tail that failed.
		rest.get('http://localhost/api/v3/logs/livetail', (_req, res, ctx) =>
			res(
				ctx.delay(CONNECT_LATENCY_MS),
				ctx.status(200),
				ctx.set('Content-Type', 'text/event-stream'),
				ctx.set('Cache-Control', 'no-cache'),
				// The connection is cross-origin, and the polyfill sends an
				// `Authorization` header, so without these the browser refuses the
				// response the same way it would refuse the backend's.
				ctx.set('Access-Control-Allow-Origin', '*'),
				ctx.body(liveLogsStream(values.liveLogs, values.severities, Date.now())),
			),
		),

		// The end of a response is a dropped connection as far as the polyfill is
		// concerned, and the provider answers that by rotating the session and then
		// reconnecting. A story cannot follow that: msw has no stream to reopen, so
		// every reconnection ends immediately and starts the next one, and the list
		// is cleared each time round. Left hanging, the rotation never resolves, the
		// reconnection is never scheduled, and the lines that arrived stay put.
		rest.post('http://localhost/api/v2/sessions/rotate', (_req, res, ctx) =>
			res(ctx.delay('infinite')),
		),

		rest.post(
			'http://localhost/api/v5/query_range',
			response.json(async (req) => {
				const body = (await req.json()) as QueryRangeRequestV5;
				const timeWindow = { start: body.start, end: body.end };

				if (body.requestType === 'raw') {
					return logRowsResponse(values.liveLogs, values.severities, body.end);
				}

				const spec = body.compositeQuery?.queries?.[0]?.spec as
					| BaseBuilderQuery
					| undefined;
				const bySeverity = (spec?.groupBy ?? []).some(
					(key) => key.name === 'severity_text',
				);

				return bySeverity
					? logHistogramResponse(values.severities, timeWindow)
					: logTimeseriesResponse(timeWindow);
			}),
		),

		rest.get(
			'http://localhost/api/v1/orgs/me/filters/:signal',
			response.json(() => quickFiltersResponse(QUICK_FILTER_MAX)),
		),

		rest.get(
			'http://localhost/api/v1/fields/keys',
			response.json((req) =>
				logFieldKeysResponse(req.url.searchParams.get('searchText') ?? ''),
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
			response.json(() => logsSavedViewsResponse(4)),
		),

		rest.get(
			'http://localhost/api/v2/users/me/dashboards',
			response.json(dashboardsResponse),
		),
	],
	config: () => ({
		route: liveRoute(),
		reduxState: timeRangeState(),
	}),
	effect: ({ format }) => {
		setLocalStorage(LOCALSTORAGE.SHOW_LOGS_QUICK_FILTERS, 'true');
		setLocalStorage(
			LOCALSTORAGE.LOGS_LIST_OPTIONS,
			JSON.stringify(
				logsListOptions({ format, maxLines: 1, fontSize: FontSize.SMALL }),
			),
		);
		setLocalStorage(LOCALSTORAGE.QUICK_FILTERS_SETTINGS_ANNOUNCEMENT, 'false');
	},
});
