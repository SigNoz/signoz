import type { Meta, StoryObj } from '@storybook/react-vite';
import { screen, userEvent, within } from 'storybook/test';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { logsMocks } from './LogsModulePage.stories.mocks';

import LogsModulePage from '../LogsModulePage';

type LogsArgs = PageStoryArgs<typeof logsMocks>;

const pageStory = storyMocks(logsMocks, { layout: 'app' });

/**
 * The logs explorer: the query builder, the list, the frequency chart and the log
 * detail drawer, with quick filters and saved views beside them.
 *
 * Route: `/logs/logs-explorer`.
 */
const meta = {
	title: 'Pages/Logs/Explorer',
	tags: ['play'],
	component: LogsModulePage,
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<LogsArgs>;

export default meta;

type Story = StoryObj<LogsArgs>;

/** The page fetches before it renders a row, which outlasts the 1s default. */
const untilLoaded = { timeout: 15_000 };

const openQuickFiltersSettings = async (): Promise<void> => {
	await userEvent.click(
		await screen.findByTestId('settings-icon', undefined, untilLoaded),
	);
	await screen.findByText('Edit quick filters');
};

/** Opening a log is what the drawer is for, and the first row will do. */
const openFirstLog = async (canvasElement: HTMLElement): Promise<void> => {
	const [row] = await within(canvasElement).findAllByTestId(
		/^logs-table-row-/,
		undefined,
		untilLoaded,
	);

	// The list hangs its click handler off the cells rather than the row, so a
	// click on the row itself opens nothing.
	const [, timestamp] = within(row).getAllByRole('cell');

	await userEvent.click(timestamp);
	await screen.findByTestId('log-detail-drawer', undefined, untilLoaded);
};

/**
 * The explorer on its list view: quick filters down the left, the frequency
 * chart over a page of log lines across every severity, and the org's saved
 * views in the view picker.
 */
export const Default: Story = {};

/** A workspace with logs ingesting but nothing matching the query. */
export const NoLogs: Story = {
	args: { logs: 0 },
};

/** One aggregated line over the selected range instead of the log lines. */
export const TimeseriesView: Story = {
	args: { view: 'timeseries' },
};

/** Aggregated log values rendered in the table explorer view. */
export const TableView: Story = {
	args: { view: 'table' },
};

/** Log lines rendered one per entry. */
export const ListFormat: Story = {
	args: { format: 'list' },
};

/** The raw log-body format with its line clipping. */
export const RawFormat: Story = {
	args: { format: 'raw' },
};

/** An explorer with no configured quick filters. */
export const NoQuickFilters: Story = {
	args: { quickFilters: 0 },
};

/** The query area with the quick-filter panel hidden. */
export const FiltersHidden: Story = {
	args: { filtersPanel: false },
};

/**
 * A service that logs JSON, with `use_json_body` on: the body is an object the
 * backend already parsed, and its keys can be filtered on as `body.x`.
 */
export const JsonBody: Story = {
	args: { jsonBody: true },
};

/** One log opened up: its own fields, then the resource that sent it. */
export const LogDetails: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await openFirstLog(canvasElement);
	},
};

/** The logs either side of the one that was opened, on the same filters. */
export const LogDetailsContext: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await openFirstLog(canvasElement);
		await userEvent.click(
			await screen.findByText('Context', undefined, untilLoaded),
		);
		// The tab queries the logs either side before it can render them.
		await screen.findAllByText(/cache lookup for cart/, undefined, untilLoaded);
	},
};

/** The log detail drawer with its header actions menu open. */
export const LogDetailsMenuOpen: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await openFirstLog(canvasElement);
		await userEvent.click(await screen.findByTestId('log-details-header-menu'));
		await screen.findByText('Copy link to log');
	},
};

/** A response warning shown beside the query actions. */
export const QueryWarning: Story = {
	args: { warning: true },
};

/** The table waiting on its query. */
export const Loading: Story = {
	args: { dataState: 'loading' },
};

/** A failed logs query. */
export const Failed: Story = {
	args: { dataState: 'error' },
};

/** The editable quick-filter settings panel. */
export const QuickFiltersSettings: Story = {
	play: openQuickFiltersSettings,
};

/** Settings with an unsaved filter removal and the fixed action footer. */
export const QuickFiltersSettingsDirty: Story = {
	play: async (): Promise<void> => {
		await openQuickFiltersSettings();
		// One Remove per added filter; the first row's is the one clicked.
		const [removeFilter] = await screen.findAllByRole('button', {
			name: 'Remove',
		});

		await userEvent.click(removeFilter);
		await screen.findByRole('button', { name: 'Save changes' });
	},
};

/**
 * Every tooltip the explorer renders, held open at once: the quick filters'
 * severity, host and service values on the left, and the drawer's move to
 * previous and next log. The drawer steps forward one log first, because the
 * first log has nothing before it and the arrow keeps its tooltip shut while
 * disabled.
 */
export const Tooltips: Story = {
	args: { tooltipsOpen: true },
	play: async ({ canvasElement }): Promise<void> => {
		await openFirstLog(canvasElement);
		await userEvent.click(
			await screen.findByTestId('log-details-header-next', undefined, untilLoaded),
		);
	},
};
