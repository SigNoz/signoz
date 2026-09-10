import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';
import { RoleType } from 'types/roles';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import {
	deleteRoleFailed,
	roleDetailsMocks,
} from './RoleDetails.stories.mocks';

import SettingsPage from '../../../Settings';

type RoleDetailsArgs = PageStoryArgs<typeof roleDetailsMocks>;

const pageStory = storyMocks(roleDetailsMocks, { layout: 'app' });

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

/** Loading: the role details request is pending while the stable page header remains. */
export const Loading: Story = {
	args: { dataState: 'loading' },
};

/** Error: the real role-details error banner appears after a failed fetch. */
export const LoadError: Story = {
	args: { dataState: 'error' },
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

/** Interaction: deleting a custom role opens the irreversible-action confirmation. */
export const DeleteRoleConfirm: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		// The header renders a disabled Delete while the role loads and swaps it for
		// the real one once its permission check answers, so the button is looked up
		// again on every attempt; a click on the disabled one is dropped in silence.
		const deleteRole = await waitFor(() => {
			const button = within(canvasElement).getByTestId('delete-button');

			expect(button).toBeEnabled();

			return button;
		}, untilLoaded);

		await userEvent.click(deleteRole);
		await screen.findByRole('dialog', { name: 'Delete Role' });
	},
};

/** Failure: the delete dialog retains the action and exposes the server error. */
export const DeleteRoleFailed: Story = {
	parameters: {
		msw: { handlers: deleteRoleFailed },
	},
	play: async ({ canvasElement }): Promise<void> => {
		// The header renders a disabled Delete while the role loads and swaps it for
		// the real one once its permission check answers, so the button is looked up
		// again on every attempt; a click on the disabled one is dropped in silence.
		const deleteRole = await waitFor(() => {
			const button = within(canvasElement).getByTestId('delete-button');

			expect(button).toBeEnabled();

			return button;
		}, untilLoaded);

		await userEvent.click(deleteRole);
		const dialog = await screen.findByRole('dialog', { name: 'Delete Role' });

		await userEvent.click(
			within(dialog).getByRole('button', { name: 'Delete Role' }),
		);
		await screen.findByText(/failed to delete role/i, undefined, untilLoaded);
	},
};

/**
 * Every tooltip the role overview carries, held open at once: the two refusals
 * on a managed role's header actions, and the copy action over the JSON the API
 * stores. The role has to be managed for the header ones to exist at all, so
 * the Role type control does not reach this story.
 */
export const Tooltips: Story = {
	args: { tooltipsOpen: true, roleType: RoleType.MANAGED },
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
