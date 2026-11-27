/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import {
	type alertOverviewMocks,
	canCloneRule,
	canDeleteRule,
	canDetachSavedChannel,
	canSaveRule,
	canTestRule,
	canToggleRule,
	clickFooterButton,
	deniesRuleRead,
	SAVED_CHANNEL_ID,
	showsRuleForm,
} from '../AlertOverview.stories.mocks';

type AlertOverviewArgs = PageStoryArgs<typeof alertOverviewMocks>;

interface PlayContext {
	canvasElement: HTMLElement;
	args: AlertOverviewArgs;
}

const untilLoaded = { timeout: 15_000 };

/** Picks the first series in the anomaly preview, drawing it against its band. */
export const selectForecastSeries = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (
		!showsRuleForm(args) ||
		args.ruleKind !== 'anomaly' ||
		args.previewSeries === 0
	) {
		return;
	}

	const [firstSeries] = await within(canvasElement).findAllByTestId(
		'anomaly-series-option',
		undefined,
		untilLoaded,
	);
	await userEvent.click(firstSeries);
};

/** Opens the header's More options menu. */
export const openActionsMenu = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (args.dataState !== 'loaded') {
		return;
	}

	await userEvent.click(
		await within(canvasElement).findByTestId(
			'alert-actions-menu',
			undefined,
			untilLoaded,
		),
	);
	await screen.findByRole('menu');
};

/** Saves the rule unchanged from the footer. */
export const saveRule = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (!canSaveRule(args)) {
		return;
	}

	await clickFooterButton(canvasElement, 'save-alert-rule-button');
	await waitFor(() =>
		expect(screen.getByText(/alert rule updated successfully/i)).toBeVisible(),
	);
};

/** Sends a test notification from the footer. */
export const sendTestNotification = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (!canTestRule(args)) {
		return;
	}

	await clickFooterButton(canvasElement, 'test-notification-button');
	if (args.testNotification === 'sent') {
		await waitFor(() =>
			expect(
				screen.getByText(/test notification sent successfully/i),
			).toBeVisible(),
		);
	}
};

/**
 * A control is also disabled while its check is pending, and the footer remounts
 * once the rule loads, so it is looked up until it names its denial.
 */
const expectDenied = (
	canvasElement: HTMLElement,
	testId: string,
	permission: RegExp,
): Promise<void> =>
	waitFor(
		() =>
			expect(
				within(canvasElement)
					.getByTestId(testId)
					.getAttribute('data-denied-permissions'),
			).toMatch(permission),
		untilLoaded,
	);

/** The page refuses the rule: the full-page denial names `read` on it. */
export const expectRuleDenied = async ({
	args,
}: PlayContext): Promise<void> => {
	if (!deniesRuleRead(args)) {
		return;
	}

	await screen.findByText(
		'Uh-oh! You are not authorized',
		undefined,
		untilLoaded,
	);
	await screen.findByText(/read:rule:/);
};

/** The toggle, the name, the labels and Save are locked. */
export const expectUpdateLocked = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (!showsRuleForm(args) || canToggleRule(args)) {
		return;
	}

	const canvas = within(canvasElement);
	await waitFor(
		() =>
			expect(canvas.getByTestId('alert-actions-toggle')).toHaveAttribute(
				'aria-disabled',
				'true',
			),
		untilLoaded,
	);
	await expect(canvas.getByTestId('alert-name-input-field')).toBeDisabled();
	await expect(canvas.getByTestId('alert-add-label-button')).toBeDisabled();
	await expectDenied(canvasElement, 'save-alert-rule-button', /update/);
};

const openActionsMenuItem = async (
	canvasElement: HTMLElement,
	testId: string,
): Promise<HTMLElement> => {
	await userEvent.click(
		await within(canvasElement).findByTestId(
			'alert-actions-menu',
			undefined,
			untilLoaded,
		),
	);
	return screen.findByTestId(testId, undefined, untilLoaded);
};

/** Clone is locked in the header menu, and Test notification in the footer. */
export const expectCloneLocked = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (!showsRuleForm(args) || canCloneRule(args)) {
		return;
	}

	await expectDenied(canvasElement, 'test-notification-button', /create/);
	const clone = await openActionsMenuItem(
		canvasElement,
		'alert-details-action-clone',
	);
	await waitFor(
		() => expect(clone).toHaveAttribute('data-disabled'),
		untilLoaded,
	);
};

/** Delete is locked in the header menu. */
export const expectDeleteLocked = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (!showsRuleForm(args) || canDeleteRule(args)) {
		return;
	}

	const remove = await openActionsMenuItem(
		canvasElement,
		'alert-details-action-delete',
	);
	await waitFor(
		() => expect(remove).toHaveAttribute('data-disabled'),
		untilLoaded,
	);
};

/** The channel the rule notifies cannot be taken off it. */
export const expectSavedChannelLocked = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (
		!showsRuleForm(args) ||
		args.channels === 0 ||
		canDetachSavedChannel(args)
	) {
		return;
	}

	// The picker is disabled until the channels load, and remounts with the form.
	const combobox = (): HTMLElement =>
		within(
			within(canvasElement).getAllByTestId(
				'threshold-notification-channel-select',
			)[0],
		).getByRole('combobox');
	await waitFor(
		() => expect(combobox()).not.toHaveAttribute('disabled'),
		untilLoaded,
	);
	await userEvent.click(combobox());
	const [option] = await screen.findAllByTestId(
		new RegExp(`-channel-option-${SAVED_CHANNEL_ID}$`),
		undefined,
		untilLoaded,
	);
	await waitFor(
		() =>
			expect(option).toHaveAttribute(
				'aria-description',
				expect.stringMatching(/is not authorized/),
			),
		untilLoaded,
	);
	await expect(option).toHaveAttribute('aria-disabled', 'true');
};
