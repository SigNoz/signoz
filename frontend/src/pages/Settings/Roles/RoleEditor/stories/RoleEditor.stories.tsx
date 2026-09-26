import type { Meta, StoryObj } from '@storybook/react-vite';
import { screen, userEvent, within } from 'storybook/test';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { roleEditorMocks } from './RoleEditor.stories.mocks';

import SettingsPage from '../../../Settings';

type RoleEditorArgs = PageStoryArgs<typeof roleEditorMocks>;

const pageStory = storyMocks(roleEditorMocks, { layout: 'app' });

/**
 * Creating or editing a custom role, through the permission wizard or the JSON
 * editor. Gated on authz permissions.
 *
 * Route: `/settings/roles/new` and `/settings/roles/:roleId/edit`.
 */
const meta = {
	title: 'Pages/Settings/Role Editor',
	tags: ['authz', 'beta', 'play'],
	component: SettingsPage,
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

/**
 * The selector hint on the resource cards, held open: the tallest tooltip in
 * settings, two lines of prose around a docs link. It only exists on a verb
 * scoped to named objects that already has some, so this edits a role that
 * grants those and expands every card to reach them.
 */
export const Tooltips: Story = {
	args: { tooltipsOpen: true, mode: 'edit' },
	play: async ({ canvasElement }): Promise<void> => {
		await userEvent.click(
			await within(canvasElement).findByTestId('expand-all-button', undefined, {
				timeout: 15_000,
			}),
		);
	},
};

/** The copy action over the JSON editor, which the resource cards replace. */
export const TooltipsInJsonEditor: Story = {
	args: { tooltipsOpen: true, mode: 'edit', editor: 'json' },
};

/** Opens the Logs card and returns it. */
const openLogsCard = async (
	canvasElement: HTMLElement,
): Promise<HTMLElement> => {
	const header = await within(canvasElement).findByRole(
		'button',
		{ name: /^Logs:/ },
		{ timeout: 15_000 },
	);

	await userEvent.click(header);

	return header.parentElement as HTMLElement;
};

/** The Logs card's first verb granted over everything instead of nothing. */
export const PermissionEditorScope: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		const card = await openLogsCard(canvasElement);
		const [all] = await within(card).findAllByText('All');

		await userEvent.click(all);
	},
};

/** The selector wizard, opened from a Logs verb scoped to named objects. */
export const TelemetrySelectorWizard: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		const card = await openLogsCard(canvasElement);
		const [onlySelected] = await within(card).findAllByText('Only selected');

		await userEvent.click(onlySelected);
		await userEvent.click(
			await within(card).findByRole('button', { name: 'Wizard' }),
		);
		await screen.findByRole('dialog', { name: 'Selector Wizard' });
	},
};
