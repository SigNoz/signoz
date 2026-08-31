import type { Meta, StoryObj } from '@storybook/react-vite';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import { withAppLayout } from '@/storybook/decorators/withAppLayout';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import Trace from './index';
import { traceMocks } from './Trace.stories.mocks';

type TraceArgs = PageStoryArgs<typeof traceMocks>;

const pageStory = storyMocks(traceMocks);

/**
 * The pre explorer traces page with its span filters. Kept for parity; start from
 * `Traces / Explorer`.
 *
 * Route: `/trace`.
 */
const meta = {
	title: 'Pages/Traces/Legacy Explorer',
	tags: ['legacy'],
	component: Trace,
	decorators: [withAppLayout],
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<TraceArgs>;

export default meta;

type Story = StoryObj<TraceArgs>;

/**
 * The pre-explorer traces view: the filter panels on the left, the span count
 * over time, and the spans that matched.
 */
export const Default: Story = {};

/** Filters that match nothing, which is the state the empty table is for. */
export const NoSpans: Story = {
	args: { spans: 0 },
};
