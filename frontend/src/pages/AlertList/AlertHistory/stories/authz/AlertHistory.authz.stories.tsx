import type { Meta, StoryObj } from '@storybook/react-vite';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { alertHistoryMocks } from '../AlertHistory.stories.mocks';
import { expectRuleDenied } from '../__story_mockdata__/alertHistory.play';

import AlertList from '../../../index';

type AlertHistoryArgs = PageStoryArgs<typeof alertHistoryMocks>;

const pageStory = storyMocks(alertHistoryMocks, { layout: 'app' });

/**
 * One rule's history with access taken away. `read` on the rule decides whether
 * the page opens.
 *
 * Route: `/alerts/history?ruleId=...`.
 */
const meta = {
	title: 'Pages/Alerts/History/Authz',
	tags: ['authz', 'play'],
	component: AlertList,
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<AlertHistoryArgs>;

export default meta;

type Story = StoryObj<AlertHistoryArgs>;

/** The full-page denial takes the page's place. */
export const NoRead: Story = {
	args: { revoked: ['read:rule'] },
	play: expectRuleDenied,
};
