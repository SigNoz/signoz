import type { Meta, StoryObj } from '@storybook/react-vite';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { createAlertMocks } from '../CreateAlert.stories.mocks';
import {
	expectChannelLocked,
	expectNoChannelCreateLink,
	expectWriteLocked,
	saveValidAlert,
} from '../__story_mockdata__/createAlert.play';

import CreateAlertPage from '../../index';

type CreateAlertArgs = PageStoryArgs<typeof createAlertMocks>;

const pageStory = storyMocks(createAlertMocks, { layout: 'app' });

/**
 * The new rule builder with one permission missing at a time. Every story here
 * is an admin denied exactly what its name says. `create` decides Save and Test
 * notification, `attach` on rules and on each channel which channels the
 * picker can add, and `create` on channels whether the empty picker offers to
 * make one. Reading the queried telemetry is checked by the server alone.
 *
 * Route: `/alerts/new`.
 */
const meta = {
	title: 'Pages/Alerts/Create/Authz',
	tags: ['authz', 'play'],
	component: CreateAlertPage,
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<CreateAlertArgs>;

export default meta;

type Story = StoryObj<CreateAlertArgs>;

/** A valid rule whose Save and Test notification are both locked. */
export const NoCreate: Story = {
	args: { revoked: ['create:rule'] },
	play: expectWriteLocked,
};

/** No channel can be picked: a new rule linking one needs `attach` on rules. */
export const NoRuleAttach: Story = {
	args: { revoked: ['attach:rule'] },
	play: expectChannelLocked,
};

/** No channel can be picked: each needs `attach` on itself as well. */
export const NoChannelAttach: Story = {
	args: { revoked: ['attach:notification-channel'] },
	play: expectChannelLocked,
};

/** With no channels yet, the picker asks for an admin rather than offering to create one. */
export const NoChannelCreate: Story = {
	args: { channels: 0, revoked: ['create:notification-channel'] },
	play: expectNoChannelCreateLink,
};

/**
 * Saving is refused by the server: the role cannot read the metrics the rule
 * queries, which the page cannot check up front, so the footer names it.
 */
export const TelemetryDenied: Story = {
	args: { ruleWrite: 'telemetry-denied' },
	// The mocked save intentionally fails; the resulting console error is the
	// point of the story, not a regression.
	parameters: { allowConsoleErrors: true },
	play: saveValidAlert,
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
	play: saveValidAlert,
};
