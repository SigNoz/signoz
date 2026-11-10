import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor, within } from 'storybook/test';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import {
	byTestId,
	expectDisabled,
	expectPending,
	findRows,
	hoverUnreadableRow,
	openRowMenu,
	openSaveChangesMenu,
	openUnreadableView,
	rowMenuItem,
	rowName,
	saveChangesItem,
	SavedViewsSidebar,
	savedViewsMocks,
	sidebarCanvas,
	UNTIL_LOADED,
} from '../SavedViews.stories.mocks';

import SavedViewsPanel from '../../SavedViewsPanel';

type SavedViewsArgs = PageStoryArgs<typeof savedViewsMocks>;

const componentStory = storyMocks(savedViewsMocks);

/**
 * The saved views sidebar with one permission missing at a time. Every story
 * here is an admin denied exactly what its name says. `list` and `create` are
 * workspace-wide; `read`, `update` and `delete` are checked per view, so a row
 * menu only checks its view once it is opened.
 *
 * Route: the explorer of the Source control, with the Open view control's
 * `viewKey`.
 */
const meta = {
	title: 'Components/Saved Views/Authz',
	tags: ['authz', 'play'],
	component: SavedViewsPanel,
	decorators: [sidebarCanvas],
	render: ({ source }): JSX.Element => <SavedViewsSidebar source={source} />,
	...componentStory,
	parameters: { ...componentStory.parameters },
} satisfies Meta<SavedViewsArgs>;

export default meta;

type Story = StoryObj<SavedViewsArgs>;

const LIST = 'list:saved-view';
const CREATE = 'create:saved-view';
const UPDATE = 'update:saved-view';
const DELETE = 'delete:saved-view';

/**
 * The panel shows the permission callout in place of the list, and All views,
 * in an explorer whose quick filters hide the list, is disabled.
 */
export const NoList: Story = {
	args: { revoked: [LIST] },
	render: ({ source }): JSX.Element => (
		<SavedViewsSidebar source={source} onOpenViews={(): void => {}} />
	),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expectDisabled(byTestId('saved-views-open'));
		await waitFor(
			() =>
				expect(canvas.getByTestId('saved-views-panel')).toHaveTextContent(
					/is not authorized to perform list/,
				),
			UNTIL_LOADED,
		);
		await expect(canvas.queryByTestId('saved-views-search')).toBeNull();
	},
};

/** An empty workspace with both ways to create a view disabled: + and Create view. */
export const NoCreate: Story = {
	args: { revoked: [CREATE], createdByMe: 0, createdByOthers: 0 },
	play: async () => {
		await expectDisabled(byTestId('saved-views-create'));
		await expectDisabled(byTestId('saved-views-list-create'));
	},
};

/** The ✓ menu on unsaved changes: Save as new view disabled, Update selected view open. */
export const NoCreateSaveMenu: Story = {
	args: { revoked: [CREATE], openView: 'unsaved-changes' },
	play: async ({ canvasElement }) => {
		await openSaveChangesMenu(canvasElement);
		await expectDisabled(saveChangesItem('save-as-new'));
		await expectDisabled(saveChangesItem('update'), false);
	},
};

/**
 * `read` denied on one view made by someone else: the list checks no `read`, so
 * its row opens it like any other, and the header then says No view access.
 */
export const NoRead: Story = {
	args: { unreadableView: true },
	play: openUnreadableView,
};

/** The hover card of the unreadable view: the permission callout in place of its query. */
export const NoReadHoverCard: Story = {
	args: { unreadableView: true },
	play: hoverUnreadableRow,
};

/** The unreadable view open from its link: the header names it No view access. */
export const NoReadOpenView: Story = {
	args: { unreadableView: true, openView: 'created-by-others' },
	play: async ({ canvasElement }) => {
		await expect(
			await within(canvasElement).findByText(
				'No view access',
				undefined,
				UNTIL_LOADED,
			),
		).toBeVisible();
	},
};

/** A row's menu: Edit details disabled; Copy link, Copy ID and Delete open. */
export const NoUpdate: Story = {
	args: { revoked: [UPDATE] },
	play: async ({ canvasElement }) => {
		const [row] = await findRows(canvasElement);

		await openRowMenu(row);
		await expectDisabled(rowMenuItem('editDetails'));
		await expectDisabled(rowMenuItem('copyLink'), false);
		await expectDisabled(rowMenuItem('copyId'), false);
		await expectDisabled(rowMenuItem('delete'), false);
	},
};

/** The ✓ menu on unsaved changes: Update selected view disabled, Save as new view open. */
export const NoUpdateSaveMenu: Story = {
	args: { revoked: [UPDATE], openView: 'unsaved-changes' },
	play: async ({ canvasElement }) => {
		await openSaveChangesMenu(canvasElement);
		await expectDisabled(saveChangesItem('update'));
		await expectDisabled(saveChangesItem('save-as-new'), false);
	},
};

/** A row's menu: Delete disabled, Edit details still open. */
export const NoDelete: Story = {
	args: { revoked: [DELETE] },
	play: async ({ canvasElement }) => {
		const [row] = await findRows(canvasElement);

		await openRowMenu(row);
		await expectDisabled(rowMenuItem('delete'));
		await expectDisabled(rowMenuItem('editDetails'), false);
	},
};

/**
 * Everything but listing and reading: + is disabled, and a row's menu has only
 * Copy link and Copy ID left.
 */
export const ReadOnly: Story = {
	args: { revoked: [CREATE, UPDATE, DELETE] },
	play: async ({ canvasElement }) => {
		await expectDisabled(byTestId('saved-views-create'));

		const [row] = await findRows(canvasElement);

		await expectDisabled(rowName(row), false);
		await openRowMenu(row);
		await expectDisabled(rowMenuItem('editDetails'));
		await expectDisabled(rowMenuItem('delete'));
		await expectDisabled(rowMenuItem('copyLink'), false);
		await expectDisabled(rowMenuItem('copyId'), false);
	},
};

/**
 * The permission check never answering: + spins, and the list stays blank
 * behind its `list` check.
 */
export const CheckLoading: Story = {
	args: { authzState: 'loading' },
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expectPending(byTestId('saved-views-create'));
		await expect(canvas.queryByTestId('saved-views-search')).toBeNull();
	},
};

/**
 * The permission check failing rather than denying: the sidebar fails open,
 * so the list renders and every action stays enabled for the API to refuse.
 */
export const CheckFailed: Story = {
	args: { authzState: 'error' },
	parameters: { allowConsoleErrors: true },
	play: async ({ canvasElement }) => {
		await expectDisabled(byTestId('saved-views-create'), false);

		const [row] = await findRows(canvasElement);

		await expectDisabled(rowName(row), false);
		await openRowMenu(row);
		await expectDisabled(rowMenuItem('editDetails'), false);
		await expectDisabled(rowMenuItem('delete'), false);
	},
};
