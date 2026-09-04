import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import { withAppLayout } from '@/storybook/decorators/withAppLayout';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { LOGIN_EMAIL } from './__story_mockdata__/login';
import Login from './index';
import { loginMocks } from './Login.stories.mocks';

type LoginArgs = PageStoryArgs<typeof loginMocks>;

const pageStory = storyMocks(loginMocks);

/**
 * The login page: the auth methods the org offers, the SSO redirect, and what a
 * failed callback leaves behind.
 *
 * Route: `/login`.
 */
const meta = {
	title: 'Pages/Auth/Login',
	tags: ['play'],
	component: Login,
	decorators: [withAppLayout],
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<LoginArgs>;

export default meta;

type Story = StoryObj<LoginArgs>;

/** The page resolves the workspace before it asks for anything else. */
const submitEmail = async (canvasElement: HTMLElement): Promise<void> => {
	const canvas = within(canvasElement);

	// Both the field and the button are disabled until the version call the page
	// gates on has come back, which outlasts the story's first paint.
	const email = await canvas.findByTestId('email');
	await waitFor(() => expect(email).toBeEnabled());
	await userEvent.type(email, LOGIN_EMAIL);

	const next = canvas.getByRole('button', { name: /next/i });
	await waitFor(() => expect(next).toBeEnabled());
	await userEvent.click(next);
};

/** The first step: the email, which is what decides how the user signs in. */
export const Default: Story = {};

/** The email resolved to one password workspace, so the password field is next. */
export const PasswordStep: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await submitEmail(canvasElement);
		await expect(
			await within(canvasElement).findByTestId('password'),
		).toBeVisible();
	},
};

/** An email in three workspaces: the organization has to be picked first. */
export const MultipleOrganizations: Story = {
	args: { orgs: 3 },
	play: async ({ canvasElement }): Promise<void> => {
		await submitEmail(canvasElement);
		await expect(await within(canvasElement).findByTestId('orgId')).toBeVisible();
	},
};

/** A workspace behind an identity provider: no password, a hand-off instead. */
export const SingleSignOn: Story = {
	args: { authN: 'sso' },
	play: async ({ canvasElement }): Promise<void> => {
		await submitEmail(canvasElement);
	},
};

/** Redirected back from the provider with the assertion rejected. */
export const CallbackFailed: Story = {
	args: { callbackError: true },
};
