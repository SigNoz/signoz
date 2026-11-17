/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import {
	type CreateAlertArgs,
	showsInvalidQueryError,
} from '../CreateAlert.stories.mocks';

interface PlayContext {
	canvasElement: HTMLElement;
	args: CreateAlertArgs;
}

const untilLoaded = { timeout: 15_000 };

const fillValidAlert = async (canvasElement: HTMLElement): Promise<void> => {
	const canvas = within(canvasElement);

	await userEvent.type(
		await canvas.findByTestId('alert-name-input', undefined, untilLoaded),
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

const clickFooterButton = async (
	canvasElement: HTMLElement,
	testId: string,
): Promise<void> => {
	const button = await within(canvasElement).findByTestId(testId);

	await waitFor(async () => {
		await expect(button).toBeEnabled();
		await expect(button).not.toHaveAttribute('aria-disabled', 'true');
	});
	await userEvent.click(button);
};

export const enableRoutingPolicies = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
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

export const holdMatchTypeTooltip = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
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

export const saveAlertRule = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	await fillValidAlert(canvasElement);
	await clickFooterButton(canvasElement, 'save-alert-rule-button');
	await waitFor(() =>
		expect(screen.getByText(/alert rule created successfully/i)).toBeVisible(),
	);
};

export const sendTestNotification = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
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
