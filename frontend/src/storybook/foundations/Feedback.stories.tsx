import type { Meta, StoryObj } from '@storybook/react-vite';
import {
	expect,
	screen,
	userEvent,
	waitForElementToBeRemoved,
	within,
} from 'storybook/test';

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
		await expect(
			await screen.findByText('Retention policy updated successfully'),
		).toBeVisible();
	},
};

/** Mutation: an actionable error notification that exposes its retry control. */
export const ActionableErrorToast: Story = {
	args: { state: 'actionable-error-toast' },
	play: async ({ canvasElement }): Promise<void> => {
		await userEvent.click(
			within(canvasElement).getByTestId('show-feedback-toast'),
		);
		await expect(
			await screen.findByText('Failed to save the notification channel'),
		).toBeVisible();
		await expect(
			await screen.findByRole('button', { name: 'Retry' }),
		).toBeVisible();
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
		const dialog = await screen.findByRole('dialog', {
			name: 'Delete environment',
		});

		await userEvent.keyboard('{Escape}');
		await waitForElementToBeRemoved(dialog);
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
