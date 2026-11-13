import type { Meta, StoryObj } from '@storybook/react-vite';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';

import { type LogsArgs, logsMocks } from './LogsModulePage.stories.mocks';
import {
	completeFilter,
	copyLog,
	copyLogDetailsLink,
	copyLogLinkFromRow,
	dirtyQuickFiltersSettings,
	openFormatMenu,
	openLogContext,
	openLogDetails,
	openLogDetailsMenu,
	openQuickFiltersSettings,
	showFilterSyntaxError,
	stepToNextLog,
	suggestConjunctions,
	suggestFilterKeys,
	suggestFilterValues,
	suggestInListValues,
	suggestInNestedGroup,
	suggestNegatedOperators,
	suggestNoValues,
	suggestNumberOperators,
	suggestOperators,
	suggestPartialKey,
	suggestRecentSearches,
} from './__story_mockdata__/logs.play';

import LogsModulePage from '../LogsModulePage';

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

/**
 * The explorer on its list view: quick filters down the left, the frequency
 * chart over a page of log lines across every severity, and the saved views
 * header above the filters.
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

/** The format popover: the format list, the max-lines stepper, and the font-size control. */
export const FormatMenuOpen: Story = {
	args: { format: 'raw' },
	play: openFormatMenu,
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

/**
 * Keys of the JSON body as columns in the Column format: the nested `order`
 * object and the `order.coupons` array render as JSON, `http.status_code` as
 * its number.
 */
export const JsonBodyFieldsColumn: Story = {
	args: { jsonBody: true, bodyColumns: true },
};

/**
 * The same body keys in the Default format: each selected field under the
 * body line, object and array values as JSON with no add-to-query on them.
 */
export const JsonBodyFieldsDefault: Story = {
	args: { jsonBody: true, bodyColumns: true, format: 'list' },
};

/** The same body keys joined into the raw line ahead of the body. */
export const JsonBodyFieldsRaw: Story = {
	args: { jsonBody: true, bodyColumns: true, format: 'raw' },
};

/** One log opened up: its own fields, then the resource that sent it. */
export const LogDetails: Story = {
	play: openLogDetails,
};

/** The logs either side of the one that was opened, on the same filters. */
export const LogDetailsContext: Story = {
	play: openLogContext,
};

/** The log detail drawer with its header actions menu open. */
export const LogDetailsMenuOpen: Story = {
	play: openLogDetailsMenu,
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

/** Settings with an unsaved filter removal and the fixed action footer. */
export const QuickFiltersSettingsDirty: Story = {
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
	play: stepToNextLog,
};

/** The filter focused before anything is typed: every key the logs carry. */
export const FilterKeySuggestions: Story = {
	play: suggestFilterKeys,
};

/** A partial key, with the keys that still match and the typed part marked. */
export const FilterPartialKey: Story = {
	play: suggestPartialKey,
};

/** A string key followed by a space: the operators a string compares with. */
export const FilterOperatorSuggestions: Story = {
	play: suggestOperators,
};

/** A number key puts the range comparisons first. */
export const FilterNumberOperatorSuggestions: Story = {
	play: suggestNumberOperators,
};

/** `NOT` after a key narrows the list to the operators it can negate. */
export const FilterNegatedOperatorSuggestions: Story = {
	play: suggestNegatedOperators,
};

/** A key and an operator: the values the key holds, fetched for it. */
export const FilterValueSuggestions: Story = {
	play: suggestFilterValues,
};

/** Values still being fetched for the key. */
export const FilterValuesLoading: Story = {
	args: { filterValues: 'loading' },
	play: suggestFilterValues,
};

/** A key the backend holds no values for, such as the free-text body. */
export const FilterNoValueSuggestions: Story = {
	play: suggestNoValues,
};

/** The values request failed. */
export const FilterValuesError: Story = {
	args: { filterValues: 'error' },
	// The values request deliberately fails.
	parameters: { allowConsoleErrors: true },
	play: suggestFilterValues,
};

/** Inside an `IN` list, after the first value: the rest of the values. */
export const FilterInList: Story = {
	// The editor logs a TypeError while the list is open, which it survives.
	parameters: { allowConsoleErrors: true },
	play: suggestInListValues,
};

/** A complete condition: the conjunctions that start the next one. */
export const FilterConjunctionSuggestions: Story = {
	play: suggestConjunctions,
};

/** Inside an opened group: keys, another group and `NOT`. */
export const FilterNestedGroup: Story = {
	play: suggestInNestedGroup,
};

/** A long valid expression mixing operators, left for the next run. */
export const FilterComplete: Story = {
	// The editor logs a TypeError while the `IN` list is typed, which it survives.
	parameters: { allowConsoleErrors: true },
	play: completeFilter,
};

/** An incomplete expression after focus left: the marker and its errors. */
export const FilterSyntaxError: Story = {
	play: showFilterSyntaxError,
};

/** Filters run before, offered above the key suggestions. */
export const FilterRecentSearches: Story = {
	args: { recentFilters: 3 },
	play: suggestRecentSearches,
};

/** Row actions render on hover, so the first row is hovered before the copy link is pressed. */
export const LogLinkCopiedToast: Story = {
	play: copyLogLinkFromRow,
};

/** "Copy log" in the log detail drawer's actions menu. */
export const LogCopiedToast: Story = {
	play: copyLog,
};

/** "Copy link to log" in the log detail drawer's actions menu. */
export const LogDetailsLinkCopiedToast: Story = {
	play: copyLogDetailsLink,
};
