/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import {
	expect,
	fireEvent,
	screen,
	userEvent,
	waitFor,
	within,
} from 'storybook/test';

import { getToastText } from '@/storybook/play/toastText';
import { hoverTruncatableText } from '@/storybook/play/truncatedText';

import { SpanDetailVariant } from '../../SpanDetailsPanel/constants';
import {
	openRowMenu,
	showsSpanPanel,
	showsTrace,
	startDownload,
	type TraceDetailsArgs,
	untilLoaded,
} from '../TraceDetailsV3.stories.mocks';
import {
	focusSpanAttributes,
	focusSpanEventCount,
	focusSpanIndex,
	LONG_EVENT_ATTRIBUTES,
	spanIdAt,
	spanMatchRows,
	traceHasEvents,
} from './traceDetails';

interface PageContext {
	canvasElement: HTMLElement;
	args: TraceDetailsArgs;
}

const traceOf = ({
	scenario,
	spans,
	errors,
}: TraceDetailsArgs): Parameters<typeof traceHasEvents>[0] => ({
	scenario,
	spans,
	errors,
	traceStart: 0,
});

/**
 * Turns on Highlight errors, which writes `has_error = true` into the filter and
 * expands the bar to show it.
 */
const highlightErrors = async (canvasElement: HTMLElement): Promise<void> => {
	const toggle = await within(canvasElement).findByTestId(
		'highlight-errors-toggle',
		undefined,
		untilLoaded,
	);

	await userEvent.click(within(toggle).getByRole('switch'));
};

const openPanelTab = async (
	canvasElement: HTMLElement,
	name: RegExp,
): Promise<void> => {
	await userEvent.click(
		await within(canvasElement).findByRole('tab', { name }, untilLoaded),
	);
};

const openSpanPercentile = async (
	canvasElement: HTMLElement,
): Promise<void> => {
	await userEvent.click(
		await within(canvasElement).findByRole(
			'button',
			{ name: /^p\d+/ },
			untilLoaded,
		),
	);
	await screen.findByText(/This span duration is/);
};

export const showsMissingSpansBanner = async ({
	canvasElement,
	args,
}: PageContext): Promise<void> => {
	if (!args.missingSpans || !showsTrace(args)) {
		return;
	}

	await within(canvasElement).findByTestId(
		'missing-spans-banner',
		undefined,
		untilLoaded,
	);
};

/** Only the LLM span the panel opens on carries usage for the card to break down. */
export const hoverAiSpan = async ({
	canvasElement,
	args,
}: PageContext): Promise<void> => {
	const focus = focusSpanIndex(args.scenario, args.spans);

	if (
		!showsTrace(args) ||
		!(
			'gen_ai.usage.input_tokens' in focusSpanAttributes(args.scenario, args.spans)
		)
	) {
		return;
	}

	const row = await within(canvasElement).findByTestId(
		`cell-0-${spanIdAt(focus)}`,
		undefined,
		untilLoaded,
	);

	await fireEvent.mouseOver(row);
	// The header's token tooltip carries the same title when tooltips are held open.
	await screen.findAllByText('Usage Breakdown', undefined, untilLoaded);
};

export const showTooltips = async ({
	canvasElement,
	args,
}: PageContext): Promise<void> => {
	if (!showsTrace(args)) {
		return;
	}

	await highlightErrors(canvasElement);

	// Collapsing puts the filter back behind the pill, which is where it carries
	// its popover. Neither expanded action carries a label of its own, so the
	// row is located by its container and the collapse is its last button.
	const actions = await waitFor(() => {
		const found = canvasElement.querySelector<HTMLElement>(
			'[class*="expandedActions"]',
		);

		if (!found) {
			throw new Error('Filter row is not expanded');
		}

		return found;
	}, untilLoaded);
	const expandedActions = within(actions).getAllByRole('button');

	await userEvent.click(expandedActions[expandedActions.length - 1]);

	// `userEvent.hover` tracks the pointer, so hovering the dot would fire the
	// row's mouseleave and drop the hover card. `mouseOver` is what React reads
	// to synthesise mouseenter, and it leaves the previous target alone, so both
	// stay open. The dot has no test id.
	const [row] = await within(canvasElement).findAllByTestId(
		/^cell-0-/,
		undefined,
		untilLoaded,
	);

	await fireEvent.mouseOver(row);

	if (!traceHasEvents(traceOf(args))) {
		return;
	}

	await waitFor(async () => {
		const dot = canvasElement.querySelector('[class*="eventDot"]');

		if (!dot) {
			throw new Error('no event dot rendered');
		}

		await fireEvent.mouseOver(dot);
	}, untilLoaded);

	// The dot opens its card on a 200ms timer rather than on the event itself.
	await screen.findByRole('tooltip', { name: /event details/i }, untilLoaded);
};

export const expandFilterBar = async ({
	canvasElement,
	args,
}: PageContext): Promise<void> => {
	if (!showsTrace(args)) {
		return;
	}

	await highlightErrors(canvasElement);
};

