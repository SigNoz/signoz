import type { Meta, StoryObj } from '@storybook/react-vite';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import { withAppLayout } from '@/storybook/decorators/withAppLayout';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import WorkspaceLocked from './index';
import { workspaceLockedMocks } from './WorkspaceLocked.stories.mocks';

type WorkspaceLockedArgs = PageStoryArgs<typeof workspaceLockedMocks>;

const pageStory = storyMocks(workspaceLockedMocks);

/**
 * A workspace locked for non payment: what an admin sees, with checkout, and what
 * everyone else sees.
 *
 * Route: `/workspace-locked`.
 */
const meta = {
	title: 'Pages/System/Workspace Locked',
	component: WorkspaceLocked,
	decorators: [withAppLayout],
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<WorkspaceLockedArgs>;

export default meta;

type Story = StoryObj<WorkspaceLockedArgs>;

/**
 * The trial ran out: the whole app is behind this, with the card form, the
 * customer stories and the FAQ that come with it.
 */
export const Default: Story = {};

/** The same wall for someone who cannot pay: no card form, only the ask. */
export const NonAdmin: Story = {
	args: { access: 'editor' },
};
