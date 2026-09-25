import type { Meta, StoryObj } from '@storybook/react-vite';
import {
	blurFilter,
	openKeySuggestions,
	showFilterErrors,
	typeFilter,
	typeFilterWithCaretBack,
	findSuggestion,
} from 'components/QueryBuilderV2/QueryV2/QuerySearch/stories/querySearch.play';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

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
	// The settings control renders disabled while its permission check is in
	// flight and is swapped for the enabled one once the check answers, so it is
	// looked up again on every attempt; a click on the disabled one is dropped in
	// silence.
	const control = await waitFor(() => {
		const settings = screen.getByTestId('settings-icon-container');

		expect(settings).toBeEnabled();

		return settings;
	}, untilLoaded);

	await userEvent.click(control);
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
	// The mocked queries deliberately fail; the resulting console errors are the state under test.
	parameters: { allowConsoleErrors: true },
};

/** The editable quick-filter settings panel. */
export const QuickFiltersSettings: Story = {
	play: openQuickFiltersSettings,
};

const dirtyQuickFiltersSettings = async (): Promise<void> => {
	await openQuickFiltersSettings();
	// One Remove per added filter; the first row's is the one clicked.
	const [removeFilter] = await screen.findAllByRole('button', {
		name: 'Remove',
	});

	await userEvent.click(removeFilter);
	await screen.findByRole('button', { name: 'Save changes' });
};

/** Settings with an unsaved filter removal and the fixed action footer. */
export const QuickFiltersSettingsDirty: Story = {
	play: dirtyQuickFiltersSettings,
};

/**
 * The same panel with a banner above the shell. The banner takes 48px off the
 * layout, so this is the case where the footer used to be pushed off screen:
 * the panel is sized from the filters pane rather than the viewport, which
 * keeps Save changes reachable.
 */
export const QuickFiltersSettingsWithBanner: Story = {
	args: { banner: 'trial-expiry' },
	play: dirtyQuickFiltersSettings,
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

/** The filter focused before anything is typed: every key the logs carry. */
export const FilterKeySuggestions: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await openKeySuggestions(canvasElement, 'severity_text');
	},
};

/** A partial key, with the keys that still match and the typed part marked. */
export const FilterPartialKey: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await typeFilter(canvasElement, 'serv');
		await findSuggestion(canvasElement, 'service.name');
	},
};

/** A string key followed by a space: the operators a string compares with. */
export const FilterOperatorSuggestions: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await typeFilter(canvasElement, 'service.name ');
		await findSuggestion(canvasElement, 'CONTAINS');
	},
};

/** A number key puts the range comparisons first. */
export const FilterNumberOperatorSuggestions: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await typeFilter(canvasElement, 'http.status_code ');
		await findSuggestion(canvasElement, 'BETWEEN');
	},
};

/** `NOT` after a key narrows the list to the operators it can negate. */
export const FilterNegatedOperatorSuggestions: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await typeFilter(canvasElement, 'service.name NOT ');
		await findSuggestion(canvasElement, 'IN');
	},
};

/** A key and an operator: the values the key holds, fetched for it. */
export const FilterValueSuggestions: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await typeFilter(canvasElement, 'service.name = ');
		await findSuggestion(canvasElement, 'checkout');
	},
};

/** Values still being fetched for the key. */
export const FilterValuesLoading: Story = {
	args: { filterValues: 'loading' },
	play: async ({ canvasElement }): Promise<void> => {
		await typeFilter(canvasElement, 'service.name = ');
		await findSuggestion(canvasElement, 'Loading suggestions');
	},
};

/** A key the backend holds no values for, such as the free-text body. */
export const FilterNoValueSuggestions: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await typeFilter(canvasElement, 'body = ');
		await findSuggestion(canvasElement, 'No suggestions available');
	},
};

/** The values request failed. */
export const FilterValuesError: Story = {
	args: { filterValues: 'error' },
	// The values request deliberately fails.
	parameters: { allowConsoleErrors: true },
	play: async ({ canvasElement }): Promise<void> => {
		await typeFilter(canvasElement, 'service.name = ');
		await findSuggestion(canvasElement, 'Error loading suggestions');
	},
};

/** Inside an `IN` list, after the first value: the rest of the values. */
export const FilterInList: Story = {
	// The editor logs a TypeError while the list is open, which it survives.
	parameters: { allowConsoleErrors: true },
	play: async ({ canvasElement }): Promise<void> => {
		await typeFilterWithCaretBack(
			canvasElement,
			"service.name IN ['auth', ]",
			1,
			'checkout',
		);
	},
};

/** A complete condition: the conjunctions that start the next one. */
export const FilterConjunctionSuggestions: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await typeFilter(canvasElement, "service.name = 'checkout' ");
		await findSuggestion(canvasElement, 'OR');
	},
};

/** Inside an opened group: keys, another group and `NOT`. */
export const FilterNestedGroup: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await typeFilterWithCaretBack(canvasElement, '()', 1, 'NOT');
	},
};

/** A long valid expression mixing operators, left for the next run. */
export const FilterComplete: Story = {
	// The editor logs a TypeError while the `IN` list is typed, which it survives.
	parameters: { allowConsoleErrors: true },
	play: async ({ canvasElement }): Promise<void> => {
		await typeFilter(
			canvasElement,
			"service.name IN ['checkout', 'payments'] AND severity_text = 'ERROR' AND http.status_code >= 500 AND body CONTAINS 'timeout'",
		);
		await blurFilter(canvasElement);
	},
};

/** An incomplete expression after focus left: the marker and its errors. */
export const FilterSyntaxError: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await showFilterErrors(canvasElement, 'service.name = ');
	},
};

/** Filters run before, offered above the key suggestions. */
export const FilterRecentSearches: Story = {
	args: { recentFilters: 3 },
	play: async ({ canvasElement }): Promise<void> => {
		await openKeySuggestions(
			canvasElement,
			"k8s.namespace.name = 'observability'",
		);
	},
};
