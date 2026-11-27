/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { RuletypesRuleTypeDTO } from 'api/generated/services/sigNoz.schemas';
import { QueryParams } from 'constants/query';
import ROUTES from 'constants/routes';
import { getCreateAlertLink } from 'container/ExplorerActions/utils';
import { DEFAULT_PANEL_TYPE } from 'container/LLMObservability/Explorer/constants';
import { getAlertQuery } from 'container/LLMObservability/Explorer/explorerUtils';
import { rest } from 'msw';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';
import { AlertTypes } from 'types/api/alerts/alertTypes';

import { getRuleCreateChecks } from 'container/CreateAlert/ruleSaveChecks';
import {
	buildNotificationChannelAttachPermission,
	NotificationChannelCreatePermission,
} from 'lib/authz/hooks/useAuthZ/permissions/notification-channel.permissions';

import { grantsAll } from '@/storybook/access/access';
import { choiceControl, countControl } from '@/storybook/controls/controls';
import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import {
	alertFieldKeysResponse,
	alertFieldValuesResponse,
	alertMetricMetadataResponse,
	alertMetricsResponse,
	alertPreviewSeries,
} from '../../AlertList/stories/__story_mockdata__/alertQuery';
import {
	notificationChannelsResponse,
	CHANNEL_MAX,
} from '../../AlertList/stories/__story_mockdata__/alerts';
import { aiExplorerQuery } from '../../LLMObservability/Explorer/stories/__story_mockdata__/explorer';

/**
 * Which alert the page is building. The page reads this off the URL, so the
 * control is a route rather than a response: with neither a type nor a query it
 * stays on the picker and everything else opens the form.
 */
const ALERT_MODES = [
	'select-type',
	'metrics',
	'logs',
	'traces',
	'ai-traces',
	'ai-traces-explorer',
	'exceptions',
	'anomaly',
] as const;

type AlertMode = (typeof ALERT_MODES)[number];

const ALERT_TYPE_BY_MODE: Partial<Record<AlertMode, AlertTypes>> = {
	metrics: AlertTypes.METRICS_BASED_ALERT,
	logs: AlertTypes.LOGS_BASED_ALERT,
	traces: AlertTypes.TRACES_BASED_ALERT,
	'ai-traces': AlertTypes.AI_TRACES_BASED_ALERT,
	exceptions: AlertTypes.EXCEPTIONS_BASED_ALERT,
	anomaly: AlertTypes.METRICS_BASED_ALERT,
};

const routeFor = (mode: AlertMode): string => {
	// The AI explorer's Create an alert sends only the query; the page reads the type off it.
	if (mode === 'ai-traces-explorer') {
		return getCreateAlertLink({
			query: getAlertQuery(aiExplorerQuery(), DEFAULT_PANEL_TYPE),
			panelType: DEFAULT_PANEL_TYPE,
		});
	}

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

const untilLoaded = { timeout: 15_000 };

type CreateAlertArgs = PageStoryArgs<typeof createAlertMocks>;

/** `ops-slack`, the channel `fillValidAlert` picks: the first one listed. */
export const STORY_CHANNEL_ID = '1';

/**
 * Whether a rule notifying the story channel can be saved and tested: the
 * channel is listed, and the checks pass or failed open.
 */
export const canWriteRule = (args: CreateAlertArgs): boolean =>
	args.channels > 0 &&
	(args.authzState === 'error' ||
		grantsAll(args, ...getRuleCreateChecks([STORY_CHANNEL_ID])));

/** Whether the picker takes the story channel: it needs `attach` on the channel. */
export const canPickStoryChannel = (args: CreateAlertArgs): boolean =>
	args.channels > 0 &&
	(args.authzState === 'error' ||
		grantsAll(args, buildNotificationChannelAttachPermission(STORY_CHANNEL_ID)));

/** The checks Save and Test notification name when a rule with the story channel is refused. */
export const deniedWriteChecks = (args: CreateAlertArgs): string =>
	getRuleCreateChecks([STORY_CHANNEL_ID])
		.filter((check) => !grantsAll(args, check))
		.join(',');

/** Whether an empty picker offers to create a channel. */
export const offersChannelCreate = (args: CreateAlertArgs): boolean =>
	args.authzState === 'error' ||
	grantsAll(args, NotificationChannelCreatePermission);

export const fillValidAlert = async (
	canvasElement: HTMLElement,
): Promise<void> => {
	const canvas = within(canvasElement);

	await userEvent.type(
		await canvas.findByTestId('alert-name-input-field', undefined, untilLoaded),
		'Toast alert',
	);
	const channels = await canvas.findByTestId(
		'threshold-notification-channel-select',
		undefined,
		untilLoaded,
	);

	await userEvent.click(within(channels).getByRole('combobox'));
	await userEvent.click(await screen.findByTitle('ops-slack'));
	await userEvent.keyboard('{Escape}');
};

export const clickFooterButton = async (
	canvasElement: HTMLElement,
	testId: string,
): Promise<void> => {
	const button = await within(canvasElement).findByTestId(testId);

	// Disabled until its permission check answers.
	await waitFor(async () => {
		await expect(button).toHaveAttribute('aria-disabled', 'false');
	}, untilLoaded);
	await userEvent.click(button);
};
