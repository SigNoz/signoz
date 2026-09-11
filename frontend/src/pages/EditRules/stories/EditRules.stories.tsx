import type { Meta, StoryObj } from '@storybook/react-vite';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { editRulesMocks } from './EditRules.stories.mocks';

import EditRules from '../index';

type EditRulesArgs = PageStoryArgs<typeof editRulesMocks>;

const pageStory = storyMocks(editRulesMocks, { layout: 'app' });

/**
 * An existing rule in the builder that created it, loaded from
 * `/api/v2/rules/:id`.
 *
 * Route: `/alerts/edit?ruleId=...`.
 */
const meta = {
	title: 'Pages/Alerts/Edit',
	component: EditRules,
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
	// The mocked rule request intentionally fails; the resulting console error is
	// the point of the story, not a regression.
	parameters: { allowConsoleErrors: true },
};

/**
 * The preview chart's legend, one tooltip per series carrying the full label a
 * truncated legend entry falls back to. The Preview series control is turned up
 * to its maximum so the legend wraps to a second row, which is where a label
 * gets clipped.
 */
export const Tooltips: Story = {
	args: { tooltipsOpen: true, previewSeries: 6 },
};
