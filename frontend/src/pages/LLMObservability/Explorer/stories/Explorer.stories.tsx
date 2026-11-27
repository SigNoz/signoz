import type { Meta, StoryObj } from '@storybook/react-vite';
import { ExplorerViews } from 'pages/LogsExplorer/utils';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';

import LLMObservabilityPage from '../../index';
import {
	dirtyQuickFiltersSettings,
	openAddToDashboard,
	openQuickFiltersSettings,
	selectFirstQuickFilterValue,
} from './__story_mockdata__/explorer.play';
import {
	type LLMExplorerArgs,
	llmExplorerMocks,
} from './Explorer.stories.mocks';

const pageStory = storyMocks(llmExplorerMocks, { layout: 'app' });

/**
 * The AI observability explorer: the traces explorer scoped to LLM spans, with
 * the query builder, the view switcher and the quick filters beside it. The
 * view is driven by the URL, so the control below is what switches it.
 *
 * Route: `/ai-observability/explorer`.
 */
const meta = {
	title: 'Pages/AI Observability/Explorer',
	tags: ['play'],
	component: LLMObservabilityPage,
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<LLMExplorerArgs>;

export default meta;

type Story = StoryObj<LLMExplorerArgs>;

/**
 * A full window of LLM spans: the org's quick filters down the left, the query
 * builder and the view switcher above, and the list paging ten spans at a time
 * with the failing ones answering 503.
 */
export const Default: Story = {};

/**
 * The Trace view, which shows one row per trace: its root span, the root
 * duration and how many spans the trace has.
 */
export const RootSpans: Story = {
	args: { view: ExplorerViews.TRACE },
};

/**
 * The time series view, which charts the spans the query matches instead of
 * listing them.
 */
export const TimeSeries: Story = {
	args: { view: ExplorerViews.TIMESERIES },
};

/**
 * A workspace with the SDK wired up but no LLM spans in the window, and no
 * quick filters configured yet, so the list and the filter panel both show
 * their empty states.
 */
export const NoSpans: Story = {
	args: { spans: 0, quickFilters: 0 },
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
	// The failure is the state under test, so its console errors are expected.
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

/** A quick-filter value selected against the LLM span query. */
export const QuickFilterSelected: Story = {
	play: selectFirstQuickFilterValue,
};

/** The dashboard picker Add to dashboard opens to export the AI query as a panel. */
export const AddToDashboardDialog: Story = {
	play: openAddToDashboard,
};
