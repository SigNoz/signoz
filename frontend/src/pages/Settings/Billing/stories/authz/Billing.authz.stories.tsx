import type { Meta, StoryObj } from '@storybook/react-vite';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { billingMocks } from '../Billing.stories.mocks';

import SettingsPage from '../../../Settings';

type BillingArgs = PageStoryArgs<typeof billingMocks>;

const pageStory = storyMocks(billingMocks, { layout: 'app' });

/**
 * The billing tab with one permission missing at a time. Every story here is an
 * admin who is denied exactly what its name says, so what goes with a permission
 * is what the story shows.
 *
 * Route: `/settings/billing`.
 */
const meta = {
	title: 'Pages/Settings/Billing/Authz',
	tags: ['authz'],
	component: SettingsPage,
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<BillingArgs>;

export default meta;

type Story = StoryObj<BillingArgs>;

const READ = 'read:subscription';
const CREATE = 'create:subscription';
const LIST = 'list:subscription';
const UPDATE = 'update:subscription';
const DELETE = 'delete:subscription';

/** `RefreshPaymentStatus` asks to update the license it refreshes, not the subscription. */
const REFRESH = 'update:license';

const SUBSCRIPTION = [READ, CREATE, LIST, UPDATE, DELETE];

/**
 * Without it the usage graph, the CSV and the breakdown are replaced by the
 * permission callout, and the request behind them is never made. Paying is a
 * different permission, so the plan card above still works.
 */
export const NoRead: Story = {
	args: { revoked: [READ] },
};

/**
 * Managing the plan takes `list` and `update` together, so losing `list` alone
 * is enough to lock the Manage Billing button.
 */
export const NoList: Story = {
	args: { revoked: [LIST] },
};

/** The other half of the same pair, which locks the same button. */
export const NoUpdate: Story = {
	args: { revoked: [UPDATE] },
};

/** Neither half: the portal is out of reach however the workspace asks for it. */
export const NoManage: Story = {
	args: { revoked: [LIST, UPDATE] },
};

/**
 * A past-due workspace that cannot reach the portal: the callout still tells it
 * to update its card, and the link that would is dead.
 */
export const PastDueWithoutManage: Story = {
	args: { subscription: 'past_due', revoked: [LIST, UPDATE] },
};

/**
 * Checkout is a create, so a trial that cannot create one is left with both
 * upgrade buttons locked and no way off the trial.
 */
export const NoCreate: Story = {
	args: { plan: 'on-trial', revoked: [CREATE] },
};

/** The cancellation banner stays up, with the button that opens it locked. */
export const NoDelete: Story = {
	args: { revoked: [DELETE] },
};

/** The workspace can pay but cannot make the console go and look. */
export const NoLicenseRefresh: Story = {
	args: { revoked: [REFRESH] },
};

/** Everything but reading: the bill is in view and nothing on it can be acted on. */
export const ReadOnly: Story = {
	args: { revoked: [CREATE, LIST, UPDATE, DELETE] },
};

/** No subscription permission at all, which is the page with nothing on it to use. */
export const NoSubscriptionAccess: Story = {
	args: { revoked: SUBSCRIPTION },
};

/**
 * The permission check failing rather than denying, which the page treats as a
 * reason to ask for the usage anyway and leaves every action open.
 */
export const CheckFailed: Story = {
	args: { authzState: 'error' },
	// The mocked check intentionally fails; the resulting console error is the
	// point of the story, not a regression.
	parameters: { allowConsoleErrors: true },
};
