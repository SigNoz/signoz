import type { Meta, StoryObj } from '@storybook/react-vite';
import { userEvent, within } from 'storybook/test';
import { RoleType } from 'types/roles';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import { withAppLayout } from '@/storybook/decorators/withAppLayout';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { roleDetailsMocks } from './RoleDetails.stories.mocks';

import SettingsPage from '../../Settings';

type RoleDetailsArgs = PageStoryArgs<typeof roleDetailsMocks>;

const pageStory = storyMocks(roleDetailsMocks);

/**
 * One role read only: what it grants, by resource, built in or custom. Gated on
 * authz permissions.
 *
 * Route: `/settings/roles/:roleId`.
 */
const meta = {
	title: 'Pages/Settings/Role Details',
	tags: ['authz', 'beta', 'play'],
	component: SettingsPage,
	decorators: [withAppLayout],
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<RoleDetailsArgs>;

export default meta;

type Story = StoryObj<RoleDetailsArgs>;

/** The role fetches before the overview renders, which outlasts the 1s default. */
const untilLoaded = { timeout: 15_000 };

/**
 * One custom role read-only: every resource it touches, the verbs granted on
 * each, and whether the grant covers the whole resource or named objects.
 */
export const Default: Story = {};

/**
 * A role that has been created but not given anything yet, which is what the
 * overview looks like between saving a name and writing the permissions.
 */
export const NothingGranted: Story = {
	args: { grants: 'none' },
};

/**
 * A role the backend owns. It reads the same, but it cannot be edited or
 * deleted, so the header keeps only the way back.
 */
export const ManagedRole: Story = {
	args: { roleType: RoleType.MANAGED },
};

/** The same grant as the API stores it, which is what the editor writes. */
export const JsonView: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await userEvent.click(
			await within(canvasElement).findByTestId(
				'permission-view-mode-json',
				undefined,
				untilLoaded,
			),
		);
	},
};
