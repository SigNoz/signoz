import type { Meta, StoryObj } from '@storybook/react-vite';
import { userEvent, within } from 'storybook/test';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import ForgotPassword from '../index';
import { forgotPasswordMocks } from './ForgotPassword.stories.mocks';

type ForgotPasswordArgs = PageStoryArgs<typeof forgotPasswordMocks>;

const pageStory = storyMocks(forgotPasswordMocks, { layout: 'app' });

/**
 * The reset request form, before any session exists.
 *
 * Route: `/forgot-password`.
 */
const meta = {
	title: 'Pages/Auth/Forgot Password',
	tags: ['play'],
	component: ForgotPassword,
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<ForgotPasswordArgs>;

export default meta;

type Story = StoryObj<ForgotPasswordArgs>;

const submit = async (canvasElement: HTMLElement): Promise<void> => {
	await userEvent.click(
		await within(canvasElement).findByRole('button', {
			name: /send reset link/i,
		}),
	);
};

/** The email the login form carried over, ready to have a reset link sent to it. */
export const Default: Story = {};

/** An email in three workspaces: the reset is scoped to one, so it has to be picked. */
export const MultipleOrganizations: Story = {
	args: { orgs: 3 },
};

/** The link sent: what the page shows instead of the form. */
export const LinkSent: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await submit(canvasElement);
		await within(canvasElement).findByRole('heading', {
			name: /check your email/i,
		});
	},
};

/** Asked once too often, which the backend rate-limits. */
export const RateLimited: Story = {
	args: { request: 'rejected' },
	// The deliberate 429 is the state under test.
	parameters: { allowConsoleErrors: true },
	play: async ({ canvasElement }): Promise<void> => {
		await submit(canvasElement);
		await within(canvasElement).findByText(/rate_limited/i);
	},
};
