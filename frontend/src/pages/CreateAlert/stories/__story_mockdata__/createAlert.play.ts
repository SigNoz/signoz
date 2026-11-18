/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import {
	clickFooterButton,
	type createAlertMocks,
	fillValidAlert,
} from '../CreateAlert.stories.mocks';

type CreateAlertArgs = PageStoryArgs<typeof createAlertMocks>;

interface PlayContext {
	canvasElement: HTMLElement;
	args: Pick<CreateAlertArgs, 'alertMode' | 'testNotification'>;
}

const untilLoaded = { timeout: 15_000 };

/** Every rule type carries the banner; only the type picker has no form. */
export const enableRoutingPolicies = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (args.alertMode === 'select-type') {
		return;
	}

	const canvas = within(canvasElement);

	await userEvent.click(
		await canvas.findByTestId('routing-policies-switch', undefined, untilLoaded),
	);
	await waitFor(() =>
		expect(
			canvas.queryByTestId('threshold-notification-channel-select'),
		).not.toBeInTheDocument(),
	);
};

/**
 * Opens the match-type list and holds the tallest of its tooltips, "all the
 * time", whose example runs to two lines.
 */
export const openMatchTypeTooltip = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (args.alertMode === 'select-type') {
		return;
	}

	const select = await within(canvasElement).findByTestId(
		'alert-threshold-match-type-select',
		undefined,
		untilLoaded,
	);

	// The select opens off a mousedown on its inner selector, so a click on
	// the wrapper the test id sits on reaches nothing.
	await userEvent.click(within(select).getByRole('combobox'));

	await userEvent.hover(
		await screen.findByText('ALL THE TIME', undefined, untilLoaded),
	);
	await screen.findByText('Example:', undefined, untilLoaded);
};

/** Fills a valid rule and saves it from the footer. */
export const saveValidAlert = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (args.alertMode === 'select-type') {
		return;
	}

	await fillValidAlert(canvasElement);
	await clickFooterButton(canvasElement, 'save-alert-rule-button');
	await waitFor(() =>
		expect(screen.getByText(/alert rule created successfully/i)).toBeVisible(),
	);
};

/** Fills a valid rule and sends a test notification from the footer. */
export const sendTestNotification = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (args.alertMode === 'select-type') {
		return;
	}

	await fillValidAlert(canvasElement);
	await clickFooterButton(canvasElement, 'test-notification-button');
	if (args.testNotification === 'sent') {
		await waitFor(() =>
			expect(
				screen.getByText(/test notification sent successfully/i),
			).toBeVisible(),
		);
	}
};

/** Turns on repeat notifications, which reveals the interval, unit and conditions row. */
export const enableRepeatNotifications = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (args.alertMode === 'select-type') {
		return;
	}

	const canvas = within(canvasElement);
	const option = await canvas.findByTestId(
		'repeat-notifications-container',
		undefined,
		untilLoaded,
	);

	await userEvent.click(within(option).getByRole('switch'));
	await waitFor(() =>
		expect(canvas.getByTestId('repeat-notifications-time-input')).toBeVisible(),
	);
};
