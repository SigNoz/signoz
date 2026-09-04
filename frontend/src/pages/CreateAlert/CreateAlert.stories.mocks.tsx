/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { QueryParams } from 'constants/query';
import ROUTES from 'constants/routes';
import { AlertDetectionTypes } from 'container/FormAlertRules';
import { rest } from 'msw';
import { AlertTypes } from 'types/api/alerts/alertTypes';

import { choiceControl, countControl } from '@/storybook/controls/controls';
import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';

import {
	alertFieldKeysResponse,
	alertFieldValuesResponse,
	alertMetricMetadataResponse,
	alertMetricsResponse,
	alertPreviewSeries,
} from '../AlertList/__story_mockdata__/alertQuery';
import {
	channelsResponse,
	CHANNEL_MAX,
} from '../AlertList/__story_mockdata__/alerts';

/**
 * Which alert the page is building. The page reads this off the URL, so the
 * control is a route rather than a response: with no type at all it stays on
 * the picker, anomaly detection routes to the classic form, and everything else
 * opens the current one.
 */
const ALERT_MODES = [
	'select-type',
	'metrics',
	'logs',
	'traces',
	'exceptions',
	'anomaly',
	'classic-form',
] as const;

type AlertMode = (typeof ALERT_MODES)[number];

const ALERT_TYPE_BY_MODE: Partial<Record<AlertMode, AlertTypes>> = {
	metrics: AlertTypes.METRICS_BASED_ALERT,
	logs: AlertTypes.LOGS_BASED_ALERT,
	traces: AlertTypes.TRACES_BASED_ALERT,
	exceptions: AlertTypes.EXCEPTIONS_BASED_ALERT,
	anomaly: AlertTypes.METRICS_BASED_ALERT,
	'classic-form': AlertTypes.METRICS_BASED_ALERT,
};

const routeFor = (mode: AlertMode): string => {
	const alertType = ALERT_TYPE_BY_MODE[mode];

	if (!alertType) {
		return ROUTES.ALERTS_NEW;
	}

	const params = new URLSearchParams({
		[QueryParams.alertType]: alertType,
		[QueryParams.ruleType]:
			mode === 'anomaly'
				? AlertDetectionTypes.ANOMALY_DETECTION_ALERT
				: AlertDetectionTypes.THRESHOLD_ALERT,
		[QueryParams.relativeTime]: '6h',
	});

	if (mode === 'classic-form') {
		params.set(QueryParams.showClassicCreateAlertsPage, 'true');
	}

	return `${ROUTES.ALERTS_NEW}?${params.toString()}`;
};

const FORM = 'Create alert · form';

export const createAlertMocks = defineStoryMocks({
	controls: {
		alertMode: choiceControl<AlertMode>('Alert being created', {
			group: FORM,
			options: ALERT_MODES,
			value: 'metrics',
		}),
		channels: countControl('Notification channels', {
			group: FORM,
			description: 'What a threshold can be routed to.',
			value: 5,
			max: CHANNEL_MAX,
		}),
		previewSeries: countControl('Preview series', {
			group: FORM,
			description:
				'Lines the chart above the condition draws once the query has something to run. A new metric alert has no metric picked yet, so it draws nothing until one is.',
			value: 3,
			max: 6,
		}),
	},
	handlers: (values, response) => [
		rest.post('http://localhost/api/v2/rules', (_req, res, ctx) =>
			res(ctx.status(201), ctx.json({ status: 'success', data: null })),
		),

		rest.post('http://localhost/api/v2/rules/test', (_req, res, ctx) =>
			res(
				ctx.status(200),
				ctx.json({
					status: 'success',
					data: { alertCount: 2, message: 'Rule tested against the last 6 hours' },
				}),
			),
		),

		rest.get(
			'http://localhost/api/v1/channels',
			response.json(() => channelsResponse(values.channels)),
		),

		rest.post(
			'http://localhost/api/v5/query_range',
			response.json(async (req) => alertPreviewSeries(values.previewSeries, req)),
		),

		rest.get(
			'http://localhost/api/v2/metrics',
			response.json((req) =>
				alertMetricsResponse(req.url.searchParams.get('searchText') ?? ''),
			),
		),

		rest.get(
			'http://localhost/api/v2/metrics/metadata',
			response.json((req) =>
				alertMetricMetadataResponse(req.url.searchParams.get('metricName') ?? ''),
			),
		),

		rest.get(
			'http://localhost/api/v1/fields/keys',
			response.json((req) =>
				alertFieldKeysResponse(req.url.searchParams.get('searchText') ?? ''),
			),
		),

		rest.get(
			'http://localhost/api/v1/fields/values',
			response.json((req) =>
				alertFieldValuesResponse(
					req.url.searchParams.get('name') ?? '',
					req.url.searchParams.get('searchText') ?? '',
				),
			),
		),
	],
	config: (values) => ({ route: routeFor(values.alertMode) }),
});
