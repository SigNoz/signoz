import type { Meta, StoryObj } from '@storybook/react-vite';
import {
	findSuggestion,
	openKeySuggestions,
	showFilterErrors,
	typeFilter,
} from 'components/QueryBuilderV2/QueryV2/QuerySearch/stories/__story_mockdata__/querySearch.play';
import { ExplorerViews } from 'pages/LogsExplorer/utils';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { tracesMocks } from './TracesModulePage.stories.mocks';
import TracesModulePage from '../TracesModulePage';

type TracesArgs = PageStoryArgs<typeof tracesMocks>;

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

/** The page fetches before it renders its filters, which outlasts the 1s default. */
const untilLoaded = { timeout: 15_000 };

type Story = StoryObj<TracesArgs>;

const openQuickFiltersSettings = async (): Promise<void> => {
	// The settings control renders disabled while its permission check is in
	// flight and is swapped for the enabled one once the check answers, so it is
	// looked up again on every attempt; a click on the disabled one is dropped in
	// silence.
	const control = await waitFor(() => {
		const settings = screen.getByTestId('settings-icon-container');

		expect(settings).not.toHaveAttribute('aria-disabled', 'true');

		return settings;
	}, untilLoaded);

	await userEvent.click(control);
	await screen.findByText('Edit quick filters');
};

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
	play: async (): Promise<void> => {
		await userEvent.click(
			await screen.findByRole('button', { name: 'Go to next page' }, untilLoaded),
		);
		const pager = screen.getByLabelText('pagination');

		await expect(
			await within(pager).findByText('3', undefined, untilLoaded),
		).toBeVisible();
	},
};

/** The span list scrolled to its end, with the next 100 spans loaded under the first. */
export const ListNextPage: Story = {
	args: { spans: 150 },
	play: async ({ canvasElement }): Promise<void> => {
		// Scrolls again on every attempt, since each loaded page moves the end.
		await waitFor(async (): Promise<void> => {
			const scroller = canvasElement.querySelector<HTMLElement>(
				'[data-virtuoso-scroller]',
			);

			await expect(scroller).not.toBeNull();
			(scroller as HTMLElement).scrollTop = (scroller as HTMLElement).scrollHeight;
			await expect(
				canvasElement.querySelector('tr[data-index="120"]'),
			).not.toBeNull();
		}, untilLoaded);
	},
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

/** The filter focused before anything is typed: span and resource keys together. */
export const FilterKeySuggestions: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await openKeySuggestions(canvasElement, 'status_code_string');
	},
};

/** A context prefix: only the keys that live on the resource. */
export const FilterResourceKeys: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await typeFilter(canvasElement, 'resource.');
		await findSuggestion(canvasElement, 'resource.service.name');
	},
};

/** A key and an operator: the services the spans came from. */
export const FilterValueSuggestions: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await typeFilter(canvasElement, 'service.name = ');
		await findSuggestion(canvasElement, 'checkout');
	},
};

/** A boolean key offers its two values. */
export const FilterBooleanValues: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await typeFilter(canvasElement, 'has_error = ');
		await findSuggestion(canvasElement, 'false');
	},
};

/** A dangling conjunction after focus left: the marker and its errors. */
export const FilterSyntaxError: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await showFilterErrors(canvasElement, 'has_error = true AND');
	},
};
