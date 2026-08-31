import type { Meta, StoryObj } from '@storybook/react-vite';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import { withAppLayout } from '@/storybook/decorators/withAppLayout';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import UsageExplorerContainer from './index';
import { usageMocks } from './Usage.stories.mocks';

type UsageArgs = PageStoryArgs<typeof usageMocks>;

const pageStory = storyMocks(usageMocks);

/**
 * Spans ingested per service over a period, the usage view that predates Cost
 * Meter.
 *
 * Route: `/usage-explorer`.
 */
const meta = {
	title: 'Pages/Metering/Usage Explorer',
	component: UsageExplorerContainer,
	decorators: [withAppLayout],
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<UsageArgs>;

export default meta;

type Story = StoryObj<UsageArgs>;

/** Spans ingested over the window, and the total they add up to. */
export const Default: Story = {};

/** A workspace that has not sent anything yet. */
export const NoSpans: Story = {
	args: { spansPerBucket: 0 },
};
