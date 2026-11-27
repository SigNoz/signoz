import type { Meta, StoryObj } from '@storybook/react-vite';
import ROUTES from 'constants/routes';
import { renderAtRoute } from '@/storybook/renderAtRoute';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';

import { scenarioSpanCount } from './__story_mockdata__/traceDetails';
import {
	cancelDownload,
	copyPrettyViewValue,
	copySpanLink,
	copyTraceId,
	downloadTrace,
	expandFilterBar,
	hoverAiSpan,
	hoverEventStacktrace,
	hoverLongEventAttributes,
	openAddSpanToFunnel,
	openAnalytics,
	openCreateFunnelStep,
	openPercentile,
	openPercentileResourceSelector,
	openSpanEvents,
	openTraceOptions,
	showsAnalyticsState,
	showsHighlightedErrors,
	showsTraceOnlyLogs,
	showTooltips,
	switchDockMode,
} from './__story_mockdata__/traceDetails.play';
import {
	type TraceDetailsArgs,
	traceDetailsMocks,
} from './TraceDetailsV3.stories.mocks';
import TraceDetailsV3 from '../index';

const pageStory = storyMocks(traceDetailsMocks, { layout: 'app' });

/**
 * One trace: the waterfall, the flamegraph, and the span panel with its
 * attributes, events and logs. A trace with spans the backend never received shows
 * them as gaps.
 *
 * Route: `/trace/:id`.
 */
