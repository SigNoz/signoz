import type { Meta, StoryObj } from '@storybook/react-vite';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';

import {
	alertOverviewMocks,
	type AlertOverviewArgs,
} from './AlertOverview.stories.mocks';
import {
	openAlertActionsMenu,
	openPreviewErrorDetails,
	pickAnomalySeries,
	saveAlertRule,
	sendTestNotification,
} from './__story_mockdata__/alertOverview.play';

import AlertList from '../../index';

const pageStory = storyMocks(alertOverviewMocks, { layout: 'app' });

/**
 * One rule read only: its condition, the series it evaluates against, its state
 * and the channels it notifies.
 *
 * Route: `/alerts/overview?ruleId=...`.
 */
const meta = {
	title: 'Pages/Alerts/Overview',
	tags: ['play'],
	component: AlertList,
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<AlertOverviewArgs>;

export default meta;

type Story = StoryObj<AlertOverviewArgs>;

/**
 * One alert rule opened up: the query it watches, the condition it fires on and
 * where the notification goes.
 */
export const Default: Story = {};

/**
 * An anomaly rule in the current schema: the condition reads in deviations from
 * the forecast, and the preview draws the band the rule compares against.
 */
export const AnomalyRule: Story = {
	args: { ruleKind: 'anomaly' },
};

/**
 * The anomaly rule with one series picked in the preview: that series drawn
 * against its forecast, inside the band of deviations the rule allows.
 */
export const AnomalyRuleForecastBand: Story = {
	args: { ruleKind: 'anomaly' },
	play: pickAnomalySeries,
};

/** A rule someone turned off: the toggle in the header is what turns it back on. */
export const Disabled: Story = {
	args: { ruleState: 'disabled' },
};

/** A rule with no matching series in the window, so the preview has nothing to draw. */
export const NoPreviewData: Story = {
	args: { previewSeries: 0 },
};

/**
 * The rule's filter no longer parses: the preview says it could not load, with
 * a retry, and the error icon beside the title holds the server's message.
 */
export const PreviewQueryError: Story = {
	args: { previewQuery: 'invalid' },
	parameters: { allowConsoleErrors: true },
};

/** The preview's error icon, hovered: the code, message, docs link and parser output. */
export const PreviewQueryErrorDetails: Story = {
	args: { previewQuery: 'invalid' },
	parameters: { allowConsoleErrors: true },
	play: openPreviewErrorDetails,
};

/** The rule id in the URL does not resolve, which is where the page gives up. */
export const RuleNotFound: Story = {
	args: { dataState: 'error' },
	// The mocked rule request intentionally fails; the resulting console error is
	// the point of the story, not a regression.
	parameters: { allowConsoleErrors: true },
};

/**
 * The rule's own More options menu, open off the header: rename it, duplicate
 * it, or delete it.
 */
export const AlertActionsMenu: Story = {
	play: openAlertActionsMenu,
};

/** The rule saved unchanged from the footer: the toast raised once the PUT answers. */
export const AlertRuleUpdatedToast: Story = {
	play: saveAlertRule,
};

/** Test Notification from the footer. */
export const TestNotificationSentToast: Story = {
	play: sendTestNotification,
};

/** Test Notification finding nothing to alert on: the error toast. */
export const TestNotificationNoAlertsToast: Story = {
	args: { testNotification: 'no-alerts' },
	play: sendTestNotification,
};
