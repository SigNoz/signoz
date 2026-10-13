import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import { withCanvas } from '../decorators/withCanvas';
import FeedbackFixture from './FeedbackFixture';

const meta = {
	title: 'Foundations/Feedback',
	component: FeedbackFixture,
	tags: ['play'],
	decorators: [withCanvas({ maxWidth: 640 })],
} satisfies Meta<typeof FeedbackFixture>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Mutation: persistent success feedback from the application toaster. */
export const SuccessToast: Story = {
	args: { state: 'success-toast' },
	play: async ({ canvasElement }): Promise<void> => {
		await userEvent.click(
			within(canvasElement).getByTestId('show-feedback-toast'),
		);
		await screen.findByText('Retention policy updated successfully');
		await waitFor(() =>
			expect(
				screen.getByText('Retention policy updated successfully'),
			).toBeVisible(),
		);
	},
};

/** Mutation: an actionable error notification that exposes its retry control. */
export const ActionableErrorToast: Story = {
	args: { state: 'actionable-error-toast' },
	play: async ({ canvasElement }): Promise<void> => {
		await userEvent.click(
			within(canvasElement).getByTestId('show-feedback-toast'),
		);
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
	},
};

/** Density: a long notification validates wrapping and multi-line toast sizing. */
export const LongMultilineToast: Story = {
	args: { state: 'long-toast' },
	play: async ({ canvasElement }): Promise<void> => {
		await userEvent.click(
			within(canvasElement).getByTestId('show-feedback-toast'),
		);
		await expect(
			await screen.findByText(/could not apply the retention policy/i),
		).toBeVisible();
	},
};

/** A request still in flight: the loading toast stays until the promise settles. */
export const PromiseLoadingToast: Story = {
	args: { state: 'promise-loading-toast' },
	play: async ({ canvasElement }): Promise<void> => {
		await userEvent.click(
			within(canvasElement).getByTestId('show-feedback-toast'),
		);
		await expect(
			await screen.findByText('Enabling the alert rule'),
		).toBeVisible();
	},
};

/** A failed request: the rejected toast keeps a Dismiss action, stacked top-center. */
export const PromiseErrorToast: Story = {
	args: { state: 'promise-error-toast' },
	play: async ({ canvasElement }): Promise<void> => {
		await userEvent.click(
			within(canvasElement).getByTestId('show-feedback-toast'),
		);
		await expect(
			await screen.findByText('Could not clone the panel'),
		).toBeVisible();
		await screen.findByRole('button', { name: 'Dismiss' });
	},
};

/** A warning that stays up, matching invites that only partly succeed. */
export const WarningToast: Story = {
	args: { state: 'warning-toast' },
	play: async ({ canvasElement }): Promise<void> => {
		await userEvent.click(
			within(canvasElement).getByTestId('show-feedback-toast'),
		);
		await expect(await screen.findByText('Some invites failed')).toBeVisible();
	},
};

/** An info toast pinned to the bottom-right stack, as export cancellation does. */
export const InfoToast: Story = {
	args: { state: 'info-toast' },
	play: async ({ canvasElement }): Promise<void> => {
		await userEvent.click(
			within(canvasElement).getByTestId('show-feedback-toast'),
		);
		await expect(await screen.findByText('Export cancelled')).toBeVisible();
	},
};

/** A danger toast with a description and a Dismiss action, bottom-right. */
export const DangerWithDescription: Story = {
	args: { state: 'danger-description-toast' },
	play: async ({ canvasElement }): Promise<void> => {
		await userEvent.click(
			within(canvasElement).getByTestId('show-feedback-toast'),
		);
		await expect(
			await screen.findByText('Failed to update account settings'),
		).toBeVisible();
		await screen.findByText(/does not have permission/i);
		await screen.findByRole('button', { name: 'Dismiss' });
	},
};

/** Mutation: the inline application alert preserves its action affordance. */
export const InlineAlert: Story = {
	args: { state: 'inline-alert' },
};

/**
 * Interaction: verifies Escape closes the destructive confirmation. The dialog
 * drops focus on the body rather than returning it to the trigger, so the story
 * asserts what it does; see `docs/reviews/signozhq-ui-drawer-feedback.md`.
 */
export const Confirmation: Story = {
	args: { state: 'confirmation' },
	play: async ({ canvasElement }): Promise<void> => {
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
	},
};

/** Interaction: an error toast remains visible above an open destructive confirmation. */
export const ToastOverConfirmation: Story = {
	args: { state: 'toast-over-confirmation' },
	play: async ({ canvasElement }): Promise<void> => {
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
	},
};
