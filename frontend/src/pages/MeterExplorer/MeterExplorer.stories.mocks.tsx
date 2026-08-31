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
import type { QueryRangeRequestV5 } from 'types/api/v5/queryRange';

import {
	choiceControl,
	countControl,
	multiChoiceControl,
	toggleControl,
} from '@/storybook/controls/controls';
import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';
import {
	fieldKeysResponse,
	fieldValuesResponse,
} from '@/storybook/msw/__story_mockdata__/fields';
import {
	queryRangeV5ScalarResponse,
	queryRangeV5TimeSeriesResponse,
} from '@/storybook/msw/__story_mockdata__/queryRange';

import {
	exportDashboardsResponse,
	METER_METRICS,
	METER_SIGNALS,
	METER_TABS,
	METER_TIME_RANGES,
	METER_VOLUMES,
	meterAttributeKeys,
	meterExplorerQuery,
	meterFieldKeys,
	meterFieldValues,
	meterMetricSignal,
	meterMetricsListResponse,
	meterQuickFiltersResponse,
	meterSeries,
	meterTimeWindow,
	meterTotal,
	meterVolumeUnit,
	savedMeterViewsResponse,
	type MeterSignal,
	type MeterTab,
	type MeterTimeRange,
	type MeterVolume,
} from './__story_mockdata__/meter';

const VIEW = 'Cost Meter · view';
const USAGE = 'Cost Meter · usage';
const EXPLORER = 'Cost Meter · explorer';

const isMetricName = (name: string): boolean =>
	(METER_METRICS as readonly string[]).includes(name);

/**
 * The meter metrics themselves and the resource attributes they carry come back
 * from one call, each under its own context, so the query builder tells the
 * metric picker and the filter suggestions apart the way it does against a real
 * backend.
 */
