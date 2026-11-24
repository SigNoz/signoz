/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import {
	canPickStoryChannel,
	canWriteRule,
	clickFooterButton,
	deniedWriteChecks,
	offersChannelCreate,
	type createAlertMocks,
	fillValidAlert,
	STORY_CHANNEL_ID,
	TELEMETRY_DENIAL,
} from '../CreateAlert.stories.mocks';

type CreateAlertArgs = PageStoryArgs<typeof createAlertMocks>;

interface PlayContext {
	canvasElement: HTMLElement;
	args: CreateAlertArgs;
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

	if (!canWriteRule(args)) {
		return;
	}

	await fillValidAlert(canvasElement);
	await clickFooterButton(canvasElement, 'save-alert-rule-button');
	if (args.ruleWrite === 'telemetry-denied') {
		await screen.findByText(TELEMETRY_DENIAL, undefined, untilLoaded);
		return;
	}
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

	if (!canWriteRule(args)) {
		return;
	}

	await fillValidAlert(canvasElement);
	await clickFooterButton(canvasElement, 'test-notification-button');
	if (args.ruleWrite === 'telemetry-denied') {
		await screen.findByText(TELEMETRY_DENIAL, undefined, untilLoaded);
		return;
	}
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

const openChannelPicker = async (canvasElement: HTMLElement): Promise<void> => {
	const canvas = within(canvasElement);
	const picker = (): HTMLElement =>
		within(canvas.getByTestId('threshold-notification-channel-select')).getByRole(
			'combobox',
		);
	// The picker is disabled until the channels load.
	await waitFor(
		() => expect(picker()).not.toHaveAttribute('disabled'),
		untilLoaded,
	);
	await userEvent.click(picker());
};

/** The story channel's option in the first threshold's picker. */
const storyChannelOption = (): Promise<HTMLElement> =>
	screen.findByTestId(
		`threshold-critical-channel-option-${STORY_CHANNEL_ID}`,
		undefined,
		untilLoaded,
	);

/**
 * The picker offers the channel but will not take it without `attach` on the
 * channel. A pending option is disabled too, so the denial is read from its
 * title.
 */
export const expectChannelLocked = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (
		args.alertMode === 'select-type' ||
		args.channels === 0 ||
		canPickStoryChannel(args)
	) {
		return;
	}

	await openChannelPicker(canvasElement);
	const option = await storyChannelOption();
	await waitFor(
		() => expect(option.title).toMatch(/is not authorized/),
		untilLoaded,
	);
	await expect(option).toHaveAttribute('aria-disabled', 'true');
};

/**
 * A valid rule whose Save and Test notification name exactly the checks the
 * role is missing: `create`, or `attach` on rules, which a new rule is only
 * asked for on Save.
 */
export const expectWriteLocked = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (
		args.alertMode === 'select-type' ||
		!canPickStoryChannel(args) ||
		canWriteRule(args)
	) {
		return;
	}

	await fillValidAlert(canvasElement);
	const canvas = within(canvasElement);
	for (const testId of ['save-alert-rule-button', 'test-notification-button']) {
		await waitFor(
			() =>
				expect(canvas.getByTestId(testId)).toHaveAttribute(
					'data-denied-permissions',
					deniedWriteChecks(args),
				),
			untilLoaded,
		);
		await expect(canvas.getByTestId(testId)).toHaveAttribute(
			'aria-disabled',
			'true',
		);
	}
};

/** With no channels, the picker asks for an admin instead of offering to create one. */
export const expectNoChannelCreateLink = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (
		args.alertMode === 'select-type' ||
		args.channels > 0 ||
		offersChannelCreate(args)
	) {
		return;
	}

	await openChannelPicker(canvasElement);
	await screen.findByText(
		'Please ask your admin to create one.',
		undefined,
		untilLoaded,
	);
	await expect(
		screen.queryByTestId('channels-not-found-create'),
	).not.toBeInTheDocument();
};
