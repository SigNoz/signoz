import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, screen, within } from 'storybook/test';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import {
	dashboardsListMocks,
	overflowingRows,
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

/**
 * The query the backend refused: the parse error it returned replaces the
 * generic failure copy, and there is nothing to retry.
 */
export const InvalidQuery: Story = {
	args: { invalidQuery: true },
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
