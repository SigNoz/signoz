import type { Meta, StoryObj } from '@storybook/react-vite';
import { Route } from 'react-router-dom';
import ROUTES from 'constants/routes';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import { withAppLayout } from '@/storybook/decorators/withAppLayout';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { traceDetailsMocks } from './TraceDetailsV3.stories.mocks';
import TraceDetailsV3 from './index';

type TraceDetailsArgs = PageStoryArgs<typeof traceDetailsMocks>;

const pageStory = storyMocks(traceDetailsMocks);

/**
 * One trace: the waterfall, the flamegraph, and the span panel with its
 * attributes, events and logs. A trace with spans the backend never received shows
 * them as gaps.
 *
 * Route: `/trace/:id`.
 */
const meta = {
	title: 'Pages/Traces/Trace Details',
	component: TraceDetailsV3,
	decorators: [withAppLayout],
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
