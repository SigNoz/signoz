import type { Meta, StoryObj } from '@storybook/react-vite';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';

import SavedViewsPanel from '../SavedViewsPanel';
import {
	copyFirstViewLink,
	deleteFirstView,
	hoverFirstRowQuery,
	openFirstRowMenu,
	showSaveChangesMenu,
} from './__story_mockdata__/savedViews.play';
import {
	hoverFirstRowLoading,
	openCreateModal,
	openDeleteDialog,
	openEditDetailsModal,
	openSaveAsNewModal,
	type SavedViewsArgs,
	SavedViewsSidebar,
	savedViewsMocks,
	searchWithNoResults,
	sidebarCanvas,
} from './SavedViews.stories.mocks';

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
	play: openFirstRowMenu,
};

/**
 * The ✓ menu on a view with unsaved changes. Save as new view follows `create`
 * and Update selected view follows `update` on the open view.
 */
export const SaveChangesMenu: Story = {
	args: { openView: 'unsaved-changes' },
	play: showSaveChangesMenu,
};

/**
 * Views whose names run past the sidebar, with one of them open: each row and
 * the open view name truncate.
 */
export const LongNames: Story = {
	args: { longNames: true, openView: 'created-by-me' },
};

/** The hover card of the first row: its query, who updated it and when. */
export const HoverCard: Story = {
	play: hoverFirstRowQuery,
};

/** The hover card of a view saved without a filter: No filters in place of the query. */
export const HoverCardNoFilters: Story = {
	args: { viewQueries: 'no-filters' },
	play: hoverFirstRowQuery,
};

/** The hover card of a view with two queries, each filter under its query name. */
export const HoverCardMultiQuery: Story = {
	args: { viewQueries: 'multi-query' },
	play: hoverFirstRowQuery,
};

/** The hover card while its view is still loading: a skeleton in place of the query. */
export const HoverCardLoading: Story = {
	args: { viewPending: true },
	play: hoverFirstRowLoading,
};

/** A search that matches no view: the list says so in place of the rows. */
export const SearchNoResults: Story = {
	play: searchWithNoResults,
};

/** The + in the header opens Save view for the current query. */
export const CreateModal: Story = {
	play: openCreateModal,
};

/** Edit details from a row's menu: the modal starts on the view's name. */
export const EditDetailsModal: Story = {
	play: openEditDetailsModal,
};

/** Save as new view from the ✓ menu on unsaved changes. */
export const SaveAsNewModal: Story = {
	args: { openView: 'unsaved-changes' },
	play: openSaveAsNewModal,
};

/** Delete from a row's menu asks to confirm before the view goes. */
export const DeleteDialog: Story = {
	play: openDeleteDialog,
};

/** Copy link from a row's menu raises the Link copied toast. */
export const LinkCopiedToast: Story = {
	play: copyFirstViewLink,
};

/** A confirmed delete the server refuses: the failure toast, the dialog still open. */
export const DeleteFailedToast: Story = {
	args: { writes: 'error' },
	parameters: { allowConsoleErrors: true },
	play: deleteFirstView,
};

/** The list while it loads: skeleton rows under the search. */
export const Loading: Story = {
	args: { dataState: 'loading' },
};

/** A list that failed to load: Could not load views, with Retry. */
export const Error: Story = {
	args: { dataState: 'error' },
	parameters: { allowConsoleErrors: true },
};
