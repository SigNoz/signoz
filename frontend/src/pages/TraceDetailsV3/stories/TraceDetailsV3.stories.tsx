import type { Meta, StoryObj } from '@storybook/react-vite';
import { Route } from 'react-router-dom';
import ROUTES from 'constants/routes';
import { fireEvent, userEvent, waitFor, within } from 'storybook/test';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { traceDetailsMocks } from './TraceDetailsV3.stories.mocks';
import TraceDetailsV3 from '../index';

type TraceDetailsArgs = PageStoryArgs<typeof traceDetailsMocks>;

const pageStory = storyMocks(traceDetailsMocks, { layout: 'app' });

/**
 * One trace: the waterfall, the flamegraph, and the span panel with its
 * attributes, events and logs. A trace with spans the backend never received shows
 * them as gaps.
 *
 * Route: `/trace/:id`.
 */
const meta = {
	title: 'Pages/Traces/Trace Details',
	tags: ['play'],
	component: TraceDetailsV3,
	// The page reads the trace id out of the pathname, so it renders under its
	// own route rather than being mounted on its own.
	render: (): JSX.Element => (
		<Route path={ROUTES.TRACE_DETAIL} component={TraceDetailsV3} />
	),
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

/** The waterfall renders once the trace resolves, which outlasts the 1s default. */
const untilLoaded = { timeout: 15_000 };

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

/**
 * Every tooltip the trace carries, held open at once: the panel's dock modes and
 * its span metadata, the trace metadata over the header, Analytics, the search
 * pill's own popover over the filter the Highlight errors switch wrote, the copy
 * and funnel actions on every span row, the card a hovered row raises, and the
 * details behind a hovered event dot.
 */
export const Tooltips: Story = {
	args: { tooltipsOpen: true },
	play: async ({ canvasElement }): Promise<void> => {
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

		await waitFor(async () => {
			const dot = canvasElement.querySelector('[class*="eventDot"]');

			if (!dot) {
				throw new Error('no event dot rendered');
			}

			await fireEvent.mouseOver(dot);
		}, untilLoaded);

		// The dot opens its card on a 200ms timer rather than on the event itself.
		await waitFor(() => {
			if (!document.querySelector('[class*="popover"]')) {
				throw new Error('event popover did not open');
			}
		}, untilLoaded);
	},
};

/**
 * The filter bar expanded, where the query editor stands in for the pill and the
 * header's own actions: the clear and collapse buttons beside it, clear being
 * there because Highlight errors has written a filter to clear.
 */
export const TooltipsInFilterBar: Story = {
	args: { tooltipsOpen: true },
	play: async ({ canvasElement }): Promise<void> => {
		await highlightErrors(canvasElement);
	},
};
