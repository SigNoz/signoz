/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import {
	type alertOverviewMocks,
	canSaveRule,
	canTestRule,
	clickFooterButton,
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
