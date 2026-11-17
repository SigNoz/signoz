/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import {
	type AlertOverviewArgs,
	showsInvalidQueryError,
} from '../AlertOverview.stories.mocks';

interface PlayContext {
	canvasElement: HTMLElement;
	args: AlertOverviewArgs;
}

const untilLoaded = { timeout: 15_000 };

const clickFooterButton = async (
	canvasElement: HTMLElement,
	testId: string,
): Promise<void> => {
	// The footer stays disabled, and remounts, until the rule has loaded.
	const button = await waitFor(async () => {
		const element = within(canvasElement).getByTestId(testId);

		await expect(element).toBeEnabled();
		await expect(element).not.toHaveAttribute('aria-disabled', 'true');

		return element;
	}, untilLoaded);
	await userEvent.click(button);
};

export const pickAnomalySeries = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	const [firstSeries] = await within(canvasElement).findAllByTestId(
		'anomaly-series-option',
		undefined,
		untilLoaded,
	);
	await userEvent.click(firstSeries);
};

export const openAlertActionsMenu = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	await userEvent.click(
		await within(canvasElement).findByTestId(
			'alert-actions-menu',
			{},
			{ timeout: 10000 },
		),
	);
	await screen.findByRole('menu');
};

export const saveAlertRule = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	await clickFooterButton(canvasElement, 'save-alert-rule-button');
	await waitFor(() =>
		expect(screen.getByText(/alert rule updated successfully/i)).toBeVisible(),
	);
};

export const sendTestNotification = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	await clickFooterButton(canvasElement, 'test-notification-button');
	if (args.testNotification === 'sent') {
		await waitFor(() =>
			expect(
				screen.getByText(/test notification sent successfully/i),
			).toBeVisible(),
		);
	}
};

export const openPreviewErrorDetails = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (!showsInvalidQueryError(args)) {
		return;
	}

	await userEvent.hover(
		await within(canvasElement).findByTestId(
			'alert-preview-error-status',
			undefined,
			untilLoaded,
		),
	);
	await waitFor(() =>
		expect(screen.getByTestId('panel-status-content')).toBeVisible(),
	);
};
