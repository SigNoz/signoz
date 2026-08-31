import type { Meta, StoryObj } from '@storybook/react-vite';
import { Route } from 'react-router-dom';
import ROUTES from 'constants/routes';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import { withAppLayout } from '@/storybook/decorators/withAppLayout';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import TracesFunnelDetails from './index';
import { tracesFunnelDetailsMocks } from './TracesFunnelDetails.stories.mocks';

type TracesFunnelDetailsArgs = PageStoryArgs<typeof tracesFunnelDetailsMocks>;

const pageStory = storyMocks(tracesFunnelDetailsMocks);

/**
 * One trace funnel: conversion and drop off per step, with the slow and erroring
 * traces behind each.
 *
 * Route: `/traces/funnels/:funnelId`.
 */
const meta = {
	title: 'Pages/Traces/Funnel Details',
	component: TracesFunnelDetails,
	decorators: [withAppLayout],
	// The funnel id is in the pathname, so the page renders under its own route
	// rather than being mounted on its own.
	render: (): JSX.Element => (
		<Route path={ROUTES.TRACES_FUNNELS_DETAIL} component={TracesFunnelDetails} />
	),
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<TracesFunnelDetailsArgs>;

export default meta;

type Story = StoryObj<TracesFunnelDetailsArgs>;

/**
 * A four-step checkout funnel: the steps on the left, and the conversion,
 * timing and the traces behind each transition on the right.
 */
export const Default: Story = {};

/** Most of the traffic lost at the first hop, which is what the funnel is for. */
export const SevereDropOff: Story = {
	args: { dropOff: 'severe' },
};

/** A funnel someone has started but only defined the entry step of. */
export const SingleStep: Story = {
	args: { steps: 1 },
};
