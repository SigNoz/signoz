import type { Meta, StoryObj } from '@storybook/react-vite';
import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { tracesMocks } from '../TracesModulePage.stories.mocks';
import {
	hoverOrdersRow,
	openSpanDetails,
	showsLogsError,
	showsNoLogs,
	showsSpanLogs,
	showsTraceOnlyLogs,
	showsTraceSummaryLoading,
	showsWithoutTraceSummary,
} from '../__story_mockdata__/spanDrawer.play';

import TracesModulePage from '../../TracesModulePage';

type TracesArgs = PageStoryArgs<typeof tracesMocks>;

const pageStory = storyMocks(tracesMocks, { layout: 'app' });

/**
 * The span details drawer the explorer list opens on a row, one story per state
 * of its trace summary and its Logs tab. Every story opens the same failing
 * span; the Trace summary and Span logs controls pick what the drawer gets.
 *
 * Route: `/traces-explorer`.
 */
const meta = {
	title: 'Pages/Traces/Explorer/Span Drawer',
	tags: ['play'],
	component: TracesModulePage,
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<TracesArgs>;

export default meta;

type Story = StoryObj<TracesArgs>;

/**
 * The drawer on a failing span: its summary with % exec time, attributes, the
 * exception event and a linked span, with up and down stepping through the page.
 */
export const Default: Story = {
	play: openSpanDetails,
};

/**
 * A hovered row with the icon at its start that opens the trace page in a new
 * tab, without opening the drawer.
 */
export const OpenTraceIcon: Story = {
	play: hoverOrdersRow,
};

/** The Logs tab with the span's logs, between the logs just before and after them. */
export const Logs: Story = {
	args: { spanLogs: 'span' },
	play: showsSpanLogs,
};

/** The span has no logs of its own but its trace does, so the tab points to the trace's. */
export const TraceOnlyLogs: Story = {
	args: { spanLogs: 'trace only' },
	play: showsTraceOnlyLogs,
};

/** Neither the span nor its trace has logs. */
export const NoLogs: Story = {
	args: { spanLogs: 'none' },
	play: showsNoLogs,
};

/**
 * The trace summary 404s, so the drawer speaks only for the span: no % exec
 * time, logs over the span's own window and no trace-wide logs check.
 */
export const WithoutTraceSummary: Story = {
	args: { traceSummary: 'not found', spanLogs: 'none' },
	// The deliberate 404 is the state under test.
	parameters: { allowConsoleErrors: true },
	play: showsWithoutTraceSummary,
};

/** The trace summary never answers: the Logs tab waits and its explorer link is off. */
export const TraceSummaryLoading: Story = {
	args: { traceSummary: 'loading' },
	play: showsTraceSummaryLoading,
};

/** The log queries fail while the rest of the drawer renders. */
export const LogsError: Story = {
	args: { spanLogs: 'error' },
	// The deliberate 500 is the state under test.
	parameters: { allowConsoleErrors: true },
	play: showsLogsError,
};
