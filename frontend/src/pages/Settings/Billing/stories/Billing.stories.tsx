import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, screen, userEvent, waitFor } from 'storybook/test';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { billingMocks } from './Billing.stories.mocks';

import SettingsPage from '../../Settings';

type BillingArgs = PageStoryArgs<typeof billingMocks>;

const pageStory = storyMocks(billingMocks, { layout: 'app' });

/**
 * The plan and what the workspace used in the billing period, with the checkout
 * and portal links. Every action on it is gated on a `subscription` permission,
 * one story per permission under `Billing/Authz`.
 *
 * Route: `/settings/billing`.
 */
const meta = {
	title: 'Pages/Settings/Billing/Overview',
	tags: ['authz', 'play'],
	component: SettingsPage,
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<BillingArgs>;

export default meta;

type Story = StoryObj<BillingArgs>;

/** The page fetches the period before it renders a bar, which outlasts the 1s default. */
const untilLoaded = { timeout: 15_000 };

/** The last day the period covers, which is where it reports nothing remaining. */
const PERIOD_LENGTH = 31;

/**
 * What the workspace has sent this billing period, day by day and signal by
 * signal, and what it adds up to.
 */
export const Default: Story = {};

/** The first day of a period, before there is a shape to the graph. */
export const PeriodJustStarted: Story = {
	args: { billedDays: 1 },
};

/** The last day of the period, with nothing left to run and the month's full bill. */
export const PeriodEnding: Story = {
	args: { billedDays: PERIOD_LENGTH },
};

/** Empty: a period nothing has been sent in yet, which bills nothing. */
export const NoUsage: Story = {
	args: { billedDays: 0 },
};

/**
 * A workspace far enough into the month to have crossed a price step, where each
 * signal is billed in tiers and the cheaper ones sit under it unnamed.
 */
export const VolumeTiers: Story = {
	args: { pricing: 'volume-tiers' },
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
 * A trial with a card already on file: the console says the billing starts when
 * the trial ends, and the plan is managed rather than upgraded.
 */
export const TrialCardAdded: Story = {
	args: { plan: 'trial-card-added' },
};

/**
 * A trial that has run out without a card on file, where the console says how
 * long the data is kept before it goes.
 */
export const GracePeriod: Story = {
	args: { plan: 'grace-period' },
};

/**
 * The same expired trial on cloud, where the workspace is shut: billing is the
 * only tab left open and the side nav is down to what an unpaid workspace keeps.
 */
export const WorkspaceBlocked: Story = {
	args: { plan: 'workspace-blocked' },
};

/**
 * A self-hosted instance, billed as Teams rather than Teams Cloud, where the
 * subscription is not the console's to cancel.
 */
export const SelfHosted: Story = {
	args: { license: 'enterprise' },
};

/** The period being fetched: the plan, the graph and the table all stand in. */
export const Loading: Story = {
	args: { dataState: 'loading' },
};

/** Error: the usage request failed, leaving the plan card with nothing to report. */
export const Error: Story = {
	args: { dataState: 'error' },
};

/**
 * The usage graph's legend, where each signal the workspace is billed for
 * carries its own name as a tooltip.
 */
export const Tooltips: Story = {
	args: { tooltipsOpen: true },
};

/**
 * Interaction: cancelling is deliberate. The dialog only arms its own button
 * once the word is typed out, and the cancellation itself goes to support.
 */
export const CancelSubscription: Story = {
	play: async (): Promise<void> => {
		await screen.findByTestId('cancel-subscription-btn', undefined, untilLoaded);

		// The button is cloned disabled while its own permission check is in
		// flight, and the click that lands there is dropped rather than queued.
		await waitFor(() =>
			expect(screen.getByTestId('cancel-subscription-btn')).toBeEnabled(),
		);

		await userEvent.click(screen.getByTestId('cancel-subscription-btn'));

		// The dialog's `data-testid` never reaches the input: the design system's
		// `Input` forwards a fixed prop list, and `data-*` is not on it.
		await userEvent.type(
			await screen.findByPlaceholderText(
				/enter the word cancel/i,
				undefined,
				untilLoaded,
			),
			'cancel',
		);

		await waitFor(() =>
			expect(screen.getByTestId('cancel-subscription-confirm-btn')).toBeEnabled(),
		);
	},
};
