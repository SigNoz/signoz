import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import {
	clickFooterButton,
	createAlertMocks,
	fillValidAlert,
} from './CreateAlert.stories.mocks';

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
 * Anomaly detection, which is still written in the classic form: the seasonality
 * and the deviation take the place of a fixed threshold.
 */
export const AnomalyAlert: Story = {
	args: { alertMode: 'anomaly' },
};

/** The classic form, which `showClassicCreateAlertsPage` opts back into. */
export const ClassicForm: Story = {
	args: { alertMode: 'classic-form' },
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
	play: async ({ canvasElement }): Promise<void> => {
		const select = await within(canvasElement).findByTestId(
			'alert-threshold-match-type-select',
			undefined,
			{ timeout: 15_000 },
		);

		// The select opens off a mousedown on its inner selector, so a click on
		// the wrapper the test id sits on reaches nothing.
		await userEvent.click(within(select).getByRole('combobox'));

		await userEvent.hover(
			await screen.findByText('ALL THE TIME', undefined, { timeout: 15_000 }),
		);
		await screen.findByText('Example:', undefined, { timeout: 15_000 });
	},
};

/** A valid rule saved from the footer: the toast raised once the POST answers. */
export const AlertRuleCreatedToast: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await fillValidAlert(canvasElement);
		await clickFooterButton(canvasElement, 'save-alert-rule-button');
		await waitFor(() =>
			expect(screen.getByText(/alert rule created successfully/i)).toBeVisible(),
		);
	},
};

/** Test Notification on a rule whose condition fires: the success toast. */
export const TestNotificationSentToast: Story = {
	play: async ({ canvasElement, args }): Promise<void> => {
		await fillValidAlert(canvasElement);
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

/** Test Notification on a rule that finds nothing to alert on: the error toast. */
export const TestNotificationNoAlertsToast: Story = {
	args: { testNotification: 'no-alerts' },
	play: TestNotificationSentToast.play,
};
