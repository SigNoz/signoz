import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, screen, waitFor, within } from 'storybook/test';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import {
	clickRowAction,
	dashboardsListMocks,
	openRowActions,
	overflowingRows,
	pickRowAction,
} from './DashboardsListPage.stories.mocks';
import { BuiltinViewId } from '../types';

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
	args: { view: BuiltinViewId.Pinned },
};

/** The template tab of the New dashboard dialog. */
export const NewDashboardTemplateTab: Story = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await userEvent.click(
			await canvas.findByTestId('new-dashboard-cta', {}, { timeout: 10000 }),
		);

		await expect(
			await screen.findByRole('dialog', {}, { timeout: 10000 }),
		).toHaveTextContent('New dashboard');
		await userEvent.click(await screen.findByText('From a template'));
		await screen.findByText('Dashboard templates');
	},
};

/**
 * Invalid JSON keeps the import dialog open behind the error the app raises for
 * it: the parse failure is handed to the API error modal, so it reads
 * `UPSTREAM_UNAVAILABLE` over the panel's own inline feedback. See BUGS.md 53.
 */
export const NewDashboardImportJsonInvalid: Story = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await userEvent.click(
			await canvas.findByTestId('new-dashboard-cta', {}, { timeout: 10000 }),
		);
		await userEvent.click(await screen.findByText('Import JSON'));
		await userEvent.click(await screen.findByTestId('import-json-submit'));
		await screen.findByText(/error loading json/i);
		// The error modal and the toast under it carry the same message.
		await screen.findAllByText('Unexpected end of JSON input');
	},
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
	play: async ({ canvasElement }) => {
		await openRowActions(canvasElement, 0);
	},
};

/** The rename dialog, opened from the menu of the second row (the first is locked). */
export const RenameDashboardDialog: Story = {
	play: async ({ canvasElement }) => {
		await openRowActions(canvasElement, 1);
		await pickRowAction('Rename');
		await screen.findByRole('dialog', { name: 'Rename dashboard' });
	},
};

/** The tags dialog, opened from the menu of the second row (the first is locked). */
export const EditTagsDialog: Story = {
	play: async ({ canvasElement }) => {
		await openRowActions(canvasElement, 1);
		await pickRowAction(/^(Edit|Add) Tags$/);
		await screen.findByRole('dialog', { name: /^(Edit|Add) tags$/ });
	},
};

/** The popover that names the current filters as a new saved view. */
export const SaveViewPopover: Story = {
	play: async ({ canvasElement }) => {
		await userEvent.click(
			await within(canvasElement).findByRole(
				'button',
				{ name: 'Save current filters as a view' },
				{ timeout: 10000 },
			),
		);
		await screen.findByText('Save as view');
	},
};

const TOAST_TIMEOUT = 10000;

/** The renamed toast, raised once the PATCH answers. */
export const DashboardRenamedToast: Story = {
	play: async ({ canvasElement, args }) => {
		await openRowActions(canvasElement, 1);
		await pickRowAction('Rename');
		const input = await screen.findByTestId('rename-dashboard-input');

		await userEvent.clear(input);
		await userEvent.type(input, 'API latency overview');
		await userEvent.click(await screen.findByTestId('rename-dashboard-submit'));
		if (args.rowWrite === 'success') {
			await screen.findByText('Dashboard renamed', {}, { timeout: TOAST_TIMEOUT });
		}
	},
};

/** The tags toast, raised once the PATCH answers. */
export const TagsUpdatedToast: Story = {
	play: async ({ canvasElement, args }) => {
		await openRowActions(canvasElement, 1);
		await pickRowAction(/^(Edit|Add) Tags$/);
		const input = await screen.findByPlaceholderText('key:value (press Enter)');

		await userEvent.type(input, 'owner:sre{Enter}');
		await userEvent.click(await screen.findByTestId('edit-tags-submit'));
		if (args.rowWrite === 'success') {
			await screen.findByText('Tags updated', {}, { timeout: TOAST_TIMEOUT });
		}
	},
};

