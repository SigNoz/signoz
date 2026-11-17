/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { rest } from 'msw';

import { choiceControl, countControl } from '@/storybook/controls/controls';
import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import {
	alertRuleByIdResponse,
	notificationChannelsResponse,
	CHANNEL_MAX,
	RULE_KINDS,
	RULE_STATE_CHOICES,
	SEVERITY_CHOICES,
	type RuleKind,
	type RuleStateChoice,
	type SeverityChoice,
} from '../../stories/__story_mockdata__/alerts';
import {
	alertFieldKeysResponse,
	alertFieldValuesResponse,
	alertMetricMetadataResponse,
	alertMetricsResponse,
	alertPreviewInvalidQueryError,
	alertPreviewSeries,
	PREVIEW_QUERY_CHOICES,
	type PreviewQueryChoice,
} from '../../stories/__story_mockdata__/alertQuery';

const STORY_RULE_ID = 'rule-1';
const STORY_RELATIVE_TIME = '6h';

const RULE = 'Alert overview · rule';
const PREVIEW = 'Alert overview · preview';

const TEST_NOTIFICATIONS = ['sent', 'no-alerts'] as const;
type TestNotification = (typeof TEST_NOTIFICATIONS)[number];

export const alertOverviewMocks = defineStoryMocks({
	controls: {
		ruleKind: choiceControl<RuleKind>('Rule kind', {
			group: RULE,
			description:
				'`anomaly` fires on how far each point strays from the seasonal forecast, in deviations, rather than on a fixed value.',
			options: RULE_KINDS,
			value: 'threshold',
		}),
		ruleState: choiceControl<RuleStateChoice>('State', {
			group: RULE,
			description: 'The badge next to the rule name in the header.',
			options: RULE_STATE_CHOICES,
			value: 'firing',
		}),
		ruleSeverity: choiceControl<SeverityChoice>('Severity', {
			group: RULE,
			options: SEVERITY_CHOICES,
			value: 'critical',
		}),
		channels: countControl('Notification channels', {
			group: RULE,
			description: 'What the thresholds can be routed to.',
			value: 5,
			max: CHANNEL_MAX,
		}),
		previewSeries: countControl('Preview series', {
			group: PREVIEW,
			description:
				'Lines the chart above the condition draws. Zero is the preview with nothing to plot.',
			value: 3,
			max: 6,
		}),
		previewQuery: choiceControl<PreviewQueryChoice>('Preview query', {
			group: PREVIEW,
			description:
				'`invalid` makes `query_range` answer with the 400 a filter that does not parse gets, so the preview shows its error.',
			options: PREVIEW_QUERY_CHOICES,
			value: 'valid',
		}),
		testNotification: choiceControl<TestNotification>('Test notification', {
			group: 'Alert overview · rule',
			description:
				'What the test run finds. `sent` raises the success toast, `no-alerts` the error toast saying the condition was not met.',
			options: TEST_NOTIFICATIONS,
			value: 'sent',
		}),
	},
	handlers: (values, response) => [
		rest.get(
			'http://localhost/api/v2/rules/:id',
			response.json((req) =>
				alertRuleByIdResponse(String(req.params.id), {
					severity: values.ruleSeverity,
					state: values.ruleState,
					kind: values.ruleKind,
				}),
			),
		),

		rest.put('http://localhost/api/v2/rules/:id', (_req, res, ctx) =>
			res(ctx.status(200), ctx.json({ status: 'success', data: null })),
		),

		rest.patch('http://localhost/api/v2/rules/:id', (_req, res, ctx) =>
			res(ctx.status(200), ctx.json({ status: 'success', data: null })),
		),

		rest.delete('http://localhost/api/v2/rules/:id', (_req, res, ctx) =>
			res(ctx.status(200), ctx.json({ status: 'success', data: null })),
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
	config: () => ({
		route: `/alerts/overview?ruleId=${STORY_RULE_ID}&relativeTime=${STORY_RELATIVE_TIME}`,
	}),
});

export type AlertOverviewArgs = PageStoryArgs<typeof alertOverviewMocks>;

// The page renders nothing past the rule request, so a failed or pending rule
// leaves no preview to fail.
export const showsInvalidQueryError = (args: AlertOverviewArgs): boolean =>
	args.previewQuery === 'invalid' && args.dataState === 'loaded';
