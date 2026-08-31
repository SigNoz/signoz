import type { Meta, StoryObj } from '@storybook/react-vite';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import { withAppLayout } from '@/storybook/decorators/withAppLayout';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import WorkspaceSuspended from './WorkspaceSuspended';
import { workspaceSuspendedMocks } from './WorkspaceSuspended.stories.mocks';

type WorkspaceSuspendedArgs = PageStoryArgs<typeof workspaceSuspendedMocks>;

const pageStory = storyMocks(workspaceSuspendedMocks);

/**
 * A suspended workspace, with the billing portal link an admin gets.
 *
 * Route: `/workspace-suspended`.
 */
const meta = {
	title: 'Pages/System/Workspace Suspended',
	component: WorkspaceSuspended,
	decorators: [withAppLayout],
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<WorkspaceSuspendedArgs>;

export default meta;

type Story = StoryObj<WorkspaceSuspendedArgs>;

/** A payment that did not go through: the card has to be fixed to get back in. */
export const Default: Story = {};

/** The same wall for someone who cannot pay, who is told to ask an admin. */
export const NonAdmin: Story = {
	args: { access: 'editor' },
};
