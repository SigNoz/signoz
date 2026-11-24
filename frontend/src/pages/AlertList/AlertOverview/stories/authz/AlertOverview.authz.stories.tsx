import type { Meta, StoryObj } from '@storybook/react-vite';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { alertOverviewMocks } from '../AlertOverview.stories.mocks';
import {
	expectCloneLocked,
	expectDeleteLocked,
	expectRuleDenied,
	expectSavedChannelLocked,
	expectUpdateLocked,
	saveRule,
} from '../__story_mockdata__/alertOverview.play';

import AlertList from '../../../index';

type AlertOverviewArgs = PageStoryArgs<typeof alertOverviewMocks>;

const pageStory = storyMocks(alertOverviewMocks, { layout: 'app' });

/**
 * One rule's page with one permission missing at a time. Every story here is an
 * admin denied exactly what its name says. `read` decides whether the page opens,
 * `update` the enable toggle, the name and Save, `create` Clone and Test
 * notification, `delete` Delete, and `detach` whether a channel the rule
 * notifies can be taken off it.
 *
 * Route: `/alerts/overview?ruleId=...`.
 */
const meta = {
	title: 'Pages/Alerts/Overview/Authz',
	tags: ['authz', 'play'],
	component: AlertList,
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<AlertOverviewArgs>;

export default meta;

type Story = StoryObj<AlertOverviewArgs>;

/** The full-page denial takes the page's place. */
export const NoRead: Story = {
	args: { revoked: ['read:rule'] },
	play: expectRuleDenied,
};

/** The rule reads, but cannot be turned off, renamed or saved. */
export const NoUpdate: Story = {
	args: { revoked: ['update:rule'] },
	play: expectUpdateLocked,
};

/** Clone and Test notification are locked: both are checked as creating a rule. */
export const NoCreate: Story = {
	args: { revoked: ['create:rule'] },
	play: expectCloneLocked,
};

/** Delete is locked in the header menu. */
export const NoDelete: Story = {
	args: { revoked: ['delete:rule'] },
	play: expectDeleteLocked,
};

/** The channel the rule notifies stays on it: its option is locked in the picker. */
export const NoChannelDetach: Story = {
	args: { revoked: ['detach:notification-channel'] },
	play: expectSavedChannelLocked,
};

/**
 * The permission check failing rather than denying: everything stays open, so
 * the API decides.
 */
export const CheckFailed: Story = {
	args: { authzState: 'error' },
	// The mocked check intentionally fails; the resulting console error is the
	// point of the story, not a regression.
	parameters: { allowConsoleErrors: true },
	play: saveRule,
};
