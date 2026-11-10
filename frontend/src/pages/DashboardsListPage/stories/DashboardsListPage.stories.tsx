import type { Meta, StoryObj } from '@storybook/react-vite';
import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import {
	dashboardsListMocks,
	longQueryRoute,
	overflowingRows,
} from './DashboardsListPage.stories.mocks';
import {
	copyLegacyDashboardId,
	createDashboardFails,
	deleteDashboard,
	deleteViewFails,
	duplicateDashboard,
	importCreateFails,
	importInvalidImage,
	importInvalidJson,
	lockDashboard,
	migrateDashboard,
	migrationFails,
	openCreatedByFilter,
	openEditTagsDialog,
	openFirstRowActions,
	openRenameDialog,
	openSaveViewPopover,
	openTemplateTab,
	pinFails,
	pinPastLimit,
	renameDashboard,
	renameViewFails,
	saveViewFails,
	submitTemplateRequest,
	templateRequestFails,
	templateRequestRejected,
	unlockDashboard,
	unpinFails,
	updateTags,
} from './__story_mockdata__/dashboardsList.play';

import DashboardsListPage from '../DashboardsListPage';

type DashboardsListArgs = PageStoryArgs<typeof dashboardsListMocks>;

const pageStory = storyMocks(dashboardsListMocks, { layout: 'app' });

/**
 * Every dashboard in the workspace, with pins, the saved views over the list, and
 * the create, clone and lock actions. Creating follows the legacy editor role.
 *
 * Route: `/dashboard`.
 */
