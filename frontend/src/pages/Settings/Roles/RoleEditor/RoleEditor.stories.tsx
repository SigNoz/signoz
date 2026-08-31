import type { Meta, StoryObj } from '@storybook/react-vite';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import { withAppLayout } from '@/storybook/decorators/withAppLayout';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { roleEditorMocks } from './RoleEditor.stories.mocks';

import SettingsPage from '../../Settings';

type RoleEditorArgs = PageStoryArgs<typeof roleEditorMocks>;

const pageStory = storyMocks(roleEditorMocks);

/**
 * Creating or editing a custom role, through the permission wizard or the JSON
 * editor. Gated on authz permissions.
 *
 * Route: `/settings/roles/new` and `/settings/roles/:roleId/edit`.
 */
const meta = {
	title: 'Pages/Settings/Role Editor',
	tags: ['authz', 'beta'],
	component: SettingsPage,
	decorators: [withAppLayout],
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<RoleEditorArgs>;

export default meta;

type Story = StoryObj<RoleEditorArgs>;

/**
 * Writing a role from scratch: a name, and a card per resource where each verb
 * is granted over everything, over named objects, or not at all.
 */
export const Default: Story = {};

/** The same editor over a role that already grants a good deal. */
export const EditExisting: Story = {
	args: { mode: 'edit' },
};

/** The JSON the API stores, which is the other way the same grant is written. */
export const JsonEditor: Story = {
	args: { mode: 'edit', editor: 'json' },
};

/**
 * An unlicensed instance, where custom roles do not exist: the editor refuses
 * rather than letting a role be written that cannot be saved.
 */
export const Unlicensed: Story = {
	args: { license: 'community-enterprise' },
};
