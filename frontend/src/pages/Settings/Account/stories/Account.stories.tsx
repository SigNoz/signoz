import type { Meta, StoryObj } from '@storybook/react-vite';
import { screen, userEvent, within } from 'storybook/test';

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
