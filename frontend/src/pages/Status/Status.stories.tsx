import type { Meta, StoryObj } from '@storybook/react-vite';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import { withAppLayout } from '@/storybook/decorators/withAppLayout';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import Status from './index';
import { statusMocks } from './Status.stories.mocks';

type StatusArgs = PageStoryArgs<typeof statusMocks>;

const pageStory = storyMocks(statusMocks);

/**
 * Version and update state of the running instance.
 *
 * Route: `/status`.
 */
const meta = {
	title: 'Pages/System/Status',
	component: Status,
	decorators: [withAppLayout],
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<StatusArgs>;

export default meta;

type Story = StoryObj<StatusArgs>;

/** The build this deployment runs, against the newest one released. */
export const Default: Story = {};

/** A deployment a few releases behind, which is what the upgrade link is for. */
export const UpdateAvailable: Story = {
	args: { version: 'outdated' },
};

/** Neither version could be read, so the page says so rather than guessing. */
export const VersionUnavailable: Story = {
	args: { version: 'unavailable' },
};
