/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { rest } from 'msw';

import { choiceControl, countControl } from '@/storybook/controls/controls';
import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';

import {
	alertRuleByIdResponse,
	ALERT_SCHEMAS,
	channelsResponse,
	CHANNEL_MAX,
	RULE_STATE_CHOICES,
	SEVERITY_CHOICES,
	type AlertSchema,
	type RuleStateChoice,
	type SeverityChoice,
} from '../__story_mockdata__/alerts';
import {
	alertFieldKeysResponse,
	alertFieldValuesResponse,
	alertMetricMetadataResponse,
	alertMetricsResponse,
	alertPreviewSeries,
} from '../__story_mockdata__/alertQuery';

const STORY_RULE_ID = 'rule-1';
const STORY_RELATIVE_TIME = '6h';

const RULE = 'Alert overview · rule';
const PREVIEW = 'Alert overview · preview';

export const alertOverviewMocks = defineStoryMocks({
	controls: {
		alertSchema: choiceControl<AlertSchema>('Alert schema', {
			group: RULE,
			description:
				'`v2` opens the stepper the new alert form uses; `classic` is the single-form page rules written before it still open in.',
			options: ALERT_SCHEMAS,
			value: 'v2',
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
	},
	handlers: (values, response) => [
		rest.get(
			'http://localhost/api/v2/rules/:id',
			response.json((req) =>
				alertRuleByIdResponse(String(req.params.id), {
					severity: values.ruleSeverity,
					state: values.ruleState,
					schema: values.alertSchema,
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
	config: () => ({
		route: `/alerts/overview?ruleId=${STORY_RULE_ID}&relativeTime=${STORY_RELATIVE_TIME}`,
	}),
});
