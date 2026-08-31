import type { Meta, StoryObj } from '@storybook/react-vite';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import { withAppLayout } from '@/storybook/decorators/withAppLayout';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import Logs from './index';
import { oldLogsMocks } from './Logs.stories.mocks';

type OldLogsArgs = PageStoryArgs<typeof oldLogsMocks>;

const pageStory = storyMocks(oldLogsMocks);

/**
 * The pre v3 logs explorer, still routed for parity. Start from `Logs / Explorer`
 * instead.
 *
 * Route: `/logs/old-logs-explorer`.
 */
const meta = {
	title: 'Pages/Logs/Legacy Explorer',
	tags: ['legacy'],
	component: Logs,
	decorators: [withAppLayout],
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<OldLogsArgs>;

export default meta;

type Story = StoryObj<OldLogsArgs>;

/**
 * The pre-explorer logs view: the fields panel, the volume histogram and the
 * lines that matched.
 */
export const Default: Story = {};

/** A search that matched nothing, which is what the empty list is for. */
export const NoLogs: Story = {
	args: { logs: 0 },
};
