import type { Meta, StoryObj } from '@storybook/react-vite';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import { withAppLayout } from '@/storybook/decorators/withAppLayout';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { alertHistoryMocks } from './AlertHistory.stories.mocks';

import AlertList from '../index';

type AlertHistoryArgs = PageStoryArgs<typeof alertHistoryMocks>;

const pageStory = storyMocks(alertHistoryMocks);

/**
 * One rule's firing history: the timeline of state changes, the overall status for
 * the period, and the series contributing most to it.
 *
 * Route: `/alerts/history?ruleId=...`.
 */
const meta = {
	title: 'Pages/Alerts/History',
	component: AlertList,
	decorators: [withAppLayout],
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<AlertHistoryArgs>;

export default meta;

type Story = StoryObj<AlertHistoryArgs>;

/**
 * How one rule behaved over the selected window: how often it fired, how long
 * it took to resolve, what contributed most, and every state change in order.
 */
export const Default: Story = {};

/** A rule that never fired in the window: both cards say so and the table is empty. */
export const NeverTriggered: Story = {
	args: {
		triggers: 0,
		resolutionMinutes: 0,
		topContributors: 0,
		timelineEntries: 0,
		statusWindows: 0,
	},
};

/** A rule firing constantly, where the timeline pages rather than fits. */
export const Noisy: Story = {
	args: { triggers: 184, timelineEntries: 40, topContributors: 8 },
};