/** Duplicate from the row menu: the toast names the source dashboard. */
export const DashboardDuplicatedToast: Story = {
	play: async ({ canvasElement, args }) => {
		await openRowActions(canvasElement, 1);
		await clickRowAction('dashboard-action-duplicate');
		if (args.rowWrite === 'success') {
			await screen.findByText(
				'Duplicated "API latency and errors"',
				{},
				{ timeout: TOAST_TIMEOUT },
			);
		}
	},
};

/** Lock from the row menu of an unlocked dashboard. */
export const DashboardLockedToast: Story = {
	play: async ({ canvasElement, args }) => {
		await openRowActions(canvasElement, 1);
		await clickRowAction('dashboard-action-lock');
		if (args.rowWrite === 'success') {
			await screen.findByText('Dashboard locked', {}, { timeout: TOAST_TIMEOUT });
		}
	},
};

/** Unlock from the row menu of the first row, which is locked. */
export const DashboardUnlockedToast: Story = {
	play: async ({ canvasElement, args }) => {
		await openRowActions(canvasElement, 0);
		await clickRowAction('dashboard-action-lock');
		if (args.rowWrite === 'success') {
			await screen.findByText(
				'Dashboard unlocked',
				{},
				{ timeout: TOAST_TIMEOUT },
			);
		}
	},
};

/** Delete confirmed in the dialog the row menu opens. */
export const DashboardDeletedToast: Story = {
	play: async ({ canvasElement, args }) => {
		await openRowActions(canvasElement, 1);
		await clickRowAction('dashboard-action-delete');
		const dialog = await screen.findByRole('dialog');

		await userEvent.click(
			await within(dialog).findByRole('button', { name: 'Delete' }),
		);
		if (args.rowWrite === 'success') {
			await screen.findByText(
				'Dashboard deleted successfully',
				{},
				{ timeout: TOAST_TIMEOUT },
			);
		}
	},
};

/** Pinning past the limit: the backend refuses with a 409. */
export const PinLimitToast: Story = {
	args: { pinWrite: 'limit' },
	play: async ({ canvasElement }) => {
		await userEvent.click(
			await within(canvasElement).findByTestId(
				'dashboard-pin-3',
				{},
				{ timeout: TOAST_TIMEOUT },
			),
		);
		await screen.findByText(
			/You can pin up to 10 dashboards/,
			{},
			{ timeout: TOAST_TIMEOUT },
		);
	},
	parameters: { allowConsoleErrors: true },
};

/** A pin the backend failed to write. */
export const PinFailedToast: Story = {
	args: { pinWrite: 'error' },
	play: async ({ canvasElement }) => {
		await userEvent.click(
			await within(canvasElement).findByTestId(
				'dashboard-pin-3',
				{},
				{ timeout: TOAST_TIMEOUT },
			),
		);
		await screen.findByText(
			'Failed to pin dashboard.',
			{},
			{ timeout: TOAST_TIMEOUT },
		);
	},
	parameters: { allowConsoleErrors: true },
};

/** An unpin the backend failed to write, from the first (pinned) row. */
export const UnpinFailedToast: Story = {
	args: { pinWrite: 'error' },
	play: async ({ canvasElement }) => {
		await userEvent.click(
			await within(canvasElement).findByTestId(
				'dashboard-pin-0',
				{},
				{ timeout: TOAST_TIMEOUT },
			),
		);
		await screen.findByText(
			'Failed to unpin dashboard.',
			{},
			{ timeout: TOAST_TIMEOUT },
		);
	},
	parameters: { allowConsoleErrors: true },
};

const openLegacyDialog = async (canvasElement: HTMLElement): Promise<void> => {
	await userEvent.click(
		await within(canvasElement).findByTestId(
			'dashboard-title-4',
			{},
			{ timeout: TOAST_TIMEOUT },
		),
	);
	await screen.findByTestId('legacy-dashboard-id');
};