const meta = {
	title: 'Pages/Dashboards/List',
	tags: ['role-gated', 'play'],
	component: DashboardsListPage,
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<DashboardsListArgs>;

export default meta;

type Story = StoryObj<DashboardsListArgs>;

/**
 * All dashboards: the views rail on the left, the query box and the Created-by
 * and Updated dropdowns above the rows, pinned dashboards first, and a pager
 * because the org has more than one page of them.
 */
export const Default: Story = {};

/**
 * An org-shared saved view applied on load, so the rail entry is selected and
 * its query is in the box.
 */
export const SavedView: Story = {
	args: { view: 'saved' },
};

/** What a new workspace shows: the create-your-first-dashboard call to action. */
export const EmptyWorkspace: Story = {
	args: { dashboards: 0, savedViews: 0 },
};

/**
 * A viewer: the rows and the rail are still browsable, but everything that
 * writes (New dashboard, saving a view, the row's edit actions) is gone.
 */
export const Viewer: Story = {
	args: { access: 'viewer' },
};

/** The rows the user pinned, which the page filters out of the fetched page. */
export const Pinned: Story = {
	args: { view: 'pinned' },
};

/** A query long enough to wrap onto a second line in the query box. */
export const LongQuery: Story = {
	parameters: { signoz: { route: longQueryRoute } },
};

/** The Created-by dropdown, open with one creator picked. */
export const CreatedByFilterOpen: Story = {
	play: openCreatedByFilter,
};

/** The template tab of the New dashboard dialog. */
export const NewDashboardTemplateTab: Story = {
	play: openTemplateTab,
};

/**
 * Invalid JSON keeps the import dialog open behind the error the app raises for
 * it: the parse failure is handed to the API error modal, so it reads
 * `UPSTREAM_UNAVAILABLE` over the panel's own inline feedback. See BUGS.md 53.
 */
export const NewDashboardImportJsonInvalid: Story = {
	play: importInvalidJson,
};

/**
 * Every tooltip a row carries, held open at once: the full name a truncated
 * title falls back to, the padlock, the pin, the legacy row's refusal to be
 * pinned, and the overflow chip listing the tags that did not fit.
 */
export const Tooltips: Story = {
	args: { tooltipsOpen: true },
	parameters: { msw: { handlers: [overflowingRows] } },
};

/** The first row's actions menu, open over the list. */
export const RowActionsMenu: Story = {
	play: openFirstRowActions,
};

/** The rename dialog, opened from the menu of the second row (the first is locked). */
export const RenameDashboardDialog: Story = {
	play: openRenameDialog,
};

/** The tags dialog, opened from the menu of the second row (the first is locked). */
export const EditTagsDialog: Story = {
	play: openEditTagsDialog,
};

/** The popover that names the current filters as a new saved view. */
export const SaveViewPopover: Story = {
	play: openSaveViewPopover,
};

/** The renamed toast, raised once the PATCH answers. */
export const DashboardRenamedToast: Story = {
	play: renameDashboard,
};

/** The tags toast, raised once the PATCH answers. */
export const TagsUpdatedToast: Story = {
	play: updateTags,
};

/** Duplicate from the row menu: the toast names the source dashboard. */
export const DashboardDuplicatedToast: Story = {
	play: duplicateDashboard,
};

/** Lock from the row menu of an unlocked dashboard. */
export const DashboardLockedToast: Story = {
	play: lockDashboard,
};

/** Unlock from the row menu of the first row, which is locked. */
export const DashboardUnlockedToast: Story = {
	play: unlockDashboard,
};

/** Delete confirmed in the dialog the row menu opens. */
export const DashboardDeletedToast: Story = {
	play: deleteDashboard,
};

/** Pinning past the limit: the backend refuses with a 409. */
export const PinLimitToast: Story = {
	args: { pinWrite: 'limit' },
	play: pinPastLimit,
	parameters: { allowConsoleErrors: true },
};

/** A pin the backend failed to write. */
export const PinFailedToast: Story = {
	args: { pinWrite: 'error' },
	play: pinFails,
	parameters: { allowConsoleErrors: true },
};

/** An unpin the backend failed to write, from the first (pinned) row. */
export const UnpinFailedToast: Story = {
	args: { pinWrite: 'error' },
	play: unpinFails,
	parameters: { allowConsoleErrors: true },
};

/** The id copied from the legacy dashboard dialog. */
export const LegacyDashboardIdCopiedToast: Story = {
	play: copyLegacyDashboardId,
};

/** Retry migration of the legacy dashboard succeeding. */
export const DashboardMigratedToast: Story = {
	play: migrateDashboard,
};

/** Retry migration of the legacy dashboard refused by the backend. */
export const DashboardMigrationFailedToast: Story = {
	args: { migrationWrite: 'error' },
	play: migrationFails,
	parameters: { allowConsoleErrors: true },
};

/** The Blank tab's create failing: the toast raised beside the error modal. */
export const CreateDashboardFailedToast: Story = {
	args: { createWrite: 'error' },
	play: createDashboardFails,
	parameters: { allowConsoleErrors: true },
};

/** A dashboard file whose `image` is neither an asset path nor base64. */
export const ImportJsonInvalidImageToast: Story = {
	play: importInvalidImage,
};

/** A valid dashboard file the create endpoint refuses. */
export const ImportJsonCreateFailedToast: Story = {
	args: { createWrite: 'error' },
	play: importCreateFails,
	parameters: { allowConsoleErrors: true },
};

/** A template request the analytics endpoint accepted. */
export const TemplateRequestSubmittedToast: Story = {
	play: submitTemplateRequest,
};

/** A template request the analytics endpoint answered with a failure. */
export const TemplateRequestFailedToast: Story = {
	args: { templateRequest: 'error' },
	play: templateRequestFails,
};

/** A template request that threw before an answer came back. */
export const TemplateRequestRejectedToast: Story = {
	args: { templateRequest: 'rejected' },
	play: templateRequestRejected,
};

/** Saving the current filters as a view, refused by the backend. */
export const SaveViewFailedToast: Story = {
	args: { viewWrite: 'error' },
	play: saveViewFails,
	parameters: { allowConsoleErrors: true },
};

/** Renaming a saved view, refused by the backend. */
export const RenameViewFailedToast: Story = {
	args: { viewWrite: 'error' },
	play: renameViewFails,
	parameters: { allowConsoleErrors: true },
};

/** Deleting a saved view, refused by the backend. */
export const DeleteViewFailedToast: Story = {
	args: { viewWrite: 'error' },
	play: deleteViewFails,
	parameters: { allowConsoleErrors: true },
};

/**
 * The query the backend refused: the parse error it returned replaces the
 * generic failure copy, and there is nothing to retry.
 *
 * Kept last: test-runner shares one page across a file's stories, and the 400
 * this story is about can settle after the next story has already started,
 * which fails that one instead.
 */
export const InvalidQuery: Story = {
	args: { invalidQuery: true },
	// The deliberate 400 is the state under test.
	parameters: { allowConsoleErrors: true },
};
