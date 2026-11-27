/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { rest } from 'msw';
import { userEvent, waitFor, within } from 'storybook/test';

import { getRuleCreateChecks } from 'container/CreateAlert/ruleSaveChecks';
import { getRuleActionChecks } from 'container/ListAlertRules/utils';
import { buildNotificationChannelDetachPermission } from 'lib/authz/hooks/useAuthZ/permissions/notification-channel.permissions';
import {
	buildRuleDetachPermission,
	buildRuleReadPermission,
	buildRuleUpdatePermission,
} from 'lib/authz/hooks/useAuthZ/permissions/rule.permissions';

import { grantsAll } from '@/storybook/access/access';
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
	alertPreviewSeries,
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

type AlertOverviewArgs = PageStoryArgs<typeof alertOverviewMocks>;

/** `ops-slack`, the channel the story rule notifies: the first one listed. */
export const SAVED_CHANNEL_ID = '1';

const RULE_ACTIONS = getRuleActionChecks(STORY_RULE_ID);

const passes = (
	args: AlertOverviewArgs,
	...checks: Parameters<typeof grantsAll>[1][]
): boolean => args.authzState === 'error' || grantsAll(args, ...checks);

/** Whether the rule loads and the form shows: the page gates on `read`. */
export const showsRuleForm = (args: AlertOverviewArgs): boolean =>
	args.dataState === 'loaded' &&
	passes(args, buildRuleReadPermission(STORY_RULE_ID));

/** The rule loads, but the page refuses it for want of `read`. */
export const deniesRuleRead = (args: AlertOverviewArgs): boolean =>
	args.dataState === 'loaded' &&
	!passes(args, buildRuleReadPermission(STORY_RULE_ID));

export const canToggleRule = (args: AlertOverviewArgs): boolean =>
	showsRuleForm(args) && passes(args, ...RULE_ACTIONS.toggle);

export const canCloneRule = (args: AlertOverviewArgs): boolean =>
	showsRuleForm(args) && passes(args, ...RULE_ACTIONS.clone);

export const canDeleteRule = (args: AlertOverviewArgs): boolean =>
	showsRuleForm(args) && passes(args, ...RULE_ACTIONS.delete);

/** Whether the saved channel can be taken off the rule; it must be listed to be checked. */
export const canDetachSavedChannel = (args: AlertOverviewArgs): boolean =>
	showsRuleForm(args) &&
	args.channels > 0 &&
	passes(
		args,
		buildRuleDetachPermission(STORY_RULE_ID),
		buildNotificationChannelDetachPermission(SAVED_CHANNEL_ID),
	);

/** Saving the rule unchanged needs `update` alone. */
export const canSaveRule = (args: AlertOverviewArgs): boolean =>
	showsRuleForm(args) && passes(args, buildRuleUpdatePermission(STORY_RULE_ID));

/**
 * Testing it is checked as creating it, with its channel when the list names
 * it; an unlisted channel is skipped, as the backend skips it.
 */
export const canTestRule = (args: AlertOverviewArgs): boolean =>
	showsRuleForm(args) &&
	passes(
		args,
		...getRuleCreateChecks(args.channels > 0 ? [SAVED_CHANNEL_ID] : []),
	);

export const clickFooterButton = async (
	canvasElement: HTMLElement,
	testId: string,
): Promise<void> => {
	// The footer stays disabled, and remounts, until the rule has loaded and its
	// permission check has answered.
	const button = await waitFor(
		() => {
			const element = within(canvasElement).getByTestId(testId);
			if (element.getAttribute('aria-disabled') !== 'false') {
				throw new Error(`${testId} is still disabled`);
			}
			return element;
		},
		{ timeout: 15_000 },
	);
	await userEvent.click(button);
};
