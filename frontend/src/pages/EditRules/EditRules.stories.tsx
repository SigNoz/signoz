import type { Meta, StoryObj } from '@storybook/react-vite';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import { withAppLayout } from '@/storybook/decorators/withAppLayout';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { editRulesMocks } from './EditRules.stories.mocks';

import EditRules from './index';

type EditRulesArgs = PageStoryArgs<typeof editRulesMocks>;

const pageStory = storyMocks(editRulesMocks);

/**
 * An existing rule in the builder that created it, loaded from
 * `/api/v2/rules/:id`.
 *
 * Route: `/alerts/edit?ruleId=...`.
 */
const meta = {
	title: 'Pages/Alerts/Edit',
	component: EditRules,
	decorators: [withAppLayout],
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<EditRulesArgs>;

export default meta;

type Story = StoryObj<EditRulesArgs>;

/**
 * The alert form on its own route, without the alert-details tabs around it.
 * Metrics Explorer and the assistant link here when they send someone to a rule.
 * The rule is on the classic schema, which is the only one this route renders:
 * see the Alert schema control for what a current-schema rule does here.
 */
export const Default: Story = {};

/** The rule id in the URL does not resolve, so the page offers the way back. */
export const RuleNotFound: Story = {
	args: { dataState: 'error' },
};
