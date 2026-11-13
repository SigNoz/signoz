import type { Meta, StoryObj } from '@storybook/react-vite';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { routingPoliciesMocks } from '../RoutingPolicies.stories.mocks';
import {
	expectChannelAttachLocked,
	expectChannelDetachLocked,
	expectCreateLocked,
	expectCreateOpen,
	expectDeleteLocked,
	expectEditLocked,
	expectFormReadOnly,
	expectListDenied,
	expectNoChannelCreateLink,
} from '../__story_mockdata__/routingPolicies.play';

import AlertList from '../../../index';

type RoutingPoliciesArgs = PageStoryArgs<typeof routingPoliciesMocks>;

const pageStory = storyMocks(routingPoliciesMocks, { layout: 'app' });

/**
 * The routing policies tab with one permission missing at a time. Every story
 * here is an admin denied exactly what its name says. `list` decides whether the
 * table renders, `create` and `attach` the New routing policy button, the
 * per-policy verbs the row menu and the form, and the channel verbs which
 * channels the form's picker can add or remove.
 *
 * Route: `/alerts?tab=Configuration&subTab=routing-policies`.
 */
const meta = {
	title: 'Pages/Alerts/Routing Policies/Authz',
	tags: ['authz', 'play'],
	component: AlertList,
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<RoutingPoliciesArgs>;

export default meta;

type Story = StoryObj<RoutingPoliciesArgs>;

/** A permission callout takes the table's place, and search goes inert. */
export const NoList: Story = {
	args: { revoked: ['list:route-policy'] },
	play: expectListDenied,
};

/** The list is intact; New routing policy is locked. */
export const NoCreate: Story = {
	args: { revoked: ['create:route-policy'] },
	play: expectCreateLocked,
};

/**
 * New routing policy is locked too: a policy always links a channel, so creating
 * one needs `attach` as well.
 */
export const NoAttach: Story = {
	args: { revoked: ['attach:route-policy'] },
	play: expectCreateLocked,
};

/** A row's Edit is locked in its menu; Delete stays open. */
export const NoUpdate: Story = {
	args: { revoked: ['update:route-policy'] },
	play: expectEditLocked,
};

/** Edit needs `read` as well as `update`, so it is locked here too. */
export const NoRead: Story = {
	args: { revoked: ['read:route-policy'] },
	play: expectEditLocked,
};

/** A row's Delete is locked in its menu; Edit stays open. */
export const NoDelete: Story = {
	args: { revoked: ['delete:route-policy'] },
	play: expectDeleteLocked,
};

/**
 * Everything but listing and reading: a policy opens from its row with every
 * field locked and Save disabled.
 */
export const ReadOnly: Story = {
	args: {
		revoked: [
			'create:route-policy',
			'update:route-policy',
			'delete:route-policy',
			'attach:route-policy',
			'detach:route-policy',
		],
	},
	play: expectFormReadOnly,
};

/**
 * In a policy's form, channels it does not link yet are locked in the picker;
 * the one it links can still be removed.
 */
export const NoChannelAttach: Story = {
	args: { revoked: ['attach:notification-channel'] },
	play: expectChannelAttachLocked,
};

/**
 * In a policy's form, the channel it already links cannot be removed; others
 * can still be added.
 */
export const NoChannelDetach: Story = {
	args: { revoked: ['detach:notification-channel'] },
	play: expectChannelDetachLocked,
};

/**
 * A workspace with no channels yet: the picker asks for an admin instead of
 * linking to the channel form.
 */
export const NoChannelCreate: Story = {
	args: { channels: 0, revoked: ['create:notification-channel'] },
	play: expectNoChannelCreateLink,
};

/**
 * The permission check failing rather than denying: every action stays open, so
 * the API decides.
 */
export const CheckFailed: Story = {
	args: { authzState: 'error' },
	// The mocked check intentionally fails; the resulting console error is the
	// point of the story, not a regression.
	parameters: { allowConsoleErrors: true },
	play: expectCreateOpen,
};