const meterFieldKeysResponse = (
	searchText: string | null,
): ReturnType<typeof fieldKeysResponse> => {
	const names = meterFieldKeys(searchText);

	const byContext = [
		TelemetrytypesFieldContextDTO.metric,
		TelemetrytypesFieldContextDTO.resource,
	].map((fieldContext) =>
		fieldKeysResponse(
			names.filter(
				(name) =>
					isMetricName(name) ===
					(fieldContext === TelemetrytypesFieldContextDTO.metric),
			),
			{ signal: TelemetrytypesSignalDTO.metrics, fieldContext },
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
	tab: MeterTab;
	metric: MeterVolume;
	timeRange: MeterTimeRange;
}

const meterRoute = ({ tab, metric, timeRange }: RouteValues): string => {
	const params = new URLSearchParams(meterTimeWindow(timeRange).search);

	if (tab === 'views') {
		return `${ROUTES.METER_EXPLORER_VIEWS}?${params.toString()}`;
	}

	if (tab === 'explorer') {
		// Encoded the way `redirectWithQueryBuilderData` writes it, so the param
		// survives the extra decode the query builder does when reading it back.
		params.set(
			QueryParams.compositeQuery,
			encodeURIComponent(JSON.stringify(meterExplorerQuery(metric))),
		);
		params.set(QueryParams.yAxisUnit, meterVolumeUnit(metric));

		return `${ROUTES.METER_EXPLORER}?${params.toString()}`;
	}

	return `${ROUTES.METER}?${params.toString()}`;
};

interface MeterQuerySpec {
	name?: string;
	aggregations?: { metricName?: string }[];
}

const meterSpecOf = (body: QueryRangeRequestV5): MeterQuerySpec =>
	(body.compositeQuery?.queries?.[0]?.spec ?? {}) as MeterQuerySpec;

export const meterMocks = defineStoryMocks({
	controls: {
		tab: choiceControl<MeterTab>('Tab', {
			group: VIEW,
			description:
				'The three pathnames the module tabs between. Clicking another tab leaves the story, so switch it here.',
			options: METER_TABS,
			value: 'meter',
		}),
		timeRange: choiceControl<MeterTimeRange>('Time range', {
			group: VIEW,
			description:
				'The window every widget asks for. Under 61 minutes the page warns that the meter aggregates hourly; a window inside the beta phase warns that the data predates 22 August 2025, which only a cloud tenant is told.',
			options: METER_TIME_RANGES,
			value: 'last-1-day',
		}),
		billingNotice: toggleControl('Billing notice', {
			group: VIEW,
			description:
				'The UTC billing note above the breakdown. Closing it is what the app persists, so a returning user does not see it.',
			value: true,
		}),
		signals: multiChoiceControl<MeterSignal>('Ingesting signals', {
			group: USAGE,
			description:
				'Which signals the meter has volume for. A signal left out answers with no series, so its section and its total go empty.',
			options: METER_SIGNALS,
			value: [...METER_SIGNALS],
		}),
		metric: choiceControl<MeterVolume>('Explorer metric', {
			group: EXPLORER,
			description:
				'Which `signoz.meter.*` metric the explorer opens with staged and charted.',
			options: METER_VOLUMES,
			value: 'log-size',
		}),
		quickFilters: countControl('Quick filters', {
			group: EXPLORER,
			description:
				'Filters the org has configured for the meter. At 0 the panel shows its empty state.',
			value: 6,
			max: meterAttributeKeys.length,
		}),
		savedViews: countControl('Saved views', {
			group: EXPLORER,
			description: 'Fills the views dropdown and the Views tab.',
			value: 4,
			max: 6,
		}),
	},
	handlers: (values, response) => [
		rest.post(
			'http://localhost/api/v5/query_range',
			response.json(async (req) => {
				const body = (await req.json()) as QueryRangeRequestV5;
				const { start, end, requestType } = body;
				const { name = 'A', aggregations } = meterSpecOf(body);
				const metricName = aggregations?.[0]?.metricName ?? '';

				const signal = meterMetricSignal(metricName);
				const ingesting = !!signal && values.signals.includes(signal);

				if (requestType === 'scalar') {
					return queryRangeV5ScalarResponse(
						ingesting ? meterTotal(metricName, { start, end }) : 0,
						name,
					);
				}

				return queryRangeV5TimeSeriesResponse([
					{
						queryName: name,
						series: ingesting ? meterSeries(metricName, { start, end }) : [],
					},
				]);
			}),
		),

		rest.get(
			'http://localhost/api/v1/orgs/me/filters/:signal',
			response.json(() => meterQuickFiltersResponse(values.quickFilters)),
		),

		rest.get(
			'http://localhost/api/v1/fields/keys',
			response.json((req) =>
				meterFieldKeysResponse(req.url.searchParams.get('searchText')),
			),
		),

		rest.get(
			'http://localhost/api/v1/fields/values',
			response.json((req) =>
				fieldValuesResponse(meterFieldValues(req.url.searchParams.get('name'))),
			),
		),

		rest.get(
			'http://localhost/api/v2/metrics',
			response.json((req) =>
				meterMetricsListResponse(req.url.searchParams.get('searchText') ?? ''),
			),
		),

		rest.get(
			'http://localhost/api/v1/explorer/views',
			response.json(() => savedMeterViewsResponse(values.savedViews)),
		),

		rest.get(
			'http://localhost/api/v2/users/me/dashboards',
			response.json(exportDashboardsResponse),
		),
	],
	config: (values) => {
		const { minTime, maxTime, selectedTime } = meterTimeWindow(values.timeRange);

		return {
			route: meterRoute(values),
			// The breakdown reads the window off the store rather than the picker, so
			// the range the widgets ask for is the seeded one, not the reducer's
			// default for `/iframe.html`.
			reduxState: {
				globalTime: {
					minTime,
					maxTime,
					selectedTime,
					loading: false,
					isAutoRefreshDisabled: false,
					selectedAutoRefreshInterval: '',
				},
			},
		};
	},
	effect: ({ billingNotice }) => {
		set(
			LOCALSTORAGE.DISSMISSED_COST_METER_INFO,
			billingNotice ? 'false' : 'true',
		);

		// The quick-filter settings announcement is a first-run popover that covers
		// the explorer toolbar until it is closed, and closing it is what the app
		// persists.
		set(LOCALSTORAGE.QUICK_FILTERS_SETTINGS_ANNOUNCEMENT, 'false');
	},
});
