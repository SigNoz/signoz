import type { Meta, StoryObj } from '@storybook/react-vite';
import ROUTES from 'constants/routes';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';
import HomePage from 'pages/HomePage/HomePage';
import { homeMocks } from 'pages/HomePage/stories/HomePage.stories.mocks';

import {
	dismissNoAuthBanner,
	forgetNoAuthDismissal,
	showsBanner,
} from './__story_mockdata__/banners.play';

type HomeArgs = PageStoryArgs<typeof homeMocks>;

const pageStory = storyMocks(homeMocks, { route: ROUTES.HOME, layout: 'app' });

/**
 * Every banner the shell can show, one per story, on Home. The `Banner`
 * control switches between them on any page story.
 *
 * Route: every page inside the app shell; these stories use `/home`.
 */
const meta = {
	title: 'Foundations/Banners/Shell',
	tags: ['play'],
	component: HomePage,
	...pageStory,
	parameters: { ...pageStory.parameters },
	beforeEach: forgetNoAuthDismissal,
	play: showsBanner,
} satisfies Meta<HomeArgs>;

export default meta;

type Story = StoryObj<HomeArgs>;

/** A cloud trial with three days left. */
export const TrialExpiry: Story = {
	args: { banner: 'trial-expiry' },
};

/** The last payment failed; the workspace is suspended in seven days. */
export const PaymentFailed: Story = {
	args: { banner: 'payment-failed' },
};

/** Self-hosted license past its end date. */
export const LicenseExpired: Story = {
	args: { banner: 'license-expired' },
};

/** Self-hosted license terminated; enterprise features are off. */
export const LicenseTerminated: Story = {
	args: { banner: 'license-terminated' },
};

/** Self-hosted license cancelled. */
export const LicenseCancelled: Story = {
	args: { banner: 'license-cancelled' },
};

/** Self-hosted license defaulted on its bill. */
export const LicenseDefaulted: Story = {
	args: { banner: 'license-defaulted' },
};

/** Self-hosted evaluation license past its trial. */
export const EvaluationExpired: Story = {
	args: { banner: 'evaluation-expired' },
};

/** An expired license during a trial: both banners at once. */
export const LicenseExpiredWithTrial: Story = {
	args: { banner: 'license-expired-with-trial' },
};

/** An expired license with a failed payment: both banners at once. */
export const LicenseExpiredWithPaymentFailed: Story = {
	args: { banner: 'license-expired-with-payment-failed' },
};

/** Impersonation mode: authentication is off. */
export const NoAuth: Story = {
	args: { banner: 'no-auth' },
};

/** The impersonation banner closed; it stays closed across reloads. */
export const NoAuthDismissed: Story = {
	args: { banner: 'no-auth' },
	play: dismissNoAuthBanner,
};
