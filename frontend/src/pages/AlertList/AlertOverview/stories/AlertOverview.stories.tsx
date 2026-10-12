import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import {
	alertOverviewMocks,
	clickFooterButton,
} from './AlertOverview.stories.mocks';

import AlertList from '../../index';

type AlertOverviewArgs = PageStoryArgs<typeof alertOverviewMocks>;

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

/** A rule written before the current schema, which opens in the classic form. */
export const ClassicSchema: Story = {
	args: { alertSchema: 'classic' },
};

/** A rule someone turned off: the toggle in the header is what turns it back on. */
export const Disabled: Story = {
	args: { ruleState: 'disabled' },
};

/** A rule with no matching series in the window, so the preview has nothing to draw. */
export const NoPreviewData: Story = {
	args: { previewSeries: 0 },
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
	play: async ({ canvasElement }): Promise<void> => {
		await userEvent.click(
			await within(canvasElement).findByTestId(
				'alert-actions-menu',
				{},
				{ timeout: 10000 },
			),
		);
		await screen.findByRole('menu');
	},
};

/** The rule saved unchanged from the footer: the toast raised once the PUT answers. */
export const AlertRuleUpdatedToast: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await clickFooterButton(canvasElement, 'save-alert-rule-button');
		await waitFor(() =>
			expect(screen.getByText(/alert rule updated successfully/i)).toBeVisible(),
		);
	},
};

/** Test Notification from the footer. */
export const TestNotificationSentToast: Story = {
	play: async ({ canvasElement, args }): Promise<void> => {
		await clickFooterButton(canvasElement, 'test-notification-button');
		if (args.testNotification === 'sent') {
			await waitFor(() =>
				expect(
					screen.getByText(/test notification sent successfully/i),
				).toBeVisible(),
			);
		}
	},
};

/** Test Notification finding nothing to alert on: the error toast. */
export const TestNotificationNoAlertsToast: Story = {
	args: { testNotification: 'no-alerts' },
	play: TestNotificationSentToast.play,
};