/** The id copied from the legacy dashboard dialog. */
export const LegacyDashboardIdCopiedToast: Story = {
	play: async ({ canvasElement }) => {
		await openLegacyDialog(canvasElement);
		await userEvent.click(await screen.findByTestId('legacy-dashboard-copy-id'));
		await screen.findByText(
			'Dashboard ID copied',
			{},
			{ timeout: TOAST_TIMEOUT },
		);
	},
};

const retryMigration = async (canvasElement: HTMLElement): Promise<void> => {
	await openLegacyDialog(canvasElement);
	const retry = await screen.findByTestId('legacy-dashboard-retry-migration');

	await waitFor(() => expect(retry).toBeEnabled(), { timeout: TOAST_TIMEOUT });
	await userEvent.click(retry);
};

/** Retry migration of the legacy dashboard succeeding. */
export const DashboardMigratedToast: Story = {
	play: async ({ canvasElement, args }) => {
		await retryMigration(canvasElement);
		if (args.migrationWrite === 'success') {
			await screen.findByText(
				'Dashboard migrated to the new experience',
				{},
				{ timeout: TOAST_TIMEOUT },
			);
		}
	},
};

/** Retry migration of the legacy dashboard refused by the backend. */
export const DashboardMigrationFailedToast: Story = {
	args: { migrationWrite: 'error' },
	play: async ({ canvasElement }) => {
		await retryMigration(canvasElement);
		await screen.findByText(
			'Something went wrong',
			{},
			{ timeout: TOAST_TIMEOUT },
		);
	},
	parameters: { allowConsoleErrors: true },
};

/** The Blank tab's create failing: the toast raised beside the error modal. */
export const CreateDashboardFailedToast: Story = {
	args: { createWrite: 'error' },
	play: async ({ canvasElement }) => {
		await userEvent.click(
			await within(canvasElement).findByTestId(
				'new-dashboard-cta',
				{},
				{ timeout: TOAST_TIMEOUT },
			),
		);
		await userEvent.click(await screen.findByTestId('create-dashboard-submit'));
		await screen.findAllByText(
			/Something went wrong/,
			{},
			{ timeout: TOAST_TIMEOUT },
		);
	},
	parameters: { allowConsoleErrors: true },
};

const uploadDashboardJson = async (json: object): Promise<void> => {
	await userEvent.click(await screen.findByText('Import JSON'));
	const dialog = await screen.findByRole('dialog');
	const input = dialog.querySelector<HTMLInputElement>('input[type="file"]');

	if (!input) {
		throw new Error('The import dialog has no file input');
	}
	await userEvent.upload(
		input,
		new File([JSON.stringify(json)], 'dashboard.json', {
			type: 'application/json',
		}),
	);
	await userEvent.click(await screen.findByTestId('import-json-submit'));
};

const IMPORTED_SPEC = { layouts: [], panels: {}, variables: [] };

/** A dashboard file whose `image` is neither an asset path nor base64. */
export const ImportJsonInvalidImageToast: Story = {
	play: async ({ canvasElement }) => {
		await userEvent.click(
			await within(canvasElement).findByTestId(
				'new-dashboard-cta',
				{},
				{ timeout: TOAST_TIMEOUT },
			),
		);
		await uploadDashboardJson({
			schemaVersion: 'v6',
			image: 'https://example.com/logo.png',
			spec: { display: { name: 'Imported' }, ...IMPORTED_SPEC },
		});
		await screen.findByText(
			/Dashboard "image" must be/,
			{},
			{ timeout: TOAST_TIMEOUT },
		);
	},
};

/** A valid dashboard file the create endpoint refuses. */
export const ImportJsonCreateFailedToast: Story = {
	args: { createWrite: 'error' },
	play: async ({ canvasElement }) => {
		await userEvent.click(
			await within(canvasElement).findByTestId(
				'new-dashboard-cta',
				{},
				{ timeout: TOAST_TIMEOUT },
			),
		);
		await uploadDashboardJson({
			schemaVersion: 'v6',
			spec: { display: { name: 'Imported' }, ...IMPORTED_SPEC },
		});
		await screen.findAllByText(
			/Something went wrong/,
			{},
			{ timeout: TOAST_TIMEOUT },
		);
	},
	parameters: { allowConsoleErrors: true },
};