const meta = {
	title: 'Pages/Traces/Trace Details/Overview',
	tags: ['play'],
	component: TraceDetailsV3,
	// The page reads the trace id out of the pathname, so it renders under its
	// own route rather than being mounted on its own.
	render: renderAtRoute(ROUTES.TRACE_DETAIL, TraceDetailsV3),
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<TraceDetailsArgs>;

export default meta;

type Story = StoryObj<TraceDetailsArgs>;

/**
 * A checkout trace whose payment call failed: the flamegraph and the waterfall
 * over its spans, and the span details panel open on the span that errored,
 * with its percentile, attributes, events and logs.
 */
export const Default: Story = {};

/**
 * A deep trace: sixty spans over six levels, which is where the waterfall
 * scrolls and the flamegraph starts packing rows.
 */
export const LargeTrace: Story = {
	args: { spans: 60 },
};

/**
 * A trace the backend has nothing for, which is what a link to a trace past its
 * retention window opens.
 */
export const NoTrace: Story = {
	args: { spans: 0 },
};

/** The waterfall and the flamegraph mid-fetch, shell included. */
export const Loading: Story = {
	args: { dataState: 'loading' },
};

/** The strip over a trace with no failing span: the error icon stays neutral. */
export const BottomStripNoErrors: Story = {
	args: { errors: false },
};

/**
 * One span per HTTP status badge the waterfall draws: informational, success,
 * redirect, client and server errors, and a span with no status code and so no
 * badge.
 */
export const StatusCodes: Story = {
	args: {
		scenario: 'status-codes',
		spans: scenarioSpanCount('status-codes'),
		spanPanel: false,
	},
};

const AI_SPANS = scenarioSpanCount('ai');

/**
 * An agent run: LLM, tool and agent badges with sparkle icons in the waterfall,
 * token and cost totals in the header, the span panel on an LLM call with its
 * tokens and cost, and that span's hover card open on its usage breakdown.
 */
export const AiTrace: Story = {
	args: { scenario: 'ai', spans: AI_SPANS },
	play: hoverAiSpan,
};

/**
 * The agent run with every tooltip held open: the header's and the span panel's
 * token usage breakdowns, and the cost labels beside them.
 */
export const AiTraceTooltips: Story = {
	args: { scenario: 'ai', spans: AI_SPANS, tooltipsOpen: true },
};

/**
 * Every tooltip the trace carries, held open at once: the panel's dock modes and
 * its span metadata, the trace metadata over the header, Analytics, the search
 * pill's own popover over the filter the Highlight errors switch wrote, the copy
 * and funnel actions on every span row, the card a hovered row raises, and the
 * details behind a hovered event dot.
 */
export const Tooltips: Story = {
	args: { tooltipsOpen: true },
	play: showTooltips,
};

/**
 * The filter bar expanded, where the query editor stands in for the pill and the
 * header's own actions: the clear and collapse buttons beside it, clear being
 * there because Highlight errors has written a filter to clear.
 */
export const TooltipsInFilterBar: Story = {
	args: { tooltipsOpen: true },
	play: expandFilterBar,
};

/** Highlight errors on a trace with no failing span: the filter finds no results. */
export const HighlightErrorsNoMatches: Story = {
	args: { errors: false },
	play: showsHighlightedErrors,
};

/**
 * The trace options menu, open off the header: the trace details toggle, preview
 * fields, and the Colour by submenu over the fields the spans can be coloured
 * on.
 */
export const TraceOptionsMenu: Story = {
	play: openTraceOptions,
};

/** The Analytics panel over a trace with no group to chart. */
export const AnalyticsNoData: Story = {
	args: { analytics: 'empty' },
	play: showsAnalyticsState,
};

/** The Analytics panel when the aggregations request fails. */
export const AnalyticsError: Story = {
	args: { analytics: 'error' },
	// The deliberate 500 is the state under test.
	parameters: { allowConsoleErrors: true },
	play: showsAnalyticsState,
};

/** The span panel moved from the right edge to the bottom through its dock toggle. */
export const DockModeSwitched: Story = {
	play: switchDockMode,
};

/** The span's percentile badge expanded into the distribution it was ranked in. */
export const SpanPercentileOpen: Story = {
	play: openPercentile,
};

/** The percentile's resource attribute picker, which narrows the spans it ranks against. */
export const SpanPercentileResourceSelector: Story = {
	play: openPercentileResourceSelector,
};

/** The span panel's Events tab on the failing span: its exception event and attributes. */
export const SpanPanelEvents: Story = {
	play: openSpanEvents,
};

/** The Events tab on a span with no events. */
export const SpanPanelNoEvents: Story = {
	args: { errors: false },
	play: openSpanEvents,
};

/** The exception's stacktrace hovered: the preview popover with its Expand action. */
export const SpanPanelEventAttributePopover: Story = {
	play: hoverEventStacktrace,
};

/** The Events tab hovered: a key that fits has no tooltip, attributes cut short show in full once. */
export const SpanPanelEventLongAttributes: Story = {
	play: hoverLongEventAttributes,
};

/** The analytics panel the header toggle opens. */
export const AnalyticsOpen: Story = {
	play: openAnalytics,
};

/** The download progress panel, held open by an export that never answers. */
export const TraceDownload: Story = {
	args: { exportState: 'loading' },
	play: downloadTrace,
};

/** The funnel picker a span row's add-to-funnel action opens. */
export const AddSpanToFunnel: Story = {
	play: openAddSpanToFunnel,
};

/** The name field behind "Create new funnel" in that picker. */
export const AddSpanToFunnelCreateStep: Story = {
	play: openCreateFunnelStep,
};

/** The span has no logs of its own but its trace does, so the Logs tab points to the trace's. */
export const SpanPanelTraceOnlyLogs: Story = {
	args: { traceOnlyLogs: true },
	play: showsTraceOnlyLogs,
};

/** The span panel's trace id copied with its copy button, which turns into a check. */
export const TraceIdCopied: Story = {
	play: copyTraceId,
};

/** "Copy Value" picked from a row of the span panel's pretty view. */
export const PrettyViewValueCopiedToast: Story = {
	play: copyPrettyViewValue,
};

/** The copy-link button on a waterfall row, which copies the span's URL. */
export const SpanLinkCopiedToast: Story = {
	play: copySpanLink,
};

/** "Download trace" as CSV, finished. */
export const TraceExportedToast: Story = {
	play: downloadTrace,
};

/** "Download trace" whose export request fails. */
export const TraceExportErrorToast: Story = {
	args: { exportState: 'error' },
	// The deliberate 500 is the state under test.
	parameters: { allowConsoleErrors: true },
	play: downloadTrace,
};

/** "Download trace" cancelled from the download panel while the export runs. */
export const TraceExportCancelledToast: Story = {
	args: { exportState: 'loading' },
	play: cancelDownload,
};
