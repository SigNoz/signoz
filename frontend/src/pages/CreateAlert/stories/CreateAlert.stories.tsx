import type { Meta, StoryObj } from '@storybook/react-vite';
import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { createAlertMocks } from './CreateAlert.stories.mocks';
import {
	enableRepeatNotifications,
	openMatchTypeTooltip,
	saveValidAlert,
	sendTestNotification,
} from './__story_mockdata__/createAlert.play';

import CreateAlertPage from '../index';

type CreateAlertArgs = PageStoryArgs<typeof createAlertMocks>;

const pageStory = storyMocks(createAlertMocks, { layout: 'app' });

/**
 * The new rule builder: the query, the condition, the evaluation preview against
 * `query_range`, and the channels to notify. The mode control picks the alert
 * type.
 *
 * Route: `/alerts/new`.
 */
const meta = {
	title: 'Pages/Alerts/Create',
	tags: ['play'],
	component: CreateAlertPage,
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<CreateAlertArgs>;

export default meta;

type Story = StoryObj<CreateAlertArgs>;

/**
 * A new metric alert being written: the query it watches, the threshold it
 * fires on, and where the notification goes.
 */
export const Default: Story = {};

/** Where a new alert starts: the signal the rule is going to watch. */
export const SelectAlertType: Story = {
	args: { alertMode: 'select-type' },
};

/** A log-based alert, whose query section searches logs rather than metrics. */
export const LogsAlert: Story = {
	args: { alertMode: 'logs' },
};

/**
 * An AI traces alert, whose query section has only the AI Query Builder tab,
 * querying traces.
 */
export const AITracesAlert: Story = {
	args: { alertMode: 'ai-traces' },
};

/** Create an alert from the AI explorer: an AI traces alert counting the explorer's query. */
export const AITracesAlertFromExplorer: Story = {
	args: { alertMode: 'ai-traces-explorer' },
};

/**
 * Anomaly detection: the condition is a number of deviations from the seasonal
 * forecast instead of a fixed threshold, and only builder metric queries apply.
 */
export const AnomalyAlert: Story = {
	args: { alertMode: 'anomaly' },
};

/**
 * The match-type tooltip on the threshold sentence: a paragraph on what an
 * aggregated data point is, a worked example over five of them, and the docs
 * link. There is one per match type, and they are antd tooltips rather than
 * `@signozhq/ui` ones, so the Tooltips control leaves them alone and only the
 * option under the pointer shows one. This opens the match-type list and holds
 * the tallest of the five, "all the time", whose example runs to two lines.
 */
export const Tooltips: Story = {
	args: { tooltipsOpen: true },
	play: openMatchTypeTooltip,
};

/** A valid rule saved from the footer: the toast raised once the POST answers. */
export const AlertRuleCreatedToast: Story = {
	play: saveValidAlert,
};

/** Test Notification on a rule whose condition fires: the success toast. */
export const TestNotificationSentToast: Story = {
	play: sendTestNotification,
};

/** Test Notification on a rule that finds nothing to alert on: the error toast. */
export const TestNotificationNoAlertsToast: Story = {
	args: { testNotification: 'no-alerts' },
	play: sendTestNotification,
};

/**
 * Repeat notifications turned on: the interval, its unit and the conditions it
 * repeats under, on one line beside the option.
 */
export const RepeatNotifications: Story = {
	play: enableRepeatNotifications,
};
