/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import type { FeedbackState } from '../FeedbackFixture';

interface PlayContext {
	canvasElement: HTMLElement;
	args: { state: FeedbackState };
}

const showFeedback = async (canvasElement: HTMLElement): Promise<void> => {
	await userEvent.click(
		within(canvasElement).getByTestId('show-feedback-toast'),
	);
};

export const showsSuccessToast = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (args.state !== 'success-toast') {
		return;
	}

	await showFeedback(canvasElement);
	await screen.findByText('Retention policy updated successfully');
	await waitFor(() =>
		expect(
			screen.getByText('Retention policy updated successfully'),
		).toBeVisible(),
	);
};

export const showsActionableErrorToast = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (args.state !== 'actionable-error-toast') {
		return;
	}

	await showFeedback(canvasElement);
	await screen.findByText('Failed to save the notification channel');
	await waitFor(() =>
		expect(
			screen.getByText('Failed to save the notification channel'),
		).toBeVisible(),
	);
	await screen.findByRole('button', { name: 'Retry' });
	await waitFor(() =>
		expect(screen.getByRole('button', { name: 'Retry' })).toBeVisible(),
	);
};

export const showsLongMultilineToast = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (args.state !== 'long-toast') {
		return;
	}

	await showFeedback(canvasElement);
	await expect(
		await screen.findByText(/could not apply the retention policy/i),
	).toBeVisible();
};

export const showsPromiseLoadingToast = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (args.state !== 'promise-loading-toast') {
		return;
	}

	await showFeedback(canvasElement);
	await expect(await screen.findByText('Enabling the alert rule')).toBeVisible();
};

export const showsPromiseErrorToast = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (args.state !== 'promise-error-toast') {
		return;
	}

	await showFeedback(canvasElement);
	await expect(
		await screen.findByText('Could not clone the panel'),
	).toBeVisible();
	await screen.findByRole('button', { name: 'Dismiss' });
};

export const showsWarningToast = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (args.state !== 'warning-toast') {
		return;
	}

	await showFeedback(canvasElement);
	await expect(await screen.findByText('Some invites failed')).toBeVisible();
};

export const showsInfoToast = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (args.state !== 'info-toast') {
		return;
	}

	await showFeedback(canvasElement);
	await expect(await screen.findByText('Export cancelled')).toBeVisible();
};

export const showsDangerWithDescription = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (args.state !== 'danger-description-toast') {
		return;
	}

	await showFeedback(canvasElement);
	await expect(
		await screen.findByText('Failed to update account settings'),
	).toBeVisible();
	await screen.findByText(/does not have permission/i);
	await screen.findByRole('button', { name: 'Dismiss' });
};

export const closesConfirmationOnEscape = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (args.state !== 'confirmation') {
		return;
	}

	const trigger = within(canvasElement).getByTestId(
		'open-feedback-confirmation',
	);

	await userEvent.click(trigger);
	await screen.findByRole('dialog', { name: 'Delete environment' });

	await userEvent.keyboard('{Escape}');
	// Escape can close the dialog before the assertion runs, which
	// `waitForElementToBeRemoved` treats as an error rather than a pass.
	await waitFor(() =>
		expect(
			screen.queryByRole('dialog', { name: 'Delete environment' }),
		).not.toBeInTheDocument(),
	);
};

export const showsToastOverConfirmation = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (args.state !== 'toast-over-confirmation') {
		return;
	}

	await userEvent.click(
		within(canvasElement).getByTestId('open-feedback-confirmation'),
	);
	await screen.findByRole('dialog', { name: 'Delete environment' });
	await userEvent.click(
		await screen.findByRole('button', { name: 'Show error notification' }),
	);
	await expect(
		await screen.findByText(/could not apply the retention policy/i),
	).toBeVisible();
};
