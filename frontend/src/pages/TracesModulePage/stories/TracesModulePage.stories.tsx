import type { Meta, StoryObj } from '@storybook/react-vite';
import { ExplorerViews } from 'pages/LogsExplorer/utils';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';

import { type TracesArgs, tracesMocks } from './TracesModulePage.stories.mocks';
import {
	dirtyQuickFiltersSettings,
	loadNextListPage,
	openQuickFiltersSettings,
	showRootSpansNextPage,
	suggestBooleanValues,
	suggestFilterKeys,
	suggestFilterValues,
	suggestResourceKeys,
	showFilterSyntaxError,
} from './__story_mockdata__/traces.play';
import TracesModulePage from '../TracesModulePage';

const pageStory = storyMocks(tracesMocks, { layout: 'app' });

/**
 * The traces explorer: the query builder, the span list and its detail drawer,
 * with saved views beside it and funnels as a tab.
 *
 * Route: `/traces-explorer`.
 */
const meta = {
	title: 'Pages/Traces/Explorer/Overview',
	tags: ['play'],
	component: TracesModulePage,
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<TracesArgs>;

export default meta;

type Story = StoryObj<TracesArgs>;

/**
 * The Explorer tab on a full window of spans: the org's quick filters down the
 * left, the query builder and the view switcher above, and the span list with
 * the failing ones answering 503.
 */
export const Default: Story = {};

/**
 * The Trace view, which shows one row per trace: its root span, the root
 * duration and how many spans the trace has, twenty traces to a page.
 */
export const RootSpans: Story = {
	args: { view: ExplorerViews.TRACE },
};

/**
 * The Trace view on its second page. The API sends no total, so the pager
 * offers one more page after each full one.
 */
export const RootSpansNextPage: Story = {
	args: { view: ExplorerViews.TRACE, spans: 50 },
	play: showRootSpansNextPage,
};

/** The span list scrolled to its end, with the next 100 spans loaded under the first. */
export const ListNextPage: Story = {
	args: { spans: 150 },
	play: loadNextListPage,
};

/** The charted view of the same trace query. */
export const Timeseries: Story = {
	args: { view: ExplorerViews.TIMESERIES },
};

/** The aggregation-table view of the same trace query. */
export const AggregationTable: Story = {
	args: { view: ExplorerViews.TABLE },
};

/** The Funnels tab, listing the funnels the workspace has saved. */
export const Funnels: Story = {
	args: { tab: 'funnels' },
};

/** The name field for a funnel that does not exist yet. */
export const CreateFunnel: Story = {
	args: { tab: 'funnels' },
	play: async ({ canvasElement }): Promise<void> => {
		await userEvent.click(
			await within(canvasElement).findByRole(
				'button',
				{ name: /new funnel/i },
				untilLoaded,
			),
		);
		await screen.findByRole('dialog', { name: /create new funnel/i });
	},
};

/** The rename field for a funnel already on the list. */
export const RenameFunnel: Story = {
	args: { tab: 'funnels' },
	play: async ({ canvasElement }): Promise<void> => {
		const action = await waitFor(() => {
			const found = canvasElement.querySelector<HTMLElement>(
				'.funnel-item__action-icon',
			);

			if (!found) {
				throw new Error('Funnel row actions are not rendered');
			}

			return found;
		}, untilLoaded);

		await userEvent.click(action);
		await userEvent.click(await screen.findByRole('button', { name: 'Rename' }));
		await screen.findByRole('dialog', { name: /rename funnel/i });
	},
};

/**
 * A fresh workspace: nothing ingested in the window and no quick filters
 * configured yet, so the table and the filter panel both show their empty
 * states.
 */
export const NoTraces: Story = {
	args: { spans: 0, quickFilters: 0, savedViews: 0, funnels: 0 },
};

/** The list mid-query, with the cancel action the toolbar offers while it runs. */
export const Loading: Story = {
	args: { dataState: 'loading' },
};

/** A query response carrying the backend's warning details. */
export const QueryWarning: Story = {
	args: { warning: true },
};

/** A failed explorer request. */
export const Failed: Story = {
	args: { dataState: 'error' },
	// The mocked request deliberately fails; the resulting console errors are the state under test.
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
 * The same panel with a banner above the shell. The banner takes 48px off the
 * layout, so this is the case where the footer used to be pushed off screen:
 * the panel is sized from the filters pane rather than the viewport, which
 * keeps Save changes reachable.
 */
export const QuickFiltersSettingsWithBanner: Story = {
	args: { banner: 'trial-expiry' },
	play: dirtyQuickFiltersSettings,
};

/** The filter focused before anything is typed: span and resource keys together. */
export const FilterKeySuggestions: Story = {
	play: suggestFilterKeys,
};

/** A context prefix: only the keys that live on the resource. */
export const FilterResourceKeys: Story = {
	play: suggestResourceKeys,
};

/** A key and an operator: the services the spans came from. */
export const FilterValueSuggestions: Story = {
	play: suggestFilterValues,
};

/** A boolean key offers its two values. */
export const FilterBooleanValues: Story = {
	play: suggestBooleanValues,
};

/** A dangling conjunction after focus left: the marker and its errors. */
export const FilterSyntaxError: Story = {
	play: showFilterSyntaxError,
};
