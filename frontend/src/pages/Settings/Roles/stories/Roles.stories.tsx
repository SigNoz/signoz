import type { Meta, StoryObj } from '@storybook/react-vite';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { rolesMocks } from './Roles.stories.mocks';

import SettingsPage from '../../Settings';

type RolesArgs = PageStoryArgs<typeof rolesMocks>;

const pageStory = storyMocks(rolesMocks, { layout: 'app' });

/**
 * Built in and custom roles for the workspace. Gated on authz permissions.
 *
 * Route: `/settings/roles`.
 */
const meta = {
	title: 'Pages/Settings/Roles',
	tags: ['authz', 'beta'],
	component: SettingsPage,
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

/** Loading: the roles table waits on the actual list request. */
export const Loading: Story = {
	args: { dataState: 'loading' },
};

/** Error: a failed roles list uses the table's inline error branch. */
export const LoadError: Story = {
	args: { dataState: 'error' },
	// The deliberate 500 is the state under test.
	parameters: { allowConsoleErrors: true },
};

/**
 * Density: every supported custom-role fixture renders beside the managed roles.
 * It follows `LoadError`, whose deliberate 500 on the same endpoint can land
 * while this story is running, so the opt-out covers the attribution as well.
 */
export const MaximumCustomRoles: Story = {
	args: { customRoles: 8 },
	parameters: { allowConsoleErrors: true },
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
