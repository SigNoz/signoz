import type { Meta, StoryObj } from '@storybook/react-vite';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import { withAppLayout } from '@/storybook/decorators/withAppLayout';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { billingMocks } from './Billing.stories.mocks';

import SettingsPage from '../Settings';

type BillingArgs = PageStoryArgs<typeof billingMocks>;

const pageStory = storyMocks(billingMocks);

/**
 * The plan and what the workspace used in the billing period, with the checkout
 * and portal links.
 *
 * Route: `/settings/billing`.
 */
const meta = {
	title: 'Pages/Settings/Billing',
	component: SettingsPage,
	decorators: [withAppLayout],
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<BillingArgs>;

export default meta;

type Story = StoryObj<BillingArgs>;

/**
 * What the workspace has sent this billing period, day by day and signal by
 * signal, and what it adds up to.
 */
export const Default: Story = {};

/** The first day of a period, before there is a shape to the graph. */
export const PeriodJustStarted: Story = {
	args: { billedDays: 1 },
};

/**
 * A workspace whose last payment did not go through, which is announced above
 * the graph and again over the plan.
 */
export const PaymentPastDue: Story = {
	args: { subscription: 'past_due' },
};

/** A workspace still inside its trial, which is billed nothing until it ends. */
export const OnTrial: Story = {
	args: { plan: 'on-trial' },
};

/**
 * A trial that has run out without a card on file, where the console says how
 * long the data is kept before it goes.
 */
export const GracePeriod: Story = {
	args: { plan: 'grace-period' },
};
