import type { Meta, StoryObj } from '@storybook/react-vite';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import { withAppLayout } from '@/storybook/decorators/withAppLayout';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { rolesMocks } from './Roles.stories.mocks';

import SettingsPage from '../Settings';

type RolesArgs = PageStoryArgs<typeof rolesMocks>;

const pageStory = storyMocks(rolesMocks);

/**
 * Built in and custom roles for the workspace. Gated on authz permissions.
 *
 * Route: `/settings/roles`.
 */
const meta = {
	title: 'Pages/Settings/Roles',
	tags: ['authz', 'beta'],
	component: SettingsPage,
	decorators: [withAppLayout],
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<RolesArgs>;

export default meta;

type Story = StoryObj<RolesArgs>;

/**
 * The roles a member or a service account can be given: the three the backend
 * ships with, and the ones the org has written on top of them.
 */
export const Default: Story = {};

/** An org still on the built-in roles alone. */
export const ManagedOnly: Story = {
	args: { customRoles: 0 },
};

/**
 * The same list without a valid license, where the built-in roles are all there
 * is: no custom role can be written, so the toolbar loses its button.
 */
export const Unlicensed: Story = {
	args: { license: 'community-enterprise', customRoles: 0 },
};

/** A viewer, who cannot list roles at all and is told so in place of the table. */
export const Viewer: Story = {
	args: { access: 'viewer' },
};
