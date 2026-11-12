import type { Meta, StoryObj } from '@storybook/react-vite';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { plannedDowntimeMocks } from '../PlannedDowntime.stories.mocks';
import {
	expectCreateLocked,
	expectCreateOpen,
	expectDeleteLocked,
	expectEditLocked,
	expectFormReadOnly,
	expectListDenied,
	expectRuleAttachLocked,
	expectRuleDetachLocked,
	expectRuleListDenied,
} from '../__story_mockdata__/plannedDowntime.play';

import AlertList from '../../../index';

type PlannedDowntimeArgs = PageStoryArgs<typeof plannedDowntimeMocks>;

const pageStory = storyMocks(plannedDowntimeMocks, { layout: 'app' });

/**
 * The planned downtime tab with one permission missing at a time. Every story
 * here is an admin denied exactly what its name says. `list` decides whether the
 * table renders, `create` and `attach` the New downtime button, the per-schedule
 * verbs the row menu and the form, and the rule verbs which rules the form can
 * add, remove or even list.
 *
 * Route: `/alerts?tab=Configuration&subTab=planned-downtime`.
 */
const meta = {
	title: 'Pages/Alerts/Planned Downtime/Authz',
	tags: ['authz', 'play'],
	component: AlertList,
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<PlannedDowntimeArgs>;

export default meta;

type Story = StoryObj<PlannedDowntimeArgs>;

/** A permission callout takes the table's place, and search goes inert. */
export const NoList: Story = {
	args: { revoked: ['list:planned-maintenance'] },
	play: expectListDenied,
};

/** The list is intact; New downtime is locked. */
export const NoCreate: Story = {
	args: { revoked: ['create:planned-maintenance'] },
	play: expectCreateLocked,
};

/**
 * New downtime is locked too: a schedule always silences rules, every rule when
 * none are picked, so creating one needs `attach` as well.
 */
export const NoAttach: Story = {
	args: { revoked: ['attach:planned-maintenance'] },
	play: expectCreateLocked,
};

/** A row's Edit is locked in its menu; Delete stays open. */
export const NoUpdate: Story = {
	args: { revoked: ['update:planned-maintenance'] },
	play: expectEditLocked,
};

/** Edit needs `read` as well as `update`, so it is locked here too. */
export const NoRead: Story = {
	args: { revoked: ['read:planned-maintenance'] },
	play: expectEditLocked,
};

/** A row's Delete is locked in its menu; Edit stays open. */
export const NoDelete: Story = {
	args: { revoked: ['delete:planned-maintenance'] },
	play: expectDeleteLocked,
};

/**
 * Everything but listing and reading: a schedule opens from its row with every
 * field locked and Save disabled.
 */
export const ReadOnly: Story = {
	args: {
		revoked: [
			'create:planned-maintenance',
			'update:planned-maintenance',
			'delete:planned-maintenance',
			'attach:planned-maintenance',
			'detach:planned-maintenance',
		],
	},
	play: expectFormReadOnly,
};

/** In a schedule's form, rules it does not silence yet are locked in the picker. */
export const NoRuleAttach: Story = {
	args: { revoked: ['attach:rule'] },
	play: expectRuleAttachLocked,
};

/** In a schedule's form, the rules it already silences cannot be removed. */
export const NoRuleDetach: Story = {
	args: { revoked: ['detach:rule'] },
	play: expectRuleDetachLocked,
};

/**
 * The rule list is refused, so the picker says why it is empty rather than
 * offering nothing.
 */
export const NoRuleList: Story = {
	args: { revoked: ['list:rule'], silencedRules: 0 },
	play: expectRuleListDenied,
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
