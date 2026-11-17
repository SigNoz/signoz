/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { RuletypesRuleTypeDTO } from 'api/generated/services/sigNoz.schemas';
import { QueryParams } from 'constants/query';
import ROUTES from 'constants/routes';
import { rest } from 'msw';
import { AlertTypes } from 'types/api/alerts/alertTypes';

import { choiceControl, countControl } from '@/storybook/controls/controls';
import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import {
	alertFieldKeysResponse,
	alertFieldValuesResponse,
	alertMetricMetadataResponse,
	alertMetricsResponse,
	alertPreviewInvalidQueryError,
	alertPreviewSeries,
	PREVIEW_QUERY_CHOICES,
	type PreviewQueryChoice,
} from '../../AlertList/stories/__story_mockdata__/alertQuery';
import {
	notificationChannelsResponse,
	CHANNEL_MAX,
} from '../../AlertList/stories/__story_mockdata__/alerts';

/**
 * Which alert the page is building. The page reads this off the URL, so the
 * control is a route rather than a response: with no type at all it stays on
 * the picker and everything else opens the form.
 */
const ALERT_MODES = [
	'select-type',
	'metrics',
	'logs',
	'traces',
	'exceptions',
	'anomaly',
] as const;

type AlertMode = (typeof ALERT_MODES)[number];

const ALERT_TYPE_BY_MODE: Partial<Record<AlertMode, AlertTypes>> = {
	metrics: AlertTypes.METRICS_BASED_ALERT,
	logs: AlertTypes.LOGS_BASED_ALERT,
	traces: AlertTypes.TRACES_BASED_ALERT,
	exceptions: AlertTypes.EXCEPTIONS_BASED_ALERT,
	anomaly: AlertTypes.METRICS_BASED_ALERT,
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
				? RuletypesRuleTypeDTO.anomaly_rule
				: RuletypesRuleTypeDTO.threshold_rule,
		[QueryParams.relativeTime]: '6h',
	});

	return `${ROUTES.ALERTS_NEW}?${params.toString()}`;
};

const FORM = 'Create alert · form';

const TEST_NOTIFICATIONS = ['sent', 'no-alerts'] as const;
type TestNotification = (typeof TEST_NOTIFICATIONS)[number];

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
		previewQuery: choiceControl<PreviewQueryChoice>('Preview query', {
			group: FORM,
			description:
				'`invalid` makes `query_range` answer with the 400 a filter that does not parse gets, so the preview shows its error.',
			options: PREVIEW_QUERY_CHOICES,
			value: 'valid',
		}),
		testNotification: choiceControl<TestNotification>('Test notification', {
			group: 'Create alert · form',
			description:
				'What the test run finds. `sent` raises the success toast, `no-alerts` the error toast saying the condition was not met.',
			options: TEST_NOTIFICATIONS,
			value: 'sent',
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
					data: {
						alertCount: values.testNotification === 'no-alerts' ? 0 : 2,
						message: 'Rule tested against the last 6 hours',
					},
				}),
			),
		),

		rest.get(
			'http://localhost/api/v2/notification_channels',
			response.json(() => notificationChannelsResponse(values.channels)),
		),

		rest.post('http://localhost/api/v5/query_range', (req, res, ctx) =>
			values.previewQuery === 'invalid'
				? res(ctx.status(400), ctx.json(alertPreviewInvalidQueryError()))
				: response.json(async (request) =>
						alertPreviewSeries(values.previewSeries, request),
					)(req, res, ctx),
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

export type CreateAlertArgs = PageStoryArgs<typeof createAlertMocks>;

export const showsInvalidQueryError = (args: CreateAlertArgs): boolean =>
	args.previewQuery === 'invalid' && args.alertMode !== 'select-type';
