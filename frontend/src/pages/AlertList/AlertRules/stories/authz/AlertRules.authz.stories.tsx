import type { Meta, StoryObj } from '@storybook/react-vite';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { alertRulesMocks } from '../AlertRules.stories.mocks';
import {
	expectCreateLocked,
	expectDeleteLocked,
	expectEmptyStateCreateLocked,
	expectListDenied,
	expectNewAlertOpen,
	expectReadLocked,
	expectUpdateLocked,
} from '../__story_mockdata__/alertRules.play';

import AlertList from '../../../index';

type AlertRulesArgs = PageStoryArgs<typeof alertRulesMocks>;

const pageStory = storyMocks(alertRulesMocks, { layout: 'app' });

/**
 * The alert rules list with one permission missing at a time. Every story here
 * is an admin denied exactly what its name says. `list` decides whether the
 * table renders, `create` New Alert and Clone, and the per-rule verbs the rest
 * of a row's menu.
 *
 * Route: `/alerts?tab=AlertRules`.
 */
const meta = {
	title: 'Pages/Alerts/Rules/Authz',
	tags: ['authz', 'play'],
	component: AlertList,
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<AlertRulesArgs>;

export default meta;

type Story = StoryObj<AlertRulesArgs>;

/** A permission callout takes the table's place. */
export const NoList: Story = {
	args: { revoked: ['list:rule'] },
	play: expectListDenied,
};

/** New Alert is locked, and so is Clone in every row's menu. */
export const NoCreate: Story = {
	args: { revoked: ['create:rule'] },
	play: expectCreateLocked,
};

/** An empty workspace: its New Alert Rule button is locked too. */
export const NoCreateEmpty: Story = {
	args: { rules: 0, revoked: ['create:rule'] },
	play: expectEmptyStateCreateLocked,
};

/** Enable or disable and both edits are locked; clone and delete stay open. */
export const NoUpdate: Story = {
	args: { revoked: ['update:rule'] },
	play: expectUpdateLocked,
};

/** Edit and Clone both read the rule, so both are locked. */
export const NoRead: Story = {
	args: { revoked: ['read:rule'] },
	play: expectReadLocked,
};

/** Delete is locked in a row's menu; the rest stays open. */
export const NoDelete: Story = {
	args: { revoked: ['delete:rule'] },
	play: expectDeleteLocked,
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
	play: expectNewAlertOpen,
};
