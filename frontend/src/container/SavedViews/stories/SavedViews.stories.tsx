import type { Meta, StoryObj } from '@storybook/react-vite';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import SavedViewsPanel from '../SavedViewsPanel';
import {
	findRows,
	openRowMenu,
	openSaveChangesMenu,
	SavedViewsSidebar,
	savedViewsMocks,
	sidebarCanvas,
} from './SavedViews.stories.mocks';

type SavedViewsArgs = PageStoryArgs<typeof savedViewsMocks>;

const componentStory = storyMocks(savedViewsMocks);

/**
 * The saved views sidebar of an explorer without quick filters: the header with
 * the open view and its actions, above the list of views created by the user
 * and by others. Every action is gated on the `saved-view` authz permissions
 * (list, create, and read, update and delete per view).
 *
 * Route: the explorer of the Source control, with the Open view control's
 * `viewKey`.
 */
const meta = {
	title: 'Components/Saved Views/Overview',
	tags: ['authz', 'play'],
	component: SavedViewsPanel,
	decorators: [sidebarCanvas],
	render: ({ source }): JSX.Element => <SavedViewsSidebar source={source} />,
	...componentStory,
	parameters: { ...componentStory.parameters },
} satisfies Meta<SavedViewsArgs>;

export default meta;

type Story = StoryObj<SavedViewsArgs>;

/** Traces views created by the user and by others, with no view open. */
export const Default: Story = {};

/** A workspace with no views yet: the empty state offers Create view. */
export const Empty: Story = {
	args: { createdByMe: 0, createdByOthers: 0 },
};

/**
 * A view open with a query that differs from what it saved: the name carries
 * the unsaved dot, and ✓ and discard replace Clear view.
 */
export const UnsavedChanges: Story = {
	args: { openView: 'unsaved-changes' },
};

/**
 * The first row's menu. Edit details and Delete follow `update` and `delete` on
 * that view, so revoking either disables its item.
 */
export const RowMenu: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		const [row] = await findRows(canvasElement);

		await openRowMenu(row);
	},
};

/**
 * The ✓ menu on a view with unsaved changes. Save as new view follows `create`
 * and Update selected view follows `update` on the open view.
 */
export const SaveChangesMenu: Story = {
	args: { openView: 'unsaved-changes' },
	play: async ({ canvasElement }): Promise<void> => {
		await openSaveChangesMenu(canvasElement);
	},
};