/** The filter counts the failing spans, or says it found none. */
export const showsHighlightedErrors = async ({
	canvasElement,
	args,
}: PageContext): Promise<void> => {
	if (!showsTrace(args)) {
		return;
	}

	await highlightErrors(canvasElement);

	const failing = spanMatchRows(traceOf(args), 'has_error = true').length;

	await within(canvasElement).findByTestId(
		failing > 0 ? 'waterfall-filter-count' : 'waterfall-filter-no-results',
		undefined,
		untilLoaded,
	);
};

export const openTraceOptions = async ({
	canvasElement,
	args,
}: PageContext): Promise<void> => {
	if (!showsTrace(args)) {
		return;
	}

	await userEvent.click(
		await within(canvasElement).findByRole(
			'button',
			{ name: 'Trace options' },
			untilLoaded,
		),
	);
	await screen.findByText('Preview fields');
};

export const switchDockMode = async ({
	canvasElement,
	args,
}: PageContext): Promise<void> => {
	if (!showsSpanPanel(args) || args.panelPosition === SpanDetailVariant.DOCKED) {
		return;
	}

	// The dock options are icon-only and carry no accessible name. The floating
	// panel renders outside the canvas.
	const option = await screen.findByTestId(
		'dock-mode-docked',
		undefined,
		untilLoaded,
	);

	await userEvent.click(option.querySelector('button') ?? option);
	await waitFor(async () => {
		const bottomDock = canvasElement.querySelector<HTMLElement>(
			'[class*="dockedSpanDetails"]',
		);

		await expect(bottomDock).toBeVisible();
		await expect(
			within(bottomDock as HTMLElement).getByTestId('dock-mode-docked'),
		).toHaveAttribute('aria-pressed', 'true');
	}, untilLoaded);
};

export const openPercentile = async ({
	canvasElement,
	args,
}: PageContext): Promise<void> => {
	if (!showsSpanPanel(args)) {
		return;
	}

	await openSpanPercentile(canvasElement);
};

export const openPercentileResourceSelector = async ({
	canvasElement,
	args,
}: PageContext): Promise<void> => {
	if (!showsSpanPanel(args)) {
		return;
	}

	await openSpanPercentile(canvasElement);
	await userEvent.click(
		screen.getByRole('button', { name: 'Toggle resource attributes' }),
	);
	await screen.findByPlaceholderText('Search resource attributes');
};

export const showsTraceOnlyLogs = async ({
	canvasElement,
	args,
}: PageContext): Promise<void> => {
	if (!showsSpanPanel(args)) {
		return;
	}

	await openPanelTab(canvasElement, /Logs/);

	if (args.traceOnlyLogs && args.spanLogs > 0) {
		await expect(
			await within(canvasElement).findByText(
				'No logs found for selected span. View logs for the current trace.',
				undefined,
				untilLoaded,
			),
		).toBeVisible();
	}
};

export const openSpanEvents = async ({
	canvasElement,
	args,
}: PageContext): Promise<void> => {
	if (!showsSpanPanel(args)) {
		return;
	}

	await openPanelTab(canvasElement, /Events/);

	await within(canvasElement).findByText(
		focusSpanEventCount(traceOf(args)) > 0
			? 'exception.type'
			: 'No events found for selected span',
		undefined,
		untilLoaded,
	);
};

/** `exception.stacktrace` is an expandable key, so its value sits behind a popover with Expand. */
export const hoverEventStacktrace = async (
	context: PageContext,
): Promise<void> => {
	const { canvasElement, args } = context;

	if (!showsSpanPanel(args) || focusSpanEventCount(traceOf(args)) === 0) {
		return;
	}

	await openSpanEvents(context);

	const key = await within(canvasElement).findByText('exception.stacktrace');
	const value = key
		.closest('[class*="attributeContainer"]')
		?.querySelector<HTMLElement>('[class*="wrapper"] > *');

	await expect(value).toBeTruthy();
	await userEvent.hover(value as HTMLElement);
	await waitFor(
		() => expect(screen.getByRole('button', { name: 'Expand' })).toBeVisible(),
		untilLoaded,
	);
};

export const hoverLongEventAttributes = async (
	context: PageContext,
): Promise<void> => {
	const { canvasElement, args } = context;

	// The dialog panel renders outside the canvas, where the Events tab lookup misses it.
	if (
		!showsSpanPanel(args) ||
		args.panelPosition === SpanDetailVariant.DIALOG ||
		focusSpanEventCount(traceOf(args)) === 0
	) {
		return;
	}

	await openSpanEvents(context);

	// The long texts are sized to be cut in the right-docked panel; other docks measure.
	const longCut =
		args.panelPosition === SpanDetailVariant.DOCKED_RIGHT || undefined;
	const texts: [string, boolean | undefined][] = [
		['exception.type', false],
		[LONG_EVENT_ATTRIBUTES.endpointKey, longCut],
		[LONG_EVENT_ATTRIBUTES.endpoint, longCut],
		[LONG_EVENT_ATTRIBUTES.responseKey, longCut],
	];
	for (const [text, cut] of texts) {
		const [label] = await within(canvasElement).findAllByText(text);
		await hoverTruncatableText(label, text, { cut });
	}
};

