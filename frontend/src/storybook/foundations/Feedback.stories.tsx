import type { Meta, StoryObj } from '@storybook/react-vite';

import { withCanvas } from '../decorators/withCanvas';
import {
	closesConfirmationOnEscape,
	showsActionableErrorToast,
	showsDangerWithDescription,
	showsInfoToast,
	showsLongMultilineToast,
	showsPromiseErrorToast,
	showsPromiseLoadingToast,
	showsSuccessToast,
	showsToastOverConfirmation,
	showsWarningToast,
} from './__story_mockdata__/feedback.play';
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
	play: showsSuccessToast,
};

/** Mutation: an actionable error notification that exposes its retry control. */
export const ActionableErrorToast: Story = {
	args: { state: 'actionable-error-toast' },
	play: showsActionableErrorToast,
};

/** Density: a long notification validates wrapping and multi-line toast sizing. */
export const LongMultilineToast: Story = {
	args: { state: 'long-toast' },
	play: showsLongMultilineToast,
};

/** A request still in flight: the loading toast stays until the promise settles. */
export const PromiseLoadingToast: Story = {
	args: { state: 'promise-loading-toast' },
	play: showsPromiseLoadingToast,
};

/** A failed request: the rejected toast keeps a Dismiss action, stacked top-center. */
export const PromiseErrorToast: Story = {
	args: { state: 'promise-error-toast' },
	play: showsPromiseErrorToast,
};

/** A warning that stays up, matching invites that only partly succeed. */
export const WarningToast: Story = {
	args: { state: 'warning-toast' },
	play: showsWarningToast,
};

/** An info toast pinned to the bottom-right stack, as export cancellation does. */
export const InfoToast: Story = {
	args: { state: 'info-toast' },
	play: showsInfoToast,
};

/** An error toast with a description and a Dismiss action, bottom-right. */
export const DangerWithDescription: Story = {
	args: { state: 'danger-description-toast' },
	play: showsDangerWithDescription,
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
	play: closesConfirmationOnEscape,
};

/** Interaction: an error toast remains visible above an open destructive confirmation. */
export const ToastOverConfirmation: Story = {
	args: { state: 'toast-over-confirmation' },
	play: showsToastOverConfirmation,
};
