import type { Meta, StoryObj } from '@storybook/react-vite';
import { LicenseState } from 'types/api/licensesV3/getActive';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import { withAppLayout } from '@/storybook/decorators/withAppLayout';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import WorkspaceAccessRestricted from './WorkspaceAccessRestricted';
import { workspaceAccessRestrictedMocks } from './WorkspaceAccessRestricted.stories.mocks';

type WorkspaceAccessRestrictedArgs = PageStoryArgs<
	typeof workspaceAccessRestrictedMocks
>;

const pageStory = storyMocks(workspaceAccessRestrictedMocks);

/**
 * A cloud workspace the user cannot enter yet, in the state the control picks.
 *
 * Route: `/workspace-access-restricted`.
 */
const meta = {
	title: 'Pages/System/Workspace Access Restricted',
	component: WorkspaceAccessRestricted,
	decorators: [withAppLayout],
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<WorkspaceAccessRestrictedArgs>;

export default meta;

type Story = StoryObj<WorkspaceAccessRestrictedArgs>;

/** A licence that was terminated, which needs a new deployment to undo. */
export const Default: Story = {};

/** A licence that simply ran out, which support can renew. */
export const Expired: Story = {
	args: { state: LicenseState.EXPIRED },
};