export const copyTraceId = async ({
	canvasElement,
	args,
}: PageContext): Promise<void> => {
	if (!showsSpanPanel(args)) {
		return;
	}

	await userEvent.click(
		await within(canvasElement).findByRole(
			'button',
			{ name: 'Copy trace ID' },
			untilLoaded,
		),
	);
	await expect(
		await within(canvasElement).findByRole('button', { name: 'Copied' }),
	).toBeVisible();
};

/** The row menu is found off the focus span's `rpc.method`, which only checkout's has. */
export const copyPrettyViewValue = async ({
	canvasElement,
	args,
}: PageContext): Promise<void> => {
	if (
		!showsSpanPanel(args) ||
		!('rpc.method' in focusSpanAttributes(args.scenario, args.spans))
	) {
		return;
	}

	await openRowMenu(canvasElement, 'Copy Value');
	await expect(await screen.findByText('Copied to clipboard')).toBeVisible();
};

export const copySpanLink = async ({
	canvasElement,
	args,
}: PageContext): Promise<void> => {
	if (!showsTrace(args)) {
		return;
	}

	const [row] = await within(canvasElement).findAllByTestId(
		/^cell-0-/,
		undefined,
		untilLoaded,
	);

	await fireEvent.mouseOver(row);
	// The hover re-renders the row, so the button has to be looked up after it settles.
	await new Promise((resolve) => {
		setTimeout(resolve, 300);
	});
	const [hovered] = within(canvasElement).getAllByTestId(/^cell-0-/);
	// The row's hover actions have no accessible name; copy link comes first.
	const [link] = within(hovered).getAllByRole('button');

	await fireEvent.click(link);
	await waitFor(() =>
		expect(screen.getByText('Copied to clipboard')).toBeVisible(),
	);
};

const EXPORT_TOAST: Partial<Record<TraceDetailsArgs['exportState'], string>> = {
	success: 'Export completed successfully',
	error: 'Failed to download trace',
};

const expectExportToast = (text: string): Promise<void> =>
	waitFor(async () => expect(getToastText(text)).toBeVisible(), untilLoaded);

export const downloadTrace = async ({
	canvasElement,
	args,
}: PageContext): Promise<void> => {
	if (!showsTrace(args)) {
		return;
	}

	await startDownload(canvasElement);

	const toast = EXPORT_TOAST[args.exportState];

	if (toast) {
		await expectExportToast(toast);
	} else {
		await screen.findByTestId('trace-download-cancel', undefined, untilLoaded);
	}
};

/** Only an export that never answers leaves the download panel up to cancel. */
export const cancelDownload = async ({
	canvasElement,
	args,
}: PageContext): Promise<void> => {
	if (!showsTrace(args)) {
		return;
	}

	await startDownload(canvasElement);

	const toast = EXPORT_TOAST[args.exportState];

	if (toast) {
		await expectExportToast(toast);
		return;
	}

	await userEvent.click(await screen.findByTestId('trace-download-cancel'));
	await expectExportToast('Export cancelled');
};

export const openAnalytics = async ({
	canvasElement,
	args,
}: PageContext): Promise<void> => {
	if (!showsTrace(args)) {
		return;
	}

	await userEvent.click(
		await within(canvasElement).findByRole(
			'button',
			{ name: 'Analytics' },
			untilLoaded,
		),
	);
	await screen.findByTestId('trace-analytics-panel', undefined, untilLoaded);
};

const ANALYTICS_TEXT: Partial<Record<TraceDetailsArgs['analytics'], RegExp>> = {
	empty: /No data for/,
	error: /Couldn't load analytics/,
};

export const showsAnalyticsState = async (
	context: PageContext,
): Promise<void> => {
	await openAnalytics(context);

	const text = ANALYTICS_TEXT[context.args.analytics];

	if (showsTrace(context.args) && text) {
		await screen.findAllByText(text, undefined, untilLoaded);
	}
};

const openFunnelPicker = async (canvasElement: HTMLElement): Promise<void> => {
	const [button] = await within(canvasElement).findAllByTestId(
		'span-add-to-funnel-btn',
		undefined,
		untilLoaded,
	);

	await fireEvent.click(button);
	await screen.findByText('Add span to funnel', undefined, untilLoaded);
};

export const openAddSpanToFunnel = async ({
	canvasElement,
	args,
}: PageContext): Promise<void> => {
	if (!showsTrace(args)) {
		return;
	}

	await openFunnelPicker(canvasElement);
};

export const openCreateFunnelStep = async ({
	canvasElement,
	args,
}: PageContext): Promise<void> => {
	if (!showsTrace(args)) {
		return;
	}

	await openFunnelPicker(canvasElement);
	await userEvent.click(
		await screen.findByRole('button', { name: /create new funnel/i }),
	);
	await screen.findByTestId('create-funnel-name-input-field');
};
