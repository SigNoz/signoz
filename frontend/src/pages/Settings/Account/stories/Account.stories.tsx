import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { accountMocks } from './Account.stories.mocks';

import SettingsPage from '../../Settings';

type AccountArgs = PageStoryArgs<typeof accountMocks>;

const pageStory = storyMocks(accountMocks, { layout: 'app' });

/**
 * The signed in user's own settings: name, password and timezone.
 *
 * Route: `/settings/my-settings`.
 */
const meta = {
	title: 'Pages/Settings/Account',
	tags: ['play'],
	component: SettingsPage,
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<AccountArgs>;

export default meta;

type Story = StoryObj<AccountArgs>;

/** The page fetches before it renders a control, which outlasts the 1s default. */
const untilLoaded = { timeout: 15_000 };

/**
 * The signed-in user's own settings: who they are signed in as, the theme and
 * console preferences that follow them, and the license key of the instance.
 */
export const Default: Story = {};

/**
 * A user reading timestamps in a zone other than their browser's, which the
 * console flags so a misread graph is traceable to the setting.
 */
export const TimezoneOverridden: Story = {
	args: { timezone: 'overridden' },
};

/** The name the rest of the console shows this user under. */
export const UpdateName: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await userEvent.click(
			await within(canvasElement).findByText(
				/update name/i,
				undefined,
				untilLoaded,
			),
		);
		await screen.findByPlaceholderText(
			/e\.g\. john doe/i,
			undefined,
			untilLoaded,
		);
	},
};

/** Changing the password from inside the console rather than the reset flow. */
export const ResetPassword: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await userEvent.click(
			await within(canvasElement).findByText(
				/reset password/i,
				undefined,
				untilLoaded,
			),
		);
		await screen.findByText(/current password/i, undefined, untilLoaded);
	},
};

/**
 * A new name saved: the toast confirming it. Set Name update to `error` or
 * `loading` to see the modal instead.
 */
export const NameUpdatedToast: Story = {
	play: async ({ canvasElement, args }): Promise<void> => {
		await userEvent.click(
			await within(canvasElement).findByText(
				/update name/i,
				undefined,
				untilLoaded,
			),
		);
		const input = await screen.findByPlaceholderText(
			/e\.g\. john doe/i,
			undefined,
			untilLoaded,
		);

		await userEvent.clear(input);
		await userEvent.type(input, 'Jon Targaryen');
		await userEvent.click(await screen.findByTestId('update-name-btn'));
		if (args.nameUpdate === 'success') {
			await waitFor(() =>
				expect(screen.getByText(/name updated successfully/i)).toBeVisible(),
			);
		}
	},
};

/**
 * A new password saved: the toast confirming it. Set Password update to `error`
 * or `loading` to see the modal instead.
 */
export const PasswordUpdatedToast: Story = {
	play: async ({ canvasElement, args }): Promise<void> => {
		await userEvent.click(
			await within(canvasElement).findByText(
				/reset password/i,
				undefined,
				untilLoaded,
			),
		);
		await userEvent.type(
			await screen.findByTestId(
				'current-password-textbox',
				undefined,
				untilLoaded,
			),
			'old-password-1',
		);
		await userEvent.type(
			await screen.findByTestId('new-password-textbox'),
			'new-password-2',
		);
		await userEvent.click(await screen.findByTestId('reset-password-btn'));
		if (args.passwordUpdate === 'success') {
			await waitFor(() =>
				expect(screen.getByText(/password updated successfully/i)).toBeVisible(),
			);
		}
	},
};
