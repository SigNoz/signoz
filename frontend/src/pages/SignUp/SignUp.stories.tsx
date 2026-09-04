import type { Meta, StoryObj } from '@storybook/react-vite';
import { userEvent, within } from 'storybook/test';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import { withAppLayout } from '@/storybook/decorators/withAppLayout';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { SIGNUP_EMAIL, SIGNUP_PASSWORD } from './__story_mockdata__/signUp';
import SignUp from './SignUp';
import { signUpMocks } from './SignUp.stories.mocks';

type SignUpArgs = PageStoryArgs<typeof signUpMocks>;

const pageStory = storyMocks(signUpMocks);

/**
 * The sign up form, including the first run of a self hosted instance.
 *
 * Route: `/signup`.
 */
const meta = {
	title: 'Pages/Auth/Sign Up',
	tags: ['play'],
	component: SignUp,
	decorators: [withAppLayout],
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<SignUpArgs>;

export default meta;

type Story = StoryObj<SignUpArgs>;

const fillForm = async (
	canvasElement: HTMLElement,
	confirmPassword: string,
): Promise<void> => {
	const canvas = within(canvasElement);

	await userEvent.type(
		canvas.getByPlaceholderText(/john@signoz.io/i),
		SIGNUP_EMAIL,
	);
	await userEvent.type(
		canvas.getByPlaceholderText(/enter new password/i),
		SIGNUP_PASSWORD,
	);
	await userEvent.type(
		canvas.getByPlaceholderText(/confirm your new password/i),
		confirmPassword,
	);
	// The mismatch message is what the blur is for, not the typing.
	await userEvent.tab();
};

/** The first account on a fresh install, which is always an admin. */
export const Default: Story = {};

/** The confirmation typed differently, caught when the field is left. */
export const PasswordMismatch: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await fillForm(canvasElement, 'something-else');
		await within(canvasElement).findByText(/passwords don't match/i);
	},
};

/** A workspace that already has its admin, which is what setup being done looks like. */
export const RegistrationRejected: Story = {
	args: { registration: 'rejected' },
	play: async ({ canvasElement }): Promise<void> => {
		const canvas = within(canvasElement);

		await fillForm(canvasElement, SIGNUP_PASSWORD);
		await userEvent.click(
			canvas.getByRole('button', { name: /access my workspace/i }),
		);
		await canvas.findByText(/already_exists/i);
	},
};
