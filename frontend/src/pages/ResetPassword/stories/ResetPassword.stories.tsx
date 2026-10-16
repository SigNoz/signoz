import type { Meta, StoryObj } from '@storybook/react-vite';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import ResetPassword from '../index';
import { resetPasswordMocks } from './ResetPassword.stories.mocks';

type ResetPasswordArgs = PageStoryArgs<typeof resetPasswordMocks>;

const pageStory = storyMocks(resetPasswordMocks, { layout: 'app' });

/**
 * The reset form behind a token, valid or not.
 *
 * Route: `/password-reset?token=...`.
 */
const meta = {
	title: 'Pages/Auth/Reset Password',
	component: ResetPassword,
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<ResetPasswordArgs>;

export default meta;

type Story = StoryObj<ResetPasswordArgs>;

/** What the link in the reset email opens: a new password and its confirmation. */
export const Default: Story = {};

/** The link used too late, which the page tells the user to ask again for. */
export const ExpiredLink: Story = {
	args: { token: 'expired' },
	// The deliberate 410 is the state under test.
	parameters: { allowConsoleErrors: true },
};