const requestTemplate = async (canvasElement: HTMLElement): Promise<void> => {
	await userEvent.click(
		await within(canvasElement).findByTestId(
			'new-dashboard-cta',
			{},
			{ timeout: TOAST_TIMEOUT },
		),
	);
	await userEvent.click(await screen.findByText('From a template'));
	await userEvent.type(
		await screen.findByTestId('request-dashboard-name'),
		'Redis overview',
	);
	await userEvent.click(await screen.findByTestId('request-dashboard-submit'));
};

/** A template request the analytics endpoint accepted. */
export const TemplateRequestSubmittedToast: Story = {
	play: async ({ canvasElement }) => {
		await requestTemplate(canvasElement);
		await screen.findByText(
			'Dashboard request submitted',
			{},
			{ timeout: TOAST_TIMEOUT },
		);
	},
};

/** A template request the analytics endpoint answered with a failure. */
export const TemplateRequestFailedToast: Story = {
	args: { templateRequest: 'error' },
	play: async ({ canvasElement }) => {
		await requestTemplate(canvasElement);
		await screen.findByText('Event rejected', {}, { timeout: TOAST_TIMEOUT });
	},
};

/** A template request that threw before an answer came back. */
export const TemplateRequestRejectedToast: Story = {
	args: { templateRequest: 'rejected' },
	play: async ({ canvasElement }) => {
		await requestTemplate(canvasElement);
		await screen.findByText(
			'Something went wrong',
			{},
			{ timeout: TOAST_TIMEOUT },
		);
	},
};

/** Saving the current filters as a view, refused by the backend. */
export const SaveViewFailedToast: Story = {
	args: { viewWrite: 'error' },
	play: async ({ canvasElement }) => {
		await userEvent.click(
			await within(canvasElement).findByRole(
				'button',
				{ name: 'Save current filters as a view' },
				{ timeout: TOAST_TIMEOUT },
			),
		);
		await userEvent.type(await screen.findByTestId('save-view-name'), 'On-call');
		await userEvent.click(await screen.findByTestId('save-view-confirm'));
		await screen.findByText(
			'Failed to save view.',
			{},
			{ timeout: TOAST_TIMEOUT },
		);
	},
	parameters: { allowConsoleErrors: true },
};

/** Renaming a saved view, refused by the backend. */
export const RenameViewFailedToast: Story = {
	args: { viewWrite: 'error' },
	play: async ({ canvasElement }) => {
		const [rename] = await within(canvasElement).findAllByRole(
			'button',
			{ name: 'Rename view' },
			{ timeout: TOAST_TIMEOUT },
		);

		// The actions only take pointer events while the row is hovered by CSS.
		await userEvent.click(rename, { pointerEventsCheck: 0 });
		const input = await screen.findByTestId('rename-view-name');

		await userEvent.clear(input);
		await userEvent.type(input, 'Renamed view');
		await userEvent.click(await screen.findByTestId('rename-view-confirm'));
		await screen.findByText(
			'Failed to update view.',
			{},
			{ timeout: TOAST_TIMEOUT },
		);
	},
	parameters: { allowConsoleErrors: true },
};

/** Deleting a saved view, refused by the backend. */
export const DeleteViewFailedToast: Story = {
	args: { viewWrite: 'error' },
	play: async ({ canvasElement }) => {
		const [remove] = await within(canvasElement).findAllByRole(
			'button',
			{ name: 'Delete view' },
			{ timeout: TOAST_TIMEOUT },
		);

		await userEvent.click(remove, { pointerEventsCheck: 0 });
		const dialog = await screen.findByRole('dialog');

		await userEvent.click(
			await within(dialog).findByRole('button', { name: 'Delete' }),
		);
		await screen.findByText(
			'Failed to delete view.',
			{},
			{ timeout: TOAST_TIMEOUT },
		);
	},
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
